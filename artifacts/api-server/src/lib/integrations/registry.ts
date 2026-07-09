/**
 * Provider registry. Each provider module registers a factory keyed by its
 * provider id; the core resolves an implementation through `getProvider`.
 * Foundation ships an empty registry — the dependent tasks register their
 * providers here without changing any core logic.
 */
import type { BookingSyncProvider, ProviderContext } from "./types";

export type ProviderFactory = (ctx: ProviderContext) => BookingSyncProvider;

const registry = new Map<string, ProviderFactory>();

export function registerProvider(
  provider: string,
  factory: ProviderFactory,
): void {
  registry.set(provider, factory);
}

export function isProviderImplemented(provider: string): boolean {
  return registry.has(provider);
}

export class ProviderNotImplementedError extends Error {
  readonly provider: string;
  constructor(provider: string) {
    super(`Provider "${provider}" is not implemented yet`);
    this.name = "ProviderNotImplementedError";
    this.provider = provider;
  }
}

export function getProvider(
  provider: string,
  ctx: ProviderContext,
): BookingSyncProvider {
  const factory = registry.get(provider);
  if (!factory) throw new ProviderNotImplementedError(provider);
  return factory(ctx);
}
