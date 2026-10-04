"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import type { Message as AIMessage } from "ai";
import { Composer } from "./Composer";
import { Header } from "./Header";
import { MessageList } from "./MessageList";
import { DEFAULT_MODEL } from "@/lib/models";
import { clearHistory, loadHistory, loadTheme, saveHistory, saveTheme } from "@/lib/storage";
import type { ChatMessage, Theme } from "@/types";

/** Narrows an AI SDK message down to what we persist. */
function toStored(m: AIMessage): ChatMessage | null {
  if (m.role !== "user" && m.role !== "assistant") return null;
  return {
    id: m.id,
    role: m.role,
    content: typeof m.content === "string" ? m.content : "",
  };
}

/**
 * The chat application. Mounted only on the client so the persisted transcript
 * can be read from localStorage before `useChat` initialises — that keeps
 * `initialMessages` correct and avoids a hydration mismatch.
 */
export function ChatApp() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [model, setModel] = useState<string>(DEFAULT_MODEL);
  const [input, setInput] = useState("");

  // Read once, on mount. `useChat` only consumes initialMessages on first render.
  const initialMessages = useMemo<AIMessage[]>(() => {
    return loadHistory().map((m) => ({
      id: m.id,
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));
  }, []);

  const messagesRef = useRef<AIMessage[]>([]);

  const persist = useCallback(() => {
    const stored = messagesRef.current
      .map(toStored)
      .filter((m): m is ChatMessage => m !== null);
    saveHistory(stored);
  }, []);

  const { messages, append, setMessages, isLoading, error, stop } = useChat({
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
    setMessages([]);
    messagesRef.current = [];
    clearHistory();
  }, [isLoading, setMessages, stop]);

  return (
    <div className="app">
      <Header
        model={model}
        onModelChange={setModel}
        theme={theme}
        onToggleTheme={toggleTheme}
        onClear={handleClear}
        canClear={messages.length > 0}
      />

      <MessageList
        messages={messages}
        isLoading={isLoading}
        error={error}
        onSuggestion={submit}
      />

      <Composer
        value={input}
        onChange={setInput}
        onSubmit={() => submit()}
        onStop={stop}
        isLoading={isLoading}
      />
    </div>
  );
}
