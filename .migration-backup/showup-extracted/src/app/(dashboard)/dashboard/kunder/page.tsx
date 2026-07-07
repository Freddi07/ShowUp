// @polsia:user-owned
import type { Metadata } from 'next';
import { KunderPage } from '@/components/custom/kunder-page';

export const metadata: Metadata = {
  title: 'Kunder',
  description: 'Alle kunder synkronisert fra tilkoblede integrasjoner',
};

export default function KunderRoute() {
  return <KunderPage />;
}
