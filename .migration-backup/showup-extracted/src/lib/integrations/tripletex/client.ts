const BASE_URL = 'https://api.tripletex.no/v2';

export const TRIPLETEX_ENDPOINTS = {
  customers: '/customer',
  appointments: '/appointment',
  validation: '/customer?count=1',
} as const;

export class TripletexClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  async get<T>(path: string): Promise<T> {
    const url = `${BASE_URL}${path}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new TripletexError(`GET ${path} failed (${res.status}): ${body}`, res.status);
    }

    return res.json() as Promise<T>;
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const url = `${BASE_URL}${path}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const bodyText = await res.text();
      throw new TripletexError(`POST ${path} failed (${res.status}): ${bodyText}`, res.status);
    }

    return res.json() as Promise<T>;
  }

  async validateToken(): Promise<boolean> {
    try {
      await this.get(TRIPLETEX_ENDPOINTS.validation);
      return true;
    } catch {
      return false;
    }
  }
}

export class TripletexError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'TripletexError';
  }
}

export { decrypt, encrypt } from '@/lib/integrations/crypto';
