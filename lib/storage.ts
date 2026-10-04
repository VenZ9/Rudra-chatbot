import type { ChatMessage, Theme } from "@/types";

const HISTORY_KEY = "rudra-chat-history";
const THEME_KEY = "rudra-chat-theme";

/** Keep the transcript bounded so localStorage never fills up. */
const MAX_PERSISTED_MESSAGES = 60;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * Reads the saved transcript. Returns an empty array on any failure — private
 * mode, disabled storage, corrupt JSON — so the app always boots.
 */
export function loadHistory(): ChatMessage[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (m): m is ChatMessage =>
          !!m &&
          typeof m === "object" &&
          typeof (m as ChatMessage).content === "string" &&
          ((m as ChatMessage).role === "user" ||
            (m as ChatMessage).role === "assistant"),
      )
      .map((m) => ({
        id: typeof m.id === "string" ? m.id : crypto.randomUUID(),
        role: m.role,
        content: m.content,
      }));
  } catch {
    return [];
  }
}

/** Persists the transcript, silently ignoring quota / private-mode errors. */
export function saveHistory(messages: ChatMessage[]): void {
  if (!isBrowser()) return;
  try {
    const slim = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-MAX_PERSISTED_MESSAGES)
      .map((m) => ({ id: m.id, role: m.role, content: m.content }));
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(slim));
  } catch {
    /* quota exceeded or storage disabled — non-fatal */
  }
}

export function clearHistory(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(HISTORY_KEY);
  } catch {
    /* non-fatal */
  }
}

/** Reads the saved theme, defaulting to dark. */
export function loadTheme(): Theme {
  if (!isBrowser()) return "dark";
  try {
    const raw = window.localStorage.getItem(THEME_KEY);
    return raw === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function saveTheme(theme: Theme): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* non-fatal */
  }
}
