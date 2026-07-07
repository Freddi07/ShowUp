// @polsia:user-owned — converted from server component to client component for Vite.
'use client';

import { useEffect } from 'react';
import { AdminPage } from '@/components/custom/admin/admin-page';
import { useSession } from '@/lib/auth-client';
import { useRouter } from '@/lib/compat/next-navigation';

export default function AdminPageRoute() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const isAdmin =
    session?.user?.role
      ?.split(',')
      .map((r: string) => r.trim())
      .includes('admin') ?? false;

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      router.replace('/login');
    } else if (!isAdmin) {
      router.replace('/dashboard');
    }
  }, [isPending, session, isAdmin, router]);

  if (isPending || !session?.user || !isAdmin) return null;

  return <AdminPage />;
}
