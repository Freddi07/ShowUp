// @polsia:user-owned — converted from server component to client component for Vite.
'use client';

import { useEffect } from 'react';
import { AdminPage } from '@/components/custom/admin/admin-page';
import { isAdminEmail } from '@/lib/admin-config';
import { useSession } from '@/lib/auth-client';
import { useRouter } from '@/lib/compat/next-navigation';

export default function AdminPageRoute() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const isAdmin = isAdminEmail(session?.user?.email);

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
