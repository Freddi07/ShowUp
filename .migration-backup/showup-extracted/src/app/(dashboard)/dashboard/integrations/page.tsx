// @polsia:user-owned

import type { Metadata } from 'next';
import { IntegrationsPage } from '@/components/custom/integrations-page';

export const metadata: Metadata = {
  title: 'Integrasjoner',
  description: 'Koble til Tripletex og Opus Dental for automatisk synkronisering',
};

export default function IntegrationsRoute() {
  return <IntegrationsPage />;
}
