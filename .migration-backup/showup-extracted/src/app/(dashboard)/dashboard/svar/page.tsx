import type { Metadata } from 'next';
import { SvarPage } from '@/components/custom/svar-page';

export const metadata: Metadata = {
  title: 'Svarhåndtering',
  description: 'Innkommende svar fra kunder',
};

export default function SvarRoute() {
  return <SvarPage />;
}
