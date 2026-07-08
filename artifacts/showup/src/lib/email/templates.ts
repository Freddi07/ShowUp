// @polsia:user-owned — your email templates. Edit, add, or delete freely.
// Each template returns { subject, html, text }; send it via the framework transport:
//   import { sendEmail } from '@/lib/email/send';
//   import { welcomeEmail } from '@/lib/email/templates';
//   await sendEmail({ to: user.email, ...welcomeEmail({ name: user.name }) });
// renderEmail() is a plain inline-styled shell — email clients drop <style>/<link>, so style inline.
// renderEmail() auto-escapes its heading/body/cta/footer, so pass RAW values (don't escapeHtml() them
// first — that double-escapes). escapeHtml() is only for when you hand-build an html string yourself.

/** Subject + rendered bodies — spread into sendEmail({ to, ... }). */
export interface EmailContent {
  subject: string;
  html: string;
  text?: string;
}

export interface RenderEmailOptions {
  heading: string;
  /** Body paragraphs (plain text; escaped for you). */
  body: string[];
  /** Optional call-to-action button. */
  cta?: { label: string; url: string };
  /** Optional footer line under the divider. */
  footer?: string;
}

/** Escape a value for safe interpolation into an HTML attribute or text node. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Wrap content in a minimal, inline-styled email shell. Restyle to match the brand. */
export function renderEmail(options: RenderEmailOptions): { html: string; text: string } {
  const paragraphs = options.body
    .map(
      (line) =>
        `<p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.6;">${escapeHtml(line)}</p>`,
    )
    .join('');
  const button = options.cta
    ? `<p style="margin:24px 0 0;"><a href="${escapeHtml(options.cta.url)}" style="display:inline-block;padding:10px 20px;background:#111111;color:#ffffff;text-decoration:none;font-size:15px;">${escapeHtml(options.cta.label)}</a></p>`
    : '';
  const footer = options.footer
    ? `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e5e5;color:#999999;font-size:12px;">${escapeHtml(options.footer)}</div>`
    : '';
  const html = [
    '<div style="max-width:560px;margin:0 auto;padding:24px;font-family:Arial,Helvetica,sans-serif;">',
    `<h1 style="margin:0 0 16px;color:#111111;font-size:22px;">${escapeHtml(options.heading)}</h1>`,
    paragraphs,
    button,
    footer,
    '</div>',
  ].join('');
  const text = [
    options.heading,
    '',
    ...options.body,
    ...(options.cta ? ['', `${options.cta.label}: ${options.cta.url}`] : []),
    ...(options.footer ? ['', options.footer] : []),
  ].join('\n');
  return { html, text };
}

// ─── Example templates — edit / add / remove to fit the app ───

/** Welcome email for a new signup. */
export function welcomeEmail(input: { name: string; ctaUrl?: string }): EmailContent {
  const { html, text } = renderEmail({
    heading: `Welcome, ${input.name}!`,
    body: ["Thanks for signing up — we're glad you're here."],
    cta: input.ctaUrl ? { label: 'Get started', url: input.ctaUrl } : undefined,
    footer: 'You received this because you created an account.',
  });
  return { subject: 'Welcome aboard', html, text };
}

const PLAN_DISPLAY_NAMES: Record<string, string> = {
  starter: 'Starter (199 kr/mnd)',
  pro: 'Pro (499 kr/mnd)',
  business: 'Business (999 kr/mnd)',
};

/** Subscription activated confirmation email — sent after checkout.session.completed. */
export function subscriptionActivatedEmail(input: {
  name: string;
  planId: string;
  dashboardUrl: string;
}): EmailContent {
  const planName = PLAN_DISPLAY_NAMES[input.planId] ?? input.planId;
  const { html, text } = renderEmail({
    heading: 'Betalingen er bekreftet',
    body: [
      `Hei ${input.name}!`,
      `Abonnementet ditt er nå aktivert. Du har valgt planen ${planName}, som fornyes automatisk hver måned.`,
      'Du har nå full tilgang til BookPling og alle funksjonene som er inkludert i din plan.',
    ],
    cta: { label: 'Gå til dashboard', url: input.dashboardUrl },
    footer: 'Du mottar denne e-posten fordi du aktiverte et abonnement på BookPling.',
  });
  return { subject: 'Abonnement aktivert — velkommen til BookPling', html, text };
}

/** Subscription canceled confirmation email — sent after customer.subscription.deleted. */
export function subscriptionCanceledEmail(input: { name: string }): EmailContent {
  const { html, text } = renderEmail({
    heading: 'Abonnementet er avsluttet',
    body: [
      `Hei ${input.name},`,
      'Abonnementet ditt på BookPling er nå avsluttet og tilgangen din er suspendert.',
      'Hvis dette var en feil, eller du ønsker å aktivere abonnementet igjen, ta kontakt med oss.',
    ],
    footer: 'Du mottar denne e-posten fordi abonnementet ditt ble avsluttet.',
  });
  return { subject: 'Abonnementet ditt er avsluttet', html, text };
}

/** Password reset email. */
export function passwordResetEmail(input: { name: string; resetUrl: string }): EmailContent {
  const { html, text } = renderEmail({
    heading: 'Tilbakestilling av passord',
    body: [
      `Hei ${input.name},`,
      'Du har bedt om å tilbakestille passordet ditt. Klikk lenken under — lenken er gyldig i 1 time.',
    ],
    cta: { label: 'Tilbakestill passord', url: input.resetUrl },
    footer: 'Klikket du ikke på denne lenken? Da kan du ignorere denne e-posten.',
  });
  return { subject: 'Tilbakestill passordet ditt', html, text };
}

/** Generic notification email. */
export function notificationEmail(input: {
  subject: string;
  title: string;
  lines: string[];
  cta?: { label: string; url: string };
}): EmailContent {
  const { html, text } = renderEmail({ heading: input.title, body: input.lines, cta: input.cta });
  return { subject: input.subject, html, text };
}

/** Trial-started confirmation email — sent after successful checkout verification. */
export function trialStartedEmail(input: { name: string; trialEndsAt: string }): EmailContent {
  const { html, text } = renderEmail({
    heading: 'Velkommen — prøveperioden din har startet!',
    body: [
      `Hei ${input.name}!`,
      'Prøveperioden din på 14 dager er nå aktivert. Du belastes ikke i prøveperioden.',
      `Prøveperioden din varer til ${input.trialEndsAt}.`,
      'Etter prøveperioden fornyes abonnementet automatisk.',
    ],
    footer: 'Du mottar denne e-posten fordi du registrerte deg på BookPling.',
  });
  return { subject: 'Prøveperioden din har startet — BookPling', html, text };
}
