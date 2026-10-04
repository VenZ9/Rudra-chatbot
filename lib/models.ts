import type { ModelOption } from "@/types";

/**
 * Free OpenRouter models offered in the header pill.
 *
 * Every id here was verified against the live catalog at
 * https://openrouter.ai/api/v1/models — see README "Choosing a free model"
 * for the ranking data (structured outputs, context window, p50 throughput,
 * p50 latency, provider count).
 *
 * This module is imported by client components, so it MUST stay free of
 * `process.env` reads. Anything that touches the environment lives in
 * `lib/models.server.ts`.
 *
 * ⚠️ Free model ids are retired regularly. If a batch stops working, re-run
 * `node scripts/check-models.mjs` rather than editing entries blind.
 */
export const MODELS: ModelOption[] = [
  { id: "google/gemma-4-26b-a4b-it:free", label: "gemma-4-26b:free" },
  { id: "nvidia/nemotron-3-super-120b-a12b:free", label: "nemotron-3-super:free" },
  { id: "qwen/qwen3.8-27b:free", label: "qwen3.8-27b:free" },
  { id: "google/gemma-4-31b-it:free", label: "gemma-4-31b:free" },
];

/**
 * Primary default. Picked on measured signals, not vibes:
 *  - 14 upstream providers (most redundant of the finalists ⇒ best uptime odds)
 *  - 100% observed uptime, p50 latency 1.09 s
 *  - 262 144-token context
 *  - supports tools + response_format, and reasoning is OFF by default
 *    (`default_enabled: false`) so the first token arrives fast.
 */
export const DEFAULT_MODEL = "google/gemma-4-26b-a4b-it:free";

/**
 * Used automatically when the primary model is unavailable (retired id,
 * "No endpoints found", 404). Chosen as the strongest model that supports the
 * full feature set we need — `structured_outputs`, `response_format` and
 * `tools` — with a 262 144-token context and 235 929 max output tokens.
 */
export const FALLBACK_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";

/** Short label for the header pill. */
export function modelLabel(id: string): string {
  return MODELS.find((m) => m.id === id)?.label ?? id;
}
