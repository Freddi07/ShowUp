// @polsia:user-owned
import type { IntegrationProvider, SyncedAppointmentData } from '@/lib/integrations/base';
import { NotImplementedError } from '@/lib/integrations/base';

export class OpusDentalProvider implements IntegrationProvider {
  async connect(_credentials: unknown): Promise<void> {
    // No-op: upload-only provider
  }

  async disconnect(): Promise<void> {
    // No-op
  }

  async fetchAppointments(_since?: Date): Promise<SyncedAppointmentData[]> {
    throw new NotImplementedError('opus_dental', 'fetchAppointments');
  }

  async handleWebhook(_payload: unknown, _signature: string): Promise<void> {
    throw new NotImplementedError('opus_dental', 'handleWebhook');
  }
}
