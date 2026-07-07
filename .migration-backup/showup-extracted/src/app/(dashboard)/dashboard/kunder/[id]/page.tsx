// @polsia:user-owned
import type { Metadata } from 'next';
import { CustomerDetail } from '@/components/custom/customer-detail';

export const metadata: Metadata = { title: 'Kundedetaljer' };

export default async function CustomerDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerDetail customerId={id} />;
}
