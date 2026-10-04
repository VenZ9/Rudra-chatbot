import { createOpenAI } from "@ai-sdk/openai";
import { convertToCoreMessages, createDataStreamResponse, streamText } from "ai";
import { BOTH_MODELS_FAILED_MESSAGE, friendlyError, isModelUnavailable, rawMessageOf, statusOf } from "@/lib/errors";
import { pickAvailableModel } from "@/lib/model-availability";
import { modelLabel } from "@/lib/models";
import { resolveFallbacks, resolveModel } from "@/lib/models.server";
import { resolveSystemPrompt } from "@/lib/system-prompt";

/**
 * Serverless route handler for the chat stream.
 *
 * The API key is read from process.env on the server only. It is never sent to
 * the browser, never embedded in the client bundle, and never echoed back in a
 * response body.
 *
 * ## Automatic model fallback
 *
 * Free OpenRouter model ids are retired without notice — the app's original
 * default (`google/gemma-2-9b-it:free`) no longer exists, which is exactly how
 * this broke once already. Before opening the stream the route asks OpenRouter
 * whether the requested model still has a live endpoint, and moves down the
 * fallback chain if it does not. The user is told through a
 * `message_annotation` part, so the swap is visible in the chat, not silent.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const REQUEST_TIMEOUT_MS = 45_000;
const MAX_MESSAGES = 100;
const MAX_MESSAGE_CHARS = 20_000;

/**
 * Validates the incoming transcript. Returns CoreMessage[] on success, or an
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
  const requestedModel = resolveModel(payload.model);
  const system = resolveSystemPrompt(payload.system);

  const attributionHeaders: Record<string, string> = {
    ...(process.env.OPENROUTER_SITE_URL ? { "HTTP-Referer": process.env.OPENROUTER_SITE_URL } : {}),
    ...(process.env.OPENROUTER_SITE_NAME ? { "X-Title": process.env.OPENROUTER_SITE_NAME } : {}),
  };

  const openrouter = createOpenAI({
    baseURL,
    apiKey,
    headers: attributionHeaders,
  });

  // Free models get retired upstream without notice. Probe first so a dead id
  // moves to a working fallback instead of surfacing an error to the user.
  const {
    model: modelId,
    fellBackFrom,
    allUnavailable,
  } = await pickAvailableModel(requestedModel, resolveFallbacks(requestedModel), {
    baseURL,
    apiKey,
    headers: attributionHeaders,
  });

  // Every model in the chain is gone. Report it now: a provider failure arrives
  // inside the stream as an error part, so failing here is the only chance to
  // give the user one clear, accurate message.
  if (allUnavailable) {
    return new Response(BOTH_MODELS_FAILED_MESSAGE, {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

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

    // A plain toDataStreamResponse() cannot carry extra data, so wrap the stream
    // to emit the fallback notice alongside the tokens. The client reads it off
    // the message's `annotations` and shows a small inline notice.
    return createDataStreamResponse({
      execute: (dataStream) => {
        if (fellBackFrom) {
          dataStream.writeMessageAnnotation({
            type: "model-fallback",
            from: modelLabel(fellBackFrom),
            to: modelLabel(modelId),
            message: `${modelLabel(fellBackFrom)} is no longer available on OpenRouter, so this reply is coming from ${modelLabel(modelId)} instead.`,
          });
        }
        result.mergeIntoDataStream(dataStream);
      },
      onError: (error) => {
        const status = statusOf(error);
        if (status === undefined && error instanceof Error && error.name === "TimeoutError") {
          return "The request timed out. The free model may be busy — please try again.";
        }
        // We already swapped models once and the replacement failed the same way:
        // say so plainly instead of blaming only the replacement.
        if (fellBackFrom && isModelUnavailable(error, modelId)) {
          return BOTH_MODELS_FAILED_MESSAGE;
        }
        return friendlyError(status, rawMessageOf(error));
      },
    });
  } catch (error) {
    const status = statusOf(error);

    // Everything in the chain is down — say so plainly rather than leaking a
    // raw provider message.
    if (fellBackFrom) {
      return new Response(BOTH_MODELS_FAILED_MESSAGE, {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    return new Response(friendlyError(status, rawMessageOf(error)), {
      status: status && status >= 400 && status < 600 ? status : 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
