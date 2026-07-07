// @polsia:user-owned
import { ClinikoAppointmentListSchema, ClinikoPatientSchema } from '@/lib/contracts/cliniko';
import type { IntegrationProvider, SyncedAppointmentData } from '@/lib/integrations/base';
import { NotImplementedError } from '@/lib/integrations/base';

const BASE_URL = 'https://api.cliniko.com/v1';

export class ClinikoProvider implements IntegrationProvider {
  private authHeader: string;

  constructor(credentials: { apiKey: string }) {
    this.authHeader = `Basic ${Buffer.from(`${credentials.apiKey}:x`).toString('base64')}`;
  }

  private headers() {
    return {
      Authorization: this.authHeader,
      Accept: 'application/json',
      'User-Agent': 'ShowUp/1.0',
    };
  }

  async connect(_credentials: unknown): Promise<void> {
    const res = await fetch(`${BASE_URL}/practitioners`, { headers: this.headers() });
    if (!res.ok) {
      throw new Error(`Cliniko validation failed: ${res.status}`);
    }
  }

  async disconnect(): Promise<void> {}

  async fetchAppointments(since?: Date): Promise<SyncedAppointmentData[]> {
    const updatedSince = since ? since.toISOString() : '';
    const url = updatedSince
      ? `${BASE_URL}/appointments?updated_since=${updatedSince}`
      : `${BASE_URL}/appointments`;

    const res = await fetch(url, { headers: this.headers() });
    if (!res.ok) {
      throw new Error(`Cliniko appointments fetch failed: ${res.status}`);
    }
    const raw = await res.json();
    const parsed = ClinikoAppointmentListSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error('Invalid Cliniko appointment response');
    }

    const results: SyncedAppointmentData[] = [];
    for (const apt of parsed.data.appointments) {
      let customer: SyncedAppointmentData['customer'];
      if (apt.patient_id) {
        try {
          const patRes = await fetch(`${BASE_URL}/patients/${apt.patient_id}`, {
            headers: this.headers(),
          });
          if (patRes.ok) {
            const rawPat = await patRes.json();
            const parsedPat = ClinikoPatientSchema.safeParse(rawPat);
            if (parsedPat.success) {
              const p = parsedPat.data;
              customer = {
                name: [p.first_name, p.last_name].filter(Boolean).join(' ') || undefined,
                phone: p.phone_number ?? null,
                email: p.email ?? null,
                externalCustomerId: String(p.id),
              };
            }
          }
        } catch {
          customer = { externalCustomerId: String(apt.patient_id) };
        }
      }
      results.push({
        externalId: String(apt.id),
        appointmentData: apt as unknown as Record<string, unknown>,
        customer,
      });
    }
    return results;
  }

  async handleWebhook(_payload: unknown, _signature: string): Promise<void> {
    throw new NotImplementedError('cliniko', 'handleWebhook');
  }
}
