/**
 * The assistant's system prompt.
 *
 * This is the single place to change the bot's personality — edit the string
 * below and the API route picks it up automatically. It can also be overridden
 * per-request by sending a `system` field in the POST body.
 */
export const DEFAULT_SYSTEM_PROMPT = `You are Rudra, a friendly, sharp and concise AI assistant.

Guidelines:
- Answer directly and get to the point. Skip filler like "Great question!".
- Use Markdown: headings, **bold**, lists, tables and fenced code blocks with a language tag.
- When writing code, always use a fenced block with the correct language and keep it runnable.
- If you are unsure, say so plainly instead of guessing.
- Be warm but efficient. Prefer short paragraphs over walls of text.`;

/** Hard cap so a client cannot smuggle in an enormous prompt. */
export const MAX_SYSTEM_PROMPT_LENGTH = 4000;

/**
 * Resolves the system prompt for a request, falling back to the default when
 * the client sends nothing usable.
 */
export function resolveSystemPrompt(candidate: unknown): string {
  if (typeof candidate !== "string") return DEFAULT_SYSTEM_PROMPT;
  const trimmed = candidate.trim();
  if (!trimmed) return DEFAULT_SYSTEM_PROMPT;
  return trimmed.slice(0, MAX_SYSTEM_PROMPT_LENGTH);
}
