import 'server-only';
import { NextResponse } from 'next/server';
import { FakturaList } from '@/lib/contracts/fakturaer';
import { requireAuth, type SessionUser } from '@/lib/require-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  let user: SessionUser;
  try {
    user = await requireAuth(req);
  } catch (res) {
    return res as Response;
  }
  void user;
  return NextResponse.json(FakturaList.parse({ items: [] }));
}
