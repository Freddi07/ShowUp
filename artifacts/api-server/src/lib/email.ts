// Transactional email for ShowUp — sends via the Resend Replit connector.
// The connector handles the API key/auth; we only POST to Resend's /emails endpoint.
import { ReplitConnectors } from "@replit/connectors-sdk";
import { logger } from "./logger";

const connectors = new ReplitConnectors();

/** Verified sender. Override with EMAIL_FROM once a domain is verified in Resend. */
const FROM = process.env.EMAIL_FROM ?? "ShowUp <onboarding@resend.dev>";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  /** Short label (e.g. "password-reset") for correlating logs; never PII. */
  context?: string;
}

export interface SendEmailResult {
  /** Resend message id, or empty string when the send was skipped/failed softly. */
  id: string;
}

/** Max time to wait on Resend before giving up (the send is best-effort). */
const SEND_TIMEOUT_MS = 10_000;

/** Hash an email to a short, non-reversible tag so logs correlate without storing PII. */
function recipientTag(email: string): string {
  let h = 0;
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Send an email through Resend. Never throws — logs and returns an empty id on failure. */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const meta = { context: input.context ?? "email", to: recipientTag(input.to) };
  try {
    const proxied = connectors.proxy("resend", "/emails", {
      method: "POST",
      body: {
        from: FROM,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        ...(input.text ? { text: input.text } : {}),
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      },
    });
    const res = await Promise.race([
      proxied,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("send timeout")), SEND_TIMEOUT_MS),
      ),
    ]);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      logger.error(
        { ...meta, status: res.status, detail: detail.slice(0, 500) },
        "[email] Resend send failed",
      );
      return { id: "" };
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { id: data.id ?? "" };
  } catch (err) {
    logger.error({ ...meta, err }, "[email] Resend send threw");
    return { id: "" };
  }
}

/**
 * Fire-and-forget send: decouples auth flows (signup, password reset) from
 * mail-provider latency. Never awaited by callers; failures are logged in sendEmail.
 */
export function dispatchEmail(input: SendEmailInput): void {
  void sendEmail(input);
}

// ─── Templates ───────────────────────────────────────────────────────────────

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface RenderEmailOptions {
  heading: string;
  body: string[];
  cta?: { label: string; url: string };
  footer?: string;
}

function renderEmail(options: RenderEmailOptions): { html: string; text: string } {
  const paragraphs = options.body
    .map(
      (line) =>
        `<p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.6;">${escapeHtml(line)}</p>`,
    )
    .join("");
  const button = options.cta
    ? `<p style="margin:24px 0 0;"><a href="${escapeHtml(options.cta.url)}" style="display:inline-block;padding:12px 22px;background:#b45309;color:#ffffff;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">${escapeHtml(options.cta.label)}</a></p>`
    : "";
  const footer = options.footer
    ? `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e5e5;color:#999999;font-size:12px;">${escapeHtml(options.footer)}</div>`
    : "";
  const html = [
    '<div style="max-width:560px;margin:0 auto;padding:24px;font-family:Arial,Helvetica,sans-serif;">',
    `<h1 style="margin:0 0 16px;color:#111111;font-size:22px;">${escapeHtml(options.heading)}</h1>`,
    paragraphs,
    button,
    footer,
    "</div>",
  ].join("");
  const text = [
    options.heading,
    "",
    ...options.body,
    ...(options.cta ? ["", `${options.cta.label}: ${options.cta.url}`] : []),
    ...(options.footer ? ["", options.footer] : []),
  ].join("\n");
  return { html, text };
}

/** Password reset email (Norwegian). */
export function passwordResetEmail(input: { name: string; resetUrl: string }): EmailContent {
  const { html, text } = renderEmail({
    heading: "Tilbakestilling av passord",
    body: [
      `Hei ${input.name},`,
      "Du har bedt om å tilbakestille passordet ditt. Klikk lenken under — lenken er gyldig i 1 time.",
    ],
    cta: { label: "Tilbakestill passord", url: input.resetUrl },
    footer: "Klikket du ikke på denne lenken? Da kan du ignorere denne e-posten.",
  });
  return { subject: "Tilbakestill passordet ditt", html, text };
}

/** Welcome email for a new signup (Norwegian). */
export function welcomeEmail(input: { name: string; dashboardUrl?: string }): EmailContent {
  const { html, text } = renderEmail({
    heading: `Velkommen, ${input.name}!`,
    body: [
      "Takk for at du registrerte deg hos ShowUp.",
      "Prøveperioden din på 14 dager er nå aktiv — du kan komme i gang med en gang.",
    ],
    cta: input.dashboardUrl
      ? { label: "Gå til dashboard", url: input.dashboardUrl }
      : undefined,
    footer: "Du mottar denne e-posten fordi du opprettet en konto hos ShowUp.",
  });
  return { subject: "Velkommen til ShowUp", html, text };
}
