// @polsia:user-owned — converted from async server component for Vite.
'use client';

import { useParams } from 'wouter';
import { CustomerDetail } from '@/components/custom/customer-detail';

export default function CustomerDetailRoute() {
  const params = useParams<{ id: string }>();
  return <CustomerDetail customerId={params.id ?? ''} />;
}
