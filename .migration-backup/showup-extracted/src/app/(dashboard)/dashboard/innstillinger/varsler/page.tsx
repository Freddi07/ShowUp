import type { Metadata } from 'next';
import { VarslerPage } from '@/components/custom/varsler-page';

export const metadata: Metadata = {
  title: 'Varslingsinnstillinger',
  description: 'Konfigurer påminnelsetidspunkter og kanaler',
};

export default function VarslerRoute() {
  return <VarslerPage />;
}
