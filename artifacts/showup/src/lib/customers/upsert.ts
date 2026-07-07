import 'server-only';
import { prisma } from '@/lib/db';

export interface CustomerData {
  name?: string;
  phone?: string | null;
  email?: string | null;
  externalCustomerId?: string;
  source: string;
}

export async function upsertCustomer(userId: string, data: CustomerData): Promise<void> {
  if (data.phone) {
    const existing = await prisma.customer.findFirst({
      where: { userId, phone: data.phone },
    });
    if (existing) {
      await prisma.customer.update({
        where: { id: existing.id },
        data: {
          name: data.name ?? existing.name,
          email: data.email ?? existing.email,
        },
      });
      return;
    }
  }

  if (data.email) {
    const existing = await prisma.customer.findFirst({
      where: { userId, email: data.email },
    });
    if (existing) {
      await prisma.customer.update({
        where: { id: existing.id },
        data: {
          name: data.name ?? existing.name,
          phone: data.phone ?? existing.phone,
        },
      });
      return;
    }
  }

  if (data.externalCustomerId) {
    const existing = await prisma.customer.findFirst({
      where: { userId, externalId: data.externalCustomerId, source: data.source },
    });
    if (existing) {
      await prisma.customer.update({
        where: { id: existing.id },
        data: {
          name: data.name ?? undefined,
          phone: data.phone ?? undefined,
          email: data.email ?? undefined,
        },
      });
    } else {
      await prisma.customer.create({
        data: {
          userId,
          name: data.name ?? 'Ukjent',
          phone: data.phone ?? null,
          email: data.email ?? null,
          externalId: data.externalCustomerId,
          source: data.source,
        },
      });
    }
    return;
  }

  await prisma.customer.create({
    data: {
      userId,
      name: data.name ?? 'Ukjent',
      phone: data.phone ?? null,
      email: data.email ?? null,
      source: data.source,
    },
  });
}
