import type { Metadata } from 'next';
import { StatistikkPage } from '@/components/custom/statistikk-page';

export const metadata: Metadata = {
  title: 'Statistikk',
  description: 'Aktivitetsoversikt og bekreftelsesrater',
};

export default function StatistikkRoute() {
  return <StatistikkPage />;
}
