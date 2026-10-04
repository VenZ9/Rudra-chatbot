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
