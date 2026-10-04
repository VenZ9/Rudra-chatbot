/**
 * Server-side availability probe for OpenRouter models.
 *
 * WHY THIS EXISTS
 * ---------------
 * Free models on OpenRouter are retired without notice. When that happens a
 * request for the retired id fails with a 404 / "model not found", and the user
 * sees an error instead of an answer. This module lets the route check the id
 * against OpenRouter's own endpoint listing BEFORE opening the stream, so it can
 * transparently move to a working fallback model and tell the user it did.
 *
 * It is strictly best-effort. Every failure path assumes "available", so a
 * flaky probe can never block a request that would otherwise have worked.
 *
 * Everything here runs on the server only — it reads the API key, so it must
 * never be imported into a client component.
 */

/** Give up on the probe after this long and assume the model is fine. */
const PROBE_TIMEOUT_MS = 3_500;

/** How long an availability answer is trusted. Short: model lists change. */
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  available: boolean;
  at: number;
}

/**
 * Per-instance memo. On Vercel each serverless instance keeps its own copy,
 * which is fine — this only exists to avoid probing on every single request.
 */
const cache = new Map<string, CacheEntry>();

export interface ProbeConfig {
  baseURL: string;
  apiKey: string;
  /** Optional attribution headers, forwarded to keep the probe consistent. */
  headers?: Record<string, string>;
}

/**
 * Builds the path segment for a model id.
 *
 * Model ids contain a `/` (`google/gemma-4-26b-a4b-it:free`), so
 * `encodeURIComponent` is WRONG here: it turns the slash into `%2F`, OpenRouter
 * answers 404 for the mangled id, and every model then looks retired — which
 * silently makes the whole app return 503. The characters that actually matter
 * for a path are filtered out instead, so an id can never inject a query string
 * or traverse the path.
 */
function modelPathSegment(modelId: string): string {
  return modelId.replace(/[^A-Za-z0-9._:/~-]/g, "");
}

/**
 * Asks OpenRouter whether `modelId` has at least one live endpoint.
 *
 * Returns:
 *   - `true`  when the model is listed WITH at least one endpoint, or when the
 *             probe itself failed (timeout, network error, malformed body) — a
 *             broken probe must never be the reason a user gets no answer.
 *   - `false` when the model is unknown (HTTP 404) or is listed with an EMPTY
 *             endpoint list, which is how OpenRouter represents a retired model.
 */
export async function isModelAvailable(modelId: string, cfg: ProbeConfig): Promise<boolean> {
  const cached = cache.get(modelId);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.available;

  try {
    const res = await fetch(`${cfg.baseURL}/models/${modelPathSegment(modelId)}/endpoints`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
        ...(cfg.headers ?? {}),
      },
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      cache: "no-store",
    });

    // 404 means the id itself is unknown to OpenRouter.
    if (res.status === 404) {
      cache.set(modelId, { available: false, at: Date.now() });
      return false;
    }

    // Any other non-OK status (auth, rate limit, 5xx) means the listing had a
    // problem, not that the model is gone. Don't punish the user for that.
    if (!res.ok) {
      cache.set(modelId, { available: true, at: Date.now() });
      return true;
    }

    // The decisive signal. A RETIRED model still answers HTTP 200 — it simply
    // comes back with an empty `endpoints` array. Verified against the live
    // API: `google/gemma-2-9b-it:free` (retired) returns `endpoints: []`, while
    // a live model returns one or more. Checking only the status code marked
    // every retired model as available, which silently defeated the fallback.
    const body: unknown = await res.json();
    const endpoints = (body as { data?: { endpoints?: unknown } })?.data?.endpoints;
    const available = Array.isArray(endpoints) && endpoints.length > 0;

    cache.set(modelId, { available, at: Date.now() });
    return available;
  } catch {
    // Timeout / DNS / TLS / aborted. Assume available and don't cache, so the
    // next request can try the probe again.
    return true;
  }
}

export interface ModelChoice {
  /** The model the route should actually stream from. */
  model: string;
  /** Set when we moved away from the requested model. */
  fellBackFrom?: string;
  /**
   * True when the requested model AND every fallback probed as gone. The route
   * reports this immediately rather than opening a request that is certain to
   * fail, because a provider failure surfaces *inside* the stream (as an error
   * part) rather than being thrown — so it can never be caught downstream.
   */
  allUnavailable?: boolean;
}

/**
 * Picks the first model that is actually available.
 *
 * Tries the requested model first, then each fallback in order. If nothing
 * probes clean the whole chain is reported as unavailable, so the route can
 * fail fast with one accurate message instead of opening a doomed stream.
 */
export async function pickAvailableModel(
  primary: string,
  fallbacks: string[],
  cfg: ProbeConfig,
): Promise<ModelChoice> {
  if (await isModelAvailable(primary, cfg)) {
    return { model: primary };
  }

  for (const candidate of fallbacks) {
    if (candidate === primary) continue;
    if (await isModelAvailable(candidate, cfg)) {
      return { model: candidate, fellBackFrom: primary };
    }
  }

  // Nothing in the chain is serving. Say so plainly rather than sending the
  // request to a model we already know is gone.
  return { model: primary, fellBackFrom: primary, allUnavailable: true };
}

/** Clears the memo. Exported for tests. */
export function resetProbeCache(): void {
  cache.clear();
}
