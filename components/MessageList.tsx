"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Message as AIMessage } from "ai";
import { EmptyState } from "./EmptyState";
import { Message } from "./Message";
import { ScrollToBottomButton } from "./ScrollToBottomButton";
import { TypingDots } from "./TypingDots";
import { SparkIcon } from "./icons";

interface MessageListProps {
  messages: AIMessage[];
  isLoading: boolean;
  error?: Error;
  onSuggestion: (prompt: string) => void;
}

/** Distance from the bottom (px) still considered "at the bottom". */
const NEAR_BOTTOM_PX = 140;

function textOf(message: AIMessage): string {
  return typeof message.content === "string" ? message.content : "";
}

export function MessageList({ messages, isLoading, error, onSuggestion }: MessageListProps) {
  const scrollRef = useRef<HTMLElement | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const isNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollRef.current;
    if (!el) return;
    if (smooth) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  // Follow the stream, but only while the user is already at the bottom —
  // scrolling up to read must not be yanked back down.
  useEffect(() => {
    if (isNearBottom()) scrollToBottom(false);
  }, [messages, isLoading, isNearBottom, scrollToBottom]);

  const handleScroll = useCallback(() => {
    setShowScrollBtn(!isNearBottom() && messages.length > 0);
  }, [isNearBottom, messages.length]);

  const last = messages[messages.length - 1];
  const lastIsAssistant = last?.role === "assistant";
  const lastText = last ? textOf(last) : "";

  // Dots while we wait for the first token; caret once text is flowing.
  const showTyping = isLoading && (!lastIsAssistant || lastText.length === 0);
  const streamingId = isLoading && lastIsAssistant && lastText.length > 0 ? last.id : null;

  return (
    <>
      <main className="messages" ref={scrollRef} onScroll={handleScroll}>
        <div className="messages-inner">
          {messages.length === 0 && !error ? (
            <EmptyState onSuggestion={onSuggestion} />
          ) : (
            <>
              {messages.map((m) => (
                <Message
                  key={m.id}
                  role={m.role === "user" ? "user" : "assistant"}
                  content={textOf(m)}
                  streaming={m.id === streamingId}
                />
              ))}

              {showTyping ? (
                <div className="msg assistant">
                  <div className="avatar">
                    <SparkIcon />
                  </div>
                  <div className="msg-body">
                    <TypingDots />
                  </div>
                </div>
              ) : null}

              {error ? (
                <div className="msg assistant">
                  <div className="avatar">
                    <SparkIcon />
                  </div>
                  <div className="msg-body">
                    <div className="prose">
                      <p>
                        <strong>Something went wrong.</strong>
                      </p>
                      <p>{error.message || "Please try again."}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </main>

      <ScrollToBottomButton visible={showScrollBtn} onClick={() => scrollToBottom()} />
    </>
  );
}
