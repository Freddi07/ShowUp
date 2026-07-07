// @polsia:user-owned
import { NextResponse } from 'next/server';
import { IntegrationProviderSchema } from '@/lib/contracts/integrations';
import { NotImplementedError } from '@/lib/integrations/base';
import { createWebhookHandler } from '@/lib/integrations/registry';

export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;

  const parsed = IntegrationProviderSchema.safeParse(provider);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Unknown provider' }, { status: 404 });
  }

  // Read raw body before any parsing — needed for signature validation
  const rawBody = await req.text();
  let payload: unknown;
  try {
    payload = rawBody.length > 0 ? JSON.parse(rawBody) : {};
  } catch {
    // Google Calendar sends empty or non-JSON ping bodies — tolerate gracefully
    payload = {};
  }

  // Convention: x-<provider>-signature (underscores → hyphens)
  const signature = req.headers.get(`x-${provider.replace(/_/g, '-')}-signature`) ?? '';

  try {
    const handler = createWebhookHandler(parsed.data);
    await handler.handleWebhook(payload, signature);
  } catch (err) {
    if (err instanceof NotImplementedError) {
      return NextResponse.json({ error: 'Provider not implemented' }, { status: 501 });
    }
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 401 });
  }

  return NextResponse.json({ received: true });
}
