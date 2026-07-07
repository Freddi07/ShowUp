import type { Metadata } from 'next';
import { KontoPage } from '@/components/custom/konto-page';

export const metadata: Metadata = {
  title: 'Konto',
  description: 'Profil, fakturaliste og kontoinnstillinger',
};

export default function KontoRoute() {
  return <KontoPage />;
}
