import { createOpenAI } from "@ai-sdk/openai";
import { convertToCoreMessages, streamText } from "ai";
import { resolveModel } from "@/lib/models";
import { resolveSystemPrompt } from "@/lib/system-prompt";

/**
 * Serverless route handler for the chat stream.
 *
 * The API key is read from process.env on the server only. It is never sent to
 * the browser, never embedded in the client bundle, and never echoed back in a
 * response body.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const REQUEST_TIMEOUT_MS = 45_000;
const MAX_MESSAGES = 100;
const MAX_MESSAGE_CHARS = 20_000;

/** Maps a provider failure onto a short, human message for the chat UI. */
function friendlyError(status: number | undefined, raw: string): string {
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
function classifyByMessage(raw: string): string | null {
  const t = raw.toLowerCase();
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

/** Pulls an HTTP status off whatever shape the provider threw. */
function statusOf(error: unknown): number | undefined {
  if (error && typeof error === "object") {
    const e = error as {
      statusCode?: unknown;
      status?: unknown;
      cause?: unknown;
      lastError?: unknown;
    };
    if (typeof e.statusCode === "number") return e.statusCode;
    if (typeof e.status === "number") return e.status;
    // The retry wrapper nests the real failure here.
    if (e.lastError) {
      const nested = statusOf(e.lastError);
      if (nested !== undefined) return nested;
    }
    if (e.cause) return statusOf(e.cause);
  }
  return undefined;
}

function rawMessageOf(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string") return error;
  return "";
}

/**
 * Validates the incoming transcript. Returns a CoreMessage[] on success or an
 * error string describing what was wrong.
 */
function parseMessages(
  input: unknown,
): { ok: true; messages: ReturnType<typeof convertToCoreMessages> } | { ok: false; error: string } {
  if (!Array.isArray(input)) {
    return { ok: false, error: "Request body must include a `messages` array." };
  }
  if (input.length === 0) {
    return { ok: false, error: "No messages were sent." };
  }
  if (input.length > MAX_MESSAGES) {
    return { ok: false, error: `Too many messages (max ${MAX_MESSAGES}). Clear the chat and try again.` };
  }

  for (const m of input) {
    if (!m || typeof m !== "object") {
      return { ok: false, error: "Each message must be an object." };
    }
    const msg = m as { role?: unknown; content?: unknown };
    if (msg.role !== "user" && msg.role !== "assistant" && msg.role !== "system") {
      return { ok: false, error: "Each message needs a valid role." };
    }
    if (typeof msg.content !== "string") {
      return { ok: false, error: "Each message needs string content." };
    }
    if (msg.content.length > MAX_MESSAGE_CHARS) {
      return { ok: false, error: "That message is too long. Please shorten it and try again." };
    }
  }

  return { ok: true, messages: convertToCoreMessages(input as never) };
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();

  if (!apiKey) {
    return new Response(
      "No API key configured. Add OPENROUTER_API_KEY to your environment (see .env.local.example) and restart.",
      { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("Request body was not valid JSON.", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const payload = (body ?? {}) as { messages?: unknown; system?: unknown; model?: unknown };
  const parsed = parseMessages(payload.messages);
  if (!parsed.ok) {
    return new Response(parsed.error, {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const baseURL = process.env.OPENROUTER_BASE_URL?.trim() || DEFAULT_BASE_URL;
  const modelId = resolveModel(payload.model);
  const system = resolveSystemPrompt(payload.system);

  const openrouter = createOpenAI({
    baseURL,
    apiKey,
    headers: {
      ...(process.env.OPENROUTER_SITE_URL
        ? { "HTTP-Referer": process.env.OPENROUTER_SITE_URL }
        : {}),
      ...(process.env.OPENROUTER_SITE_NAME
        ? { "X-Title": process.env.OPENROUTER_SITE_NAME }
        : {}),
    },
  });

  // Abort if the client disconnects (Stop button) or the provider stalls.
  const abortSignal = AbortSignal.any([req.signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]);

  try {
    const result = streamText({
      model: openrouter.chat(modelId),
      system,
      messages: parsed.messages,
      temperature: 0.7,
      maxTokens: 2048,
      abortSignal,
    });

    return result.toDataStreamResponse({
      getErrorMessage: (error) => {
        const status = statusOf(error);
        if (status === undefined && error instanceof Error && error.name === "TimeoutError") {
          return "The request timed out. The free model may be busy — please try again.";
        }
        return friendlyError(status, rawMessageOf(error));
      },
    });
  } catch (error) {
    const status = statusOf(error);
    return new Response(friendlyError(status, rawMessageOf(error)), {
      status: status && status >= 400 && status < 600 ? status : 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
