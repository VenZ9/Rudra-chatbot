"use client";

import { useCallback, useEffect, useRef } from "react";
import { SendIcon, StopIcon } from "./icons";

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  isLoading: boolean;
}

const MAX_HEIGHT_PX = 180;

export function Composer({ value, onChange, onSubmit, onStop, isLoading }: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Grow the textarea with its content, up to the reference's 180px cap.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, [value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSubmit();
      }
    },
    [onSubmit],
  );

  const canSend = value.trim().length > 0 && !isLoading;

  return (
    <footer className="footer">
      <div className="composer-inner">
        <div className="composer">
          <textarea
            ref={textareaRef}
            className="composer-input"
            rows={1}
            value={value}
            placeholder="Message Rudra Chatbot..."
            aria-label="Message"
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          {/* Decorative watermark — never intercepts pointer events. */}
          <span className="watermark" aria-hidden="true">
            Built with Rudra
          </span>

          <button
            type="button"
            className={`send-btn${isLoading ? " hidden" : ""}`}
            onClick={onSubmit}
            disabled={!canSend}
            title="Send"
            aria-label="Send message"
          >
            <SendIcon />
          </button>

          <button
            type="button"
            className={`stop-btn${isLoading ? "" : " hidden"}`}
            onClick={onStop}
            title="Stop generating"
            aria-label="Stop generating"
          >
            <StopIcon />
          </button>
        </div>
        <div className="hint">Enter to send · Shift + Enter for new line</div>
      </div>
    </footer>
  );
}
