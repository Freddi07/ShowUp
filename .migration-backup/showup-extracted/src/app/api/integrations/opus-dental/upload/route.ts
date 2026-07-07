import { parse } from 'csv-parse/sync';
import { NextResponse } from 'next/server';
import { OpusDentalUploadResponseSchema } from '@/lib/contracts/opus-dental';
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
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext !== 'csv' && ext !== 'xml') {
    return NextResponse.json({ error: 'Bare CSV- og XML-filer er støttet' }, { status: 400 });
  }

  let content: string;
  try {
    content = await file.text();
  } catch {
    return NextResponse.json({ error: 'Kunne ikke lese filen' }, { status: 400 });
  }

  let rows: Record<string, string>[] = [];
  if (ext === 'csv') {
    try {
      rows = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        delimiter: ';',
      });
    } catch {
      // Try comma delimiter
      try {
        rows = parse(content, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
          delimiter: ',',
        });
      } catch {
        return NextResponse.json({ error: 'Kunne ikke parse CSV-fil' }, { status: 400 });
      }
    }
  } else {
    // Basic XML parsing for Opus Dental exports
    rows = parseOpusXml(content);
  }

  const errors: UploadError[] = [];
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    // Normalize column names (handle Norwegian + English variants)
    const name = row.Navn || row.Name || row.Klient || row.Kunde;
    const phone = row.Telefon || row.Phone || row.Mobil;
    const dateStr = row.Dato || row.Date;
    const timeStr = row.Klokkeslett || row.Time || row.Tid;

    if (!name) {
      errors.push({ row: i + 1, message: 'Mangler navn' });
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
      const dateParts = dateStr.includes('.')
        ? dateStr.split('.')
        : dateStr.includes('-')
          ? dateStr.split('-')
          : null;
      if (dateParts && dateParts.length === 3) {
        const year = Number(dateParts[0]);
        const month = Number(dateParts[1]);
        const day = Number(dateParts[2]);
        if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day))
          throw new Error('Invalid date');
        scheduledAt = new Date(year, month - 1, day);
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

    const externalCustomerId = `opus_${name}_${dateStr}`;
    await upsertCustomer(user.id, {
      name,
      phone: phone || null,
      externalCustomerId,
      source: 'opus_dental',
    });
    const customer = await prisma.customer.findFirst({
      where: { userId: user.id, externalId: externalCustomerId, source: 'opus_dental' },
    });

    const apptExternalId = `opus_${name}_${scheduledAt.toISOString()}`;
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
    where: { userId_provider: { userId: user.id, provider: 'opus_dental' } },
    update: { lastSyncedAt: new Date(), status: imported > 0 ? 'connected' : 'disconnected' },
    create: {
      userId: user.id,
      provider: 'opus_dental',
      credentialsEncrypted: '',
      status: imported > 0 ? 'connected' : 'disconnected',
    },
  });

  const response = {
    imported,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
  };

  return NextResponse.json(OpusDentalUploadResponseSchema.parse(response));
}

function parseOpusXml(content: string): Record<string, string>[] {
  const rows: Record<string, string>[] = [];
  const rowMatches = content.matchAll(/<row[^>]*>([^<]*)<\/row>/gi);
  for (const rowMatch of rowMatches) {
    const rowContent = rowMatch[1];
    if (!rowContent) continue;
    const cols: Record<string, string> = {};
    const colMatches = rowContent.matchAll(/<([A-Za-zÀ-ſ]+)[^>]*>([^<]*)/g);
    for (const [, colName, value] of colMatches) {
      if (colName && value) {
        cols[colName] = value.trim();
      }
    }
    rows.push(cols);
  }
  return rows;
}
