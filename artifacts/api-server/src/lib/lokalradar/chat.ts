/**
 * Context + system prompt for the LokalRadar advisor chat.
 *
 * The chat is a conversational marketing/competition advisor for a Norwegian
 * local business. Unlike the BookPling setup assistant, it uses no tools — it
 * simply answers the owner's questions grounded in the REAL data LokalRadar has
 * gathered for them: their business profile, their tracked competitors (latest
 * website + review snapshots), recent alerts, and their own review stats.
 *
 * Everything is Norwegian (bokmål) because the product and its customers are
 * Norwegian. The prompt tells the model to never invent competitor data — if a
 * fact is not in the injected context, it must say so.
 */
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  lokalAlertTable,
  lokalBusinessTable,
  lokalCompetitorTable,
  lokalReviewTable,
  lokalSnapshotTable,
} from "@workspace/db/schema";
import type { LokalReviewData, LokalWebData } from "./types";

const RULES = `
# Om deg
Du er LokalRadar-rådgiveren — en vennlig, konkret markedsførings- og
konkurranserådgiver for en liten norsk lokalbedrift. Du hjelper eieren å forstå
hva som skjer i nabolaget og hva de bør gjøre med det.

# Regler du ALLTID følger
- Svar på norsk (bokmål), med mindre brukeren tydelig skriver på et annet språk.
- Vær kort, konkret og praktisk. Gi gjerne punktlister med tiltak eier kan gjøre.
- Bygg rådene på dataene du får under «Bedriftens data». Ikke finn opp tall,
  priser, konkurrenter eller anmeldelser som ikke står der.
- Mangler du data for å svare presist, si det ærlig og foreslå hva eier kan gjøre
  (f.eks. legge til en konkurrent, kjøre en skanning, eller importere anmeldelser).
- Ingen emojis. Ikke overselg. Vær en rolig, kompetent rådgiver.
- Du er rådgiver, ikke et system — du kan ikke selv endre priser, sende varsler
  eller kjøre skanninger. Forklar heller hvor i LokalRadar eier gjør det.
`.trim();

function fmtDate(d: Date | null): string {
  if (!d) return "ukjent tid";
  return d.toLocaleDateString("nb-NO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Build the full Norwegian system prompt, grounded in this tenant's data. */
export async function buildChatSystemPrompt(userId: string): Promise<string> {
  const [business] = await db
    .select()
    .from(lokalBusinessTable)
    .where(eq(lokalBusinessTable.userId, userId))
    .limit(1);

  const competitors = await db
    .select()
    .from(lokalCompetitorTable)
    .where(eq(lokalCompetitorTable.userId, userId))
    .orderBy(desc(lokalCompetitorTable.lastChangeAt));

  const competitorIds = competitors.map((c) => c.id);

  // Latest web + review snapshot per competitor (small N, one query total).
  const latestWeb = new Map<string, LokalWebData>();
  const latestReviews = new Map<string, LokalReviewData>();
  if (competitorIds.length > 0) {
    const snaps = await db
      .select()
      .from(lokalSnapshotTable)
      .where(inArray(lokalSnapshotTable.competitorId, competitorIds))
      .orderBy(desc(lokalSnapshotTable.capturedAt));
    for (const s of snaps) {
      if (!s.competitorId) continue;
      if (s.kind === "web" && !latestWeb.has(s.competitorId)) {
        latestWeb.set(s.competitorId, s.data as LokalWebData);
      } else if (s.kind === "reviews" && !latestReviews.has(s.competitorId)) {
        latestReviews.set(s.competitorId, s.data as LokalReviewData);
      }
    }
  }

  const alerts = await db
    .select()
    .from(lokalAlertTable)
    .where(eq(lokalAlertTable.userId, userId))
    .orderBy(desc(lokalAlertTable.createdAt))
    .limit(15);

  // The owner's own imported reviews (competitorId is null).
  const ownReviews = await db
    .select()
    .from(lokalReviewTable)
    .where(
      and(eq(lokalReviewTable.userId, userId), isNull(lokalReviewTable.competitorId)),
    );

  // ---- Assemble the data block ----
  const lines: string[] = [];

  lines.push("## Bedriften");
  if (business) {
    lines.push(
      [
        business.name && `Navn: ${business.name}.`,
        business.industry && `Bransje: ${business.industry}.`,
        business.location && `Sted: ${business.location}.`,
        business.website && `Nettside: ${business.website}.`,
      ]
        .filter(Boolean)
        .join(" ") || "Bedriftsprofilen er ikke fylt ut ennå.",
    );
  } else {
    lines.push("Bedriftsprofilen er ikke opprettet ennå.");
  }

  lines.push("");
  lines.push("## Egne anmeldelser");
  if (ownReviews.length > 0) {
    const rated = ownReviews
      .map((r) => r.rating)
      .filter((r): r is number => typeof r === "number");
    const avg =
      rated.length > 0
        ? (rated.reduce((a, b) => a + b, 0) / rated.length).toFixed(1)
        : "ukjent";
    lines.push(
      `Du har ${ownReviews.length} importerte anmeldelser, snitt ${avg} av 5.`,
    );
  } else {
    lines.push(
      "Ingen egne anmeldelser er importert ennå (kan importeres under Markedsføring).",
    );
  }

  lines.push("");
  lines.push("## Konkurrenter du følger");
  if (competitors.length === 0) {
    lines.push(
      "Ingen konkurrenter er lagt til ennå. Foreslå gjerne at eier legger til noen under «Konkurrenter».",
    );
  } else {
    for (const c of competitors) {
      const web = latestWeb.get(c.id);
      const rev = latestReviews.get(c.id);
      const parts: string[] = [
        `- ${c.name}${c.location ? ` (${c.location})` : ""}:`,
      ];
      if (rev?.rating != null) {
        parts.push(
          `vurdering ${rev.rating}${rev.reviewCount != null ? ` av ${rev.reviewCount} anmeldelser` : ""}.`,
        );
      }
      const prices = (web?.prices ?? [])
        .filter((p) => typeof p.amount === "number" && p.amount! > 0)
        .slice(0, 5)
        .map((p) => `${p.label} ${p.amount} kr`);
      if (prices.length > 0) parts.push(`Priser: ${prices.join(", ")}.`);
      if (web?.promotions && web.promotions.length > 0) {
        parts.push(`Kampanjer: ${web.promotions.slice(0, 3).join("; ")}.`);
      }
      if (web?.summary) parts.push(web.summary);
      if (c.lastChangeAt)
        parts.push(`Sist endring registrert ${fmtDate(c.lastChangeAt)}.`);
      lines.push(parts.join(" "));
    }
  }

  lines.push("");
  lines.push("## Nyeste varsler");
  if (alerts.length === 0) {
    lines.push("Ingen varsler ennå.");
  } else {
    for (const a of alerts) {
      lines.push(
        `- [${fmtDate(a.createdAt)}] ${a.title}${a.body ? ` — ${a.body}` : ""}`,
      );
    }
  }

  return [RULES, "", "# Bedriftens data", lines.join("\n")].join("\n");
}
