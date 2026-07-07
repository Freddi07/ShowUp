// @polsia:user-owned

export interface CustomerData {
  name?: string;
  phone?: string | null;
  email?: string | null;
  externalCustomerId?: string;
}

export interface SyncedAppointmentData {
  externalId: string;
  appointmentData: Record<string, unknown>;
  customer?: CustomerData;
}

export interface IntegrationProvider {
  connect(credentials: unknown): Promise<void>;
  disconnect(): Promise<void>;
  fetchAppointments(since?: Date): Promise<SyncedAppointmentData[]>;
  /**
   * Validate the webhook signature and process the payload.
   * MUST throw if signature is invalid.
   */
  handleWebhook(payload: unknown, signature: string): Promise<void>;
}

export class NotImplementedError extends Error {
  constructor(provider: string, method: string) {
    super(`${provider}.${method}() is not yet implemented`);
    this.name = 'NotImplementedError';
  }
}
