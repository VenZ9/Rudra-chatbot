import { APICallError } from "ai";

/** Pulls an HTTP status off whatever shape the provider/SDK threw. */
export function statusOf(error: unknown): number | undefined {
  if (error && typeof error === "object") {
    const e = error as {
      statusCode?: unknown;
      status?: unknown;
      cause?: unknown;
      lastError?: unknown;
    };
    if (typeof e.statusCode === "number") return e.statusCode;
    if (typeof e.status === "number") return e.status;
    // The SDK's retry wrapper nests the real failure here.
    if (e.lastError) {
      const nested = statusOf(e.lastError);
      if (nested !== undefined) return nested;
    }
    if (e.cause) return statusOf(e.cause);
  }
  return undefined;
}

export function rawMessageOf(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string") return error;
  return "";
}

/** Maps a provider failure onto a short, human message for the chat UI. */
export function friendlyError(status: number | undefined, raw: string): string {
  if (status === 401 || status === 403) {
    return "The API key was rejected. Check that OPENROUTER_API_KEY is set correctly in your environment.";
  }
  if (status === 402) {
    return "This model needs credits on your account. Try another free model from the header.";
  }
  if (status === 404) {
    return "That model isn't available right now. Pick a different one from the header.";
  }
  if (status === 429) {
    return "Rate limit reached — the free tier is busy. Wait a few seconds and try again, or switch models.";
  }
  if (status && status >= 500) {
    return "The model provider had a server error. Please try again in a moment.";
  }
  return (
    classifyByMessage(raw) ??
    (raw || "Something went wrong while generating a response. Please try again.")
  );
}

/**
 * The SDK retries failed calls and then throws a wrapper whose message reads
 * "Failed after N attempts. Last error: ...", which loses the status code. This
 * recovers the intent from the text so the user still gets a useful message.
 */
export function classifyByMessage(raw: string): string | null {
  const t = raw.toLowerCase();
  if (/no endpoints found|model not found|unknown model/.test(t)) {
    return "That model isn't available any more. Pick a different one from the header.";
  }
  if (/rate limit|too many requests|\b429\b/.test(t)) {
    return "Rate limit reached — the free tier is busy. Wait a few seconds and try again, or switch models.";
  }
  if (/unauthorized|invalid api key|no auth|\b401\b|\b403\b/.test(t)) {
    return "The API key was rejected. Check that OPENROUTER_API_KEY is set correctly in your environment.";
  }
  if (/insufficient|credits|\b402\b/.test(t)) {
    return "This model needs credits on your account. Try another free model from the header.";
  }
  if (/timed? ?out|timeout|aborted/.test(t)) {
    return "The request timed out. The free model may be busy — please try again.";
  }
  if (/internal server error|bad gateway|service unavailable|\b50[0-9]\b/.test(t)) {
    return "The model provider had a server error. Please try again in a moment.";
  }
  return null;
}

/**
 * True when the failure means "this model id no longer exists / has no
 * providers" — exactly the case a fallback can recover from.
 *
 * OpenRouter reports a retired model as HTTP 404 with "No endpoints found for
 * model <id>". Some OpenAI-compatible gateways surface it as a 400/422 naming
 * the model instead, so all of those are matched.
 */
export function isModelUnavailable(error: unknown, modelId: string): boolean {
  const status = statusOf(error);
  const body = error instanceof APICallError ? (error.responseBody ?? "") : "";
  const text = `${rawMessageOf(error)} ${body}`.toLowerCase();

  if (status === 404) return true;

  if (status === 400 || status === 422) {
    const mentionsModel = text.includes("model") || text.includes(modelId.toLowerCase());
    return (
      mentionsModel &&
      /not found|no endpoints|unsupported|does not exist|invalid model|unknown model|not a valid/.test(
        text,
      )
    );
  }

  return /no endpoints found|model not found|is not a valid model|unknown model|model .* (does not exist|is not available)/.test(
    text,
  );
}

/** Shown when both the selected model and the automatic fallback are down. */
export const BOTH_MODELS_FAILED_MESSAGE =
  "Both the selected model and the automatic fallback are unavailable right now. The free tier may be busy — please try again in a moment, or pick another model from the header.";
