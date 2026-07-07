import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AdminPage } from '@/components/custom/admin/admin-page';
import { getSessionUser } from '@/lib/require-auth';

export const metadata: Metadata = { title: 'Admin – Brukerstyring' };

export default async function AdminPageRoute() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect('/dashboard');
  return <AdminPage />;
}
