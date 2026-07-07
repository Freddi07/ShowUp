import type { Metadata } from 'next';
import { MalerPage } from '@/components/custom/maler-page';

export const metadata: Metadata = {
  title: 'Meldingsmaler',
  description: 'Rediger SMS-maler for påminnelser',
};

export default function MalerRoute() {
  return <MalerPage />;
}
