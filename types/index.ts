/** Shared types for the Rudra Chatbot UI. */

export type ChatRole = "user" | "assistant" | "system";

/** A single message as rendered in the transcript. */
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

/** A clickable starter prompt shown on the empty state. */
export interface Suggestion {
  /** Bold heading, e.g. "Write code". */
  title: string;
  /** Muted one-liner under the heading. */
  subtitle: string;
  /** The text actually sent when the card is clicked. */
  prompt: string;
}

/** A selectable model entry shown in the header pill. */
export interface ModelOption {
  id: string;
  label: string;
}

export type Theme = "dark" | "light";

/**
 * Sent by the server as a message annotation when the selected model was
 * unavailable and the automatic fallback was used instead. Rendered in the
 * chat so the swap is visible rather than silent.
 */
export type ModelFallbackNotice = {
  type: "model-fallback";
  /** The model the request asked for. */
  from: string;
  /** The model that actually answered. */
  to: string;
  /** Human-readable explanation shown in the chat. */
  message: string;
  reason?: "model-unavailable";
};

/**
 * Type guard for annotations that arrive as untyped JSON.
 *
 * `ModelFallbackNotice` is deliberately a type alias rather than an interface:
 * an interface has no implicit index signature, so it is not assignable to the
 * AI SDK's recursive `JSONValue`, and `Array.find` would silently fall back to
 * its non-narrowing overload.
 */
export function isModelFallbackNotice(value: unknown): value is ModelFallbackNotice {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<ModelFallbackNotice>;
  return (
    v.type === "model-fallback" &&
    typeof v.from === "string" &&
    typeof v.to === "string" &&
    typeof v.message === "string"
  );
}


