import { DEFAULT_MODEL, FALLBACK_MODEL, MODELS } from "@/lib/models";

/**
 * Server-only model resolution. Reads `process.env`, so this module must never
 * be imported from a client component — that is what keeps the environment
 * out of the browser bundle. Verified by the bundle scan in the README.
 */

/** The model the server will actually use for a request. */
export function resolveModel(candidate: unknown): string {
  const envModel = process.env.OPENROUTER_MODEL?.trim();
  if (typeof candidate === "string" && MODELS.some((m) => m.id === candidate)) {
    return candidate;
  }
  if (envModel) return envModel;
  return DEFAULT_MODEL;
}

/**
 * The ordered fallback chain for `primary`: the configured fallback first, then
 * any other known-good model, so a second retired id does not end the search.
 */
export function resolveFallbacks(primary: string): string[] {
  const envFallback = process.env.OPENROUTER_FALLBACK_MODEL?.trim();
  const chain = [envFallback || FALLBACK_MODEL, ...MODELS.map((m) => m.id)];
  const seen = new Set<string>([primary]);
  const out: string[] = [];
  for (const id of chain) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * The single model to retry with after a model-not-available failure. Always
 * distinct from `primary`. Overridable with OPENROUTER_FALLBACK_MODEL so the
 * fallback can be repointed from an environment variable without a code change.
 */
export function resolveFallbackModel(primary: string): string {
  return resolveFallbacks(primary)[0] ?? primary;
}

/** The OpenAI-compatible base URL for the provider. */
export function resolveBaseUrl(): string {
  return process.env.OPENROUTER_BASE_URL?.trim() || "https://openrouter.ai/api/v1";
}

/** The server-side API key. Never returned to the client. */
export function resolveApiKey(): string | undefined {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  return key ? key : undefined;
}
