import { NextResponse } from 'next/server';

// GET — Microsoft Graph subscription validation handshake
export async function GET(req: Request) {
  const url = new URL(req.url);
  const validationToken = url.searchParams.get('validationToken');
  if (!validationToken) {
    return new Response('Missing validationToken', { status: 400 });
  }
  return new Response(validationToken, {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}

// POST — change notifications from Microsoft Graph
export async function POST(req: Request) {
  try {
    await req.text(); // consume body; ignore content in v1
  } catch {
    // ignore parse errors
  }
  // v1: just acknowledge; cron picks up changes via deltaLink
  return NextResponse.json({ received: true });
}
