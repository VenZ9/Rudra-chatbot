import type { ModelOption } from "@/types";

/**
 * Models offered in the header pill. All are free-tier OpenRouter models, so
 * the app works without billing. Add or remove entries freely — the API route
 * validates against this list, so an unknown id is rejected server-side.
 */
export const MODELS: ModelOption[] = [
  { id: "google/gemma-2-9b-it:free", label: "gemma-2-9b-it:free" },
  { id: "meta-llama/llama-3.1-8b-instruct:free", label: "llama-3.1-8b:free" },
  { id: "mistralai/mistral-7b-instruct:free", label: "mistral-7b:free" },
  { id: "qwen/qwen-2.5-7b-instruct:free", label: "qwen-2.5-7b:free" },
];

/** Default model, overridable with the OPENROUTER_MODEL env var. */
export const DEFAULT_MODEL = "google/gemma-2-9b-it:free";

/** The model the server will actually use for a request. */
export function resolveModel(candidate: unknown): string {
  const envModel = process.env.OPENROUTER_MODEL?.trim();
  if (typeof candidate === "string" && MODELS.some((m) => m.id === candidate)) {
    return candidate;
  }
  if (envModel) return envModel;
  return DEFAULT_MODEL;
}

/** Short label for the header pill. */
export function modelLabel(id: string): string {
  return MODELS.find((m) => m.id === id)?.label ?? id;
}
