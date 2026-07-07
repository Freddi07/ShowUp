// @polsia:framework-owned — the ONLY data transport for client pages.
// apiFetch calls the Replit API server at /api/*.
import type { ZodType } from 'zod';

// In Vite, use import.meta.env.VITE_API_URL (mapped from NEXT_PUBLIC_API_URL).
// Leave empty to use relative URLs (preferred in the Replit proxy environment).
const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

type ApiFetchOptions<T> = RequestInit & {
  schema?: ZodType<T>;
};

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T>;
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions<T> & { schema: ZodType<T> },
): Promise<T>;
export async function apiFetch<T>(path: string, options?: ApiFetchOptions<T>): Promise<T> {
  const { schema, ...init } = options ?? {};
  const headers = new Headers(init.headers);
  if (!headers.has('content-type') && init.body) {
    headers.set('content-type', 'application/json');
  }

  const res = await fetch(`${BASE}${path}`, { ...init, headers, credentials: 'include' });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`apiFetch ${path} failed (${res.status})`, { cause: body });
  }
  return schema ? schema.parse(body) : (body as T);
}
