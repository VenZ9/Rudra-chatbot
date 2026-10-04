"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import type { Message as AIMessage } from "ai";
import { Composer } from "./Composer";
import { Header } from "./Header";
import { MessageList } from "./MessageList";
import { DEFAULT_MODEL } from "@/lib/models";
import { clearHistory, loadHistory, loadTheme, saveHistory, saveTheme } from "@/lib/storage";
import type { ChatMessage, ModelFallbackNotice, Theme } from "@/types";
import { isModelFallbackNotice } from "@/types";

/** Narrows an AI SDK message down to what we persist. */
function toStored(m: AIMessage): ChatMessage | null {
  if (m.role !== "user" && m.role !== "assistant") return null;
  return {
    id: m.id,
    role: m.role,
    content: typeof m.content === "string" ? m.content : "",
  };
}

interface ChatSessionProps {
  model: string;
  onModelChange: (model: string) => void;
  theme: Theme;
  onToggleTheme: () => void;
  /** Clears storage and remounts the session. */
  onClear: () => void;
  initialMessages: AIMessage[];
}

/**
 * One chat session. Remounted (via `key`) whenever the user clears the chat,
 * which is what resets `useChat`'s internal error state — the hook exposes no
 * setter for it, so a remount is the correct way to drop a stale error banner.
 */
function ChatSession({
  model,
  onModelChange,
  theme,
  onToggleTheme,
  onClear,
  initialMessages,
}: ChatSessionProps) {
  const [input, setInput] = useState("");
  const messagesRef = useRef<AIMessage[]>([]);

  // Set when the server had to move off the requested model because it was
  // retired upstream. Cleared whenever the user picks a different model.
  const [fallbackNotice, setFallbackNotice] = useState<ModelFallbackNotice | null>(null);

  const persist = useCallback(() => {
    const stored = messagesRef.current
      .map(toStored)
      .filter((m): m is ChatMessage => m !== null);
    saveHistory(stored);
  }, []);

  const { messages, append, isLoading, error, stop } = useChat({
    api: "/api/chat",
    initialMessages,
    // Sent with every request; the route validates the model server-side.
    body: { model },
    // Coalesce token updates so long replies don't re-render on every chunk.
    experimental_throttle: 50,
    onFinish: () => {
      persist();
    },
  });

  // Keep the ref current, and persist whenever a generation settles. This is
  // the reliable save point — `onFinish` can fire before the final message has
  // landed in state.
  useEffect(() => {
    messagesRef.current = messages;
    if (!isLoading) persist();
  }, [messages, isLoading, persist]);

  // The route attaches a `model-fallback` annotation to the assistant message
  // when it swaps models. Read it so the user is told why the reply isn't from
  // the model they picked.
  useEffect(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const anns = messages[i].annotations as unknown[] | undefined;
      if (!anns?.length) continue;
      const hit = anns.find(isModelFallbackNotice);
      if (hit) {
        setFallbackNotice(hit);
        return;
      }
    }
  }, [messages]);

  // Choosing a different model invalidates any previous fallback notice.
  useEffect(() => {
    setFallbackNotice(null);
  }, [model]);

  const submit = useCallback(
    (text?: string) => {
      const value = (text ?? input).trim();
      if (!value || isLoading) return;
      setInput("");
      void append({ role: "user", content: value });
    },
    [append, input, isLoading],
  );

  const handleClear = useCallback(() => {
    if (isLoading) stop();
    onClear();
  }, [isLoading, stop, onClear]);

  return (
    <>
      <Header
        model={model}
        onModelChange={onModelChange}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onClear={handleClear}
        canClear={messages.length > 0}
      />

      <MessageList
        messages={messages}
        isLoading={isLoading}
        error={error}
        onSuggestion={submit}
        notice={fallbackNotice}
      />

      <Composer
        value={input}
        onChange={setInput}
        onSubmit={() => submit()}
        onStop={stop}
        isLoading={isLoading}
      />
    </>
  );
}

/**
 * The chat application. Mounted only on the client so the persisted transcript
 * can be read from localStorage before `useChat` initialises — that keeps
 * `initialMessages` correct and avoids a hydration mismatch.
 */
export function ChatApp() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [model, setModel] = useState<string>(DEFAULT_MODEL);
  const [sessionKey, setSessionKey] = useState(0);

  // Re-read on every new session so a cleared chat starts genuinely empty.
  // `sessionKey` is the intended trigger, not a stale dependency.
  const initialMessages = useMemo<AIMessage[]>(
    () =>
      loadHistory().map((m) => ({
        id: m.id,
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionKey],
  );

  // Theme: read the saved value on mount, then keep <html> and storage in sync.
  useEffect(() => {
    setTheme(loadTheme());
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    saveTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  const handleClear = useCallback(() => {
    clearHistory();
    setSessionKey((k) => k + 1);
  }, []);

  return (
    <div className="app">
      <ChatSession
        key={sessionKey}
        model={model}
        onModelChange={setModel}
        theme={theme}
        onToggleTheme={toggleTheme}
        onClear={handleClear}
        initialMessages={initialMessages}
      />
    </div>
  );
}
