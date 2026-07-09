/**
 * Tools the AI setup assistant can call to actually DO setup work on behalf of
 * the signed-in business. Every tool is strictly scoped to `ctx.userId` — there
 * is no way for the model to reach another tenant's data.
 *
 * The tools reuse the same primitives the manual integration routes use
 * (catalogue, crypto, provider helpers, sync) so behaviour stays identical
 * whether the user clicks a button or asks the assistant.
 */
import type Anthropic from "@anthropic-ai/sdk";
import { and, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { integrationTable } from "@workspace/db/schema";
import {
  PROVIDER_CATALOG,
  getCatalogEntry,
} from "../integrations/catalog";
import { isProviderImplemented } from "../integrations/registry";
import { encryptJSON, isEncryptionConfigured } from "../integrations/crypto";
import { generateWebhookSecret } from "../integrations/providers/generic-webhook";
import {
  buildGoogleAuthUrl,
  isGoogleConfigured,
} from "../integrations/providers/google-calendar";
import { signState } from "../integrations/oauth-state";
import { syncIntegrationRow } from "../integrations/sync";

export interface AssistantToolContext {
  userId: string;
  /** Protocol + host of the current request, e.g. "https://foo.replit.dev". */
  origin: string;
}

/** The tool schemas advertised to Claude. */
export const ASSISTANT_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_integration_status",
    description:
      "Hent bedriftens nåværende integrasjoner og status (tilkoblet, ikke tilkoblet, feil). Bruk dette for å gi råd som passer situasjonen deres.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "generate_webhook_credentials",
    description:
      "Opprett (eller hent) en generisk webhook for bedriften og returner webhook-URL og hemmelig nøkkel. Bruk når brukeren vil sette opp den generiske webhooken eller et system som sender utgående webhooks.",
    input_schema: {
      type: "object",
      properties: {
        regenerate: {
          type: "boolean",
          description:
            "Sett til true for å lage en NY nøkkel (ugyldiggjør den gamle). Standard false.",
        },
      },
    },
  },
  {
    name: "start_oauth_flow",
    description:
      "Start en OAuth-tilkobling og returner en innloggingslenke brukeren kan klikke. Fungerer kun for tilgjengelige OAuth-leverandører (f.eks. google_calendar).",
    input_schema: {
      type: "object",
      properties: {
        provider: {
          type: "string",
          description: "Leverandør-id, f.eks. 'google_calendar'.",
        },
      },
      required: ["provider"],
    },
  },
  {
    name: "test_integration",
    description:
      "Kjør en test-synk for en tilkoblet leverandør og rapporter resultatet (antall nye/eksisterende bookinger). Fungerer for leverandører som hentes ved polling (f.eks. google_calendar).",
    input_schema: {
      type: "object",
      properties: {
        provider: {
          type: "string",
          description: "Leverandør-id, f.eks. 'google_calendar'.",
        },
      },
      required: ["provider"],
    },
  },
];

function webhookUrl(origin: string, integrationId: string): string {
  return `${origin}/api/integrations/webhook/${integrationId}`;
}

async function getIntegrationStatus(ctx: AssistantToolContext) {
  const rows = await db
    .select()
    .from(integrationTable)
    .where(eq(integrationTable.userId, ctx.userId));
  const byProvider = new Map(rows.map((r) => [r.provider, r]));
  const items = PROVIDER_CATALOG.map((c) => {
    const row = byProvider.get(c.provider);
    return {
      provider: c.provider,
      label: c.label,
      implemented: c.implemented && isProviderImplemented(c.provider),
      status: row?.status ?? "disconnected",
      lastSyncedAt: row?.lastSyncedAt?.toISOString() ?? null,
      lastError: row?.lastError ?? null,
    };
  });
  return { items };
}

async function generateWebhookCredentials(
  ctx: AssistantToolContext,
  regenerate: boolean,
) {
  if (!isEncryptionConfigured()) {
    return {
      ok: false,
      error:
        "Kryptering er ikke konfigurert (ENCRYPTION_KEY mangler). Kontakt administrator.",
    };
  }
  const [existing] = await db
    .select()
    .from(integrationTable)
    .where(
      and(
        eq(integrationTable.userId, ctx.userId),
        eq(integrationTable.provider, "generic_webhook"),
      ),
    )
    .limit(1);

  // Reuse the existing secret unless the caller explicitly asked to rotate it.
  let secret = generateWebhookSecret();
  if (existing && existing.status === "connected" && !regenerate) {
    // Keep whatever is stored; only surface a fresh URL. We cannot show the old
    // secret here (it stays encrypted at rest and is only revealed on creation),
    // so tell the user where to find it.
    return {
      ok: true,
      webhookUrl: webhookUrl(ctx.origin, existing.id),
      secret: null,
      note: "Webhooken finnes allerede. Nøkkelen vises i «Webhook-oppsett» i dashbordet, eller be om en ny nøkkel (regenerate).",
      signatureHeader: "X-BookPling-Signature",
    };
  }

  const encrypted = encryptJSON({ secret });
  const [row] = await db
    .insert(integrationTable)
    .values({
      userId: ctx.userId,
      provider: "generic_webhook",
      status: "connected",
      credentialsEncrypted: encrypted,
      lastError: null,
    })
    .onConflictDoUpdate({
      target: [integrationTable.userId, integrationTable.provider],
      set: {
        status: "connected",
        credentialsEncrypted: encrypted,
        lastError: null,
        updatedAt: new Date(),
      },
    })
    .returning();

  return {
    ok: true,
    webhookUrl: webhookUrl(ctx.origin, row.id),
    secret,
    signatureHeader: "X-BookPling-Signature",
    note: "Kopier nøkkelen nå — den vises ikke i klartekst senere.",
  };
}

async function startOauthFlow(ctx: AssistantToolContext, provider: string) {
  const entry = getCatalogEntry(provider);
  if (!entry) return { ok: false, error: "Ukjent leverandør." };
  if (entry.authType !== "oauth" || !isProviderImplemented(provider)) {
    return {
      ok: false,
      error: "Denne koblingen er ikke tilgjengelig for OAuth ennå.",
    };
  }
  if (!isEncryptionConfigured()) {
    return {
      ok: false,
      error: "Kryptering er ikke konfigurert (ENCRYPTION_KEY mangler).",
    };
  }
  if (provider === "google_calendar") {
    if (!isGoogleConfigured()) {
      return {
        ok: false,
        error: "Google Kalender er ikke konfigurert (mangler klient-ID/secret).",
      };
    }
    const redirectUri = `${ctx.origin}/api/integrations/google_calendar/callback`;
    const state = signState({ userId: ctx.userId, provider, redirectUri });
    return {
      ok: true,
      provider,
      authUrl: buildGoogleAuthUrl({ redirectUri, state }),
    };
  }
  return { ok: false, error: "Not implemented" };
}

async function testIntegration(ctx: AssistantToolContext, provider: string) {
  if (!getCatalogEntry(provider)) {
    return { ok: false, error: "Ukjent leverandør." };
  }
  if (!isProviderImplemented(provider)) {
    return {
      ok: false,
      error: "Testsynk er ikke tilgjengelig for denne leverandøren ennå.",
    };
  }
  const [row] = await db
    .select()
    .from(integrationTable)
    .where(
      and(
        eq(integrationTable.userId, ctx.userId),
        eq(integrationTable.provider, provider as never),
      ),
    )
    .limit(1);
  if (!row || row.status === "disconnected") {
    return { ok: false, error: "Ikke tilkoblet." };
  }
  try {
    const result = await syncIntegrationRow(row);
    return { ok: true, provider, ...result };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Testsynk feilet.",
    };
  }
}

/**
 * Execute a tool by name. Returns a JSON-serialisable result that is fed back
 * to the model as a tool_result AND streamed to the client for rich rendering.
 */
export async function runAssistantTool(
  ctx: AssistantToolContext,
  name: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    case "get_integration_status":
      return getIntegrationStatus(ctx);
    case "generate_webhook_credentials":
      return generateWebhookCredentials(ctx, input.regenerate === true);
    case "start_oauth_flow":
      return startOauthFlow(ctx, String(input.provider ?? ""));
    case "test_integration":
      return testIntegration(ctx, String(input.provider ?? ""));
    default:
      return { ok: false, error: `Ukjent verktøy: ${name}` };
  }
}
