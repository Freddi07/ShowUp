import 'server-only';
import { NextResponse } from 'next/server';
import {
  NotificationSettingsItem,
  NotificationSettingsPut,
} from '@/lib/contracts/notification-settings';
import { prisma } from '@/lib/db';
import { requireAuth, type SessionUser } from '@/lib/require-auth';

export const dynamic = 'force-dynamic';

const defaults: NotificationSettingsItem = {
  remind48h: false,
  remind24h: true,
  remind2h: false,
  channelSms: true,
  channelEmail: false,
  autoFollowUp: false,
};

export async function GET(req: Request) {
  let user: SessionUser;
  try {
    user = await requireAuth(req);
  } catch (res) {
    return res as Response;
  }

  const row = await prisma.notificationSettings.findUnique({ where: { userId: user.id } });
  if (!row) {
    return NextResponse.json(NotificationSettingsItem.parse(defaults));
  }

  return NextResponse.json(
    NotificationSettingsItem.parse({
      remind48h: row.remind48h,
      remind24h: row.remind24h,
      remind2h: row.remind2h,
      channelSms: row.channelSms,
      channelEmail: row.channelEmail,
      autoFollowUp: row.autoFollowUp,
    }),
  );
}

export async function PUT(req: Request) {
  let user: SessionUser;
  try {
    user = await requireAuth(req);
  } catch (res) {
    return res as Response;
  }

  const bodyResult = NotificationSettingsPut.safeParse(await req.json().catch(() => ({})));
  if (!bodyResult.success) {
    return NextResponse.json({ error: bodyResult.error.flatten() }, { status: 400 });
  }

  const data = bodyResult.data;

  await prisma.notificationSettings.upsert({
    where: { userId: user.id },
    update: data,
    create: { userId: user.id, ...data },
  });

  return NextResponse.json({ ok: true });
}
