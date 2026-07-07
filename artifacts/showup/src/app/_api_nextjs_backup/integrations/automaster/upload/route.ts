import { parse } from 'csv-parse/sync';
import { NextResponse } from 'next/server';
import { AutomasterUploadResponseSchema } from '@/lib/contracts/automaster';
import { upsertCustomer } from '@/lib/customers/upsert';
import { prisma } from '@/lib/db';
import type { SessionUser } from '@/lib/require-auth';
import { requireAuth } from '@/lib/require-auth';

interface UploadError {
  row: number;
  message: string;
}

export async function POST(req: Request) {
  let user: SessionUser;
  try {
    user = await requireAuth(req);
  } catch (res) {
    return res as Response;
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Ugyldig skjemadata' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'Ingen fil lastet opp' }, { status: 400 });
  }

  if (!file.name.endsWith('.csv')) {
    return NextResponse.json({ error: 'Bare CSV-filer er støttet' }, { status: 400 });
  }

  let content: string;
  try {
    content = await file.text();
  } catch {
    return NextResponse.json({ error: 'Kunne ikke lese filen' }, { status: 400 });
  }

  let rows: Record<string, string>[] = [];
  try {
    rows = parse(content, { columns: true, skip_empty_lines: true, trim: true, delimiter: ';' });
  } catch {
    try {
      rows = parse(content, { columns: true, skip_empty_lines: true, trim: true, delimiter: ',' });
    } catch {
      return NextResponse.json({ error: 'Kunne ikke parse CSV-fil' }, { status: 400 });
    }
  }

  const errors: UploadError[] = [];
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const name = row.Kundenavn || row.Name || row.Kunde || row.Navn;
    const phone = row.Telefon || row.Phone || row.Mobil;
    const dateStr = row.Dato || row.Date;
    const timeStr = row.Klokkeslett || row.Time || row.Tid;

    if (!name) {
      errors.push({ row: i + 1, message: 'Mangler kundenavn' });
      skipped++;
      continue;
    }

    if (!dateStr) {
      errors.push({ row: i + 1, message: 'Mangler dato' });
      skipped++;
      continue;
    }

    let scheduledAt: Date;
    try {
      const parts = dateStr.includes('.') ? dateStr.split('.') : dateStr.split('-');
      if (parts.length === 3) {
        const [a, b, c] = parts.map(Number);
        scheduledAt = dateStr.includes('.')
          ? new Date(c ?? 0, (b ?? 1) - 1, a ?? 1)
          : new Date(a ?? 0, (b ?? 1) - 1, c ?? 1);
      } else {
        scheduledAt = new Date(dateStr);
      }
      if (Number.isNaN(scheduledAt.getTime())) throw new Error('Invalid date');
    } catch {
      errors.push({ row: i + 1, message: `Ugyldig dato: ${dateStr}` });
      skipped++;
      continue;
    }

    if (timeStr) {
      const timeParts = timeStr.split(':');
      if (timeParts.length >= 2) {
        scheduledAt.setHours(Number(timeParts[0]), Number(timeParts[1]), 0, 0);
      }
    }

    const reminderAt = new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000);
    const externalCustomerId = `automaster_${name}_${dateStr}`;

    await upsertCustomer(user.id, {
      name,
      phone: phone || null,
      externalCustomerId,
      source: 'automaster',
    });

    const customer = await prisma.customer.findFirst({
      where: { userId: user.id, externalId: externalCustomerId, source: 'automaster' },
    });

    const apptExternalId = `automaster_${name}_${scheduledAt.toISOString()}`;
    const existingAppt = await prisma.appointment.findFirst({
      where: { externalId: apptExternalId },
    });

    if (existingAppt) {
      await prisma.appointment.update({
        where: { id: existingAppt.id },
        data: {
          clientName: name,
          clientPhone: phone || '',
          scheduledAt,
          reminderAt,
          customerId: customer?.id ?? null,
        },
      });
    } else {
      await prisma.appointment.create({
        data: {
          clientName: name,
          clientPhone: phone || '',
          scheduledAt,
          reminderAt,
          externalId: apptExternalId,
          customerId: customer?.id ?? null,
        },
      });
    }

    imported++;
  }

  await prisma.integration.upsert({
    where: { userId_provider: { userId: user.id, provider: 'automaster' } },
    update: { lastSyncedAt: new Date(), status: imported > 0 ? 'connected' : 'disconnected' },
    create: {
      userId: user.id,
      provider: 'automaster',
      credentialsEncrypted: '',
      status: imported > 0 ? 'connected' : 'disconnected',
    },
  });

  return NextResponse.json(
    AutomasterUploadResponseSchema.parse({
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    }),
  );
}
