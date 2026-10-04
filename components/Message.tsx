"use client";

import { Markdown } from "./Markdown";
import { SparkIcon } from "./icons";

interface MessageProps {
  role: "user" | "assistant";
  content: string;
  /** Shows the blinking caret while tokens are still arriving. */
  streaming?: boolean;
}

/** Escapes user text and preserves newlines, matching the reference exactly. */
function renderUserText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

export function Message({ role, content, streaming = false }: MessageProps) {
  const isUser = role === "user";

  return (
    <div className={`msg ${isUser ? "user" : "assistant"}`}>
      <div className="avatar">{isUser ? "U" : <SparkIcon />}</div>
      <div className="msg-body">
        {isUser ? (
          <div dangerouslySetInnerHTML={{ __html: renderUserText(content) }} />
        ) : (
          <div className="prose">
            <Markdown content={content} />
            {streaming ? <span className="cursor" /> : null}
          </div>
        )}
      </div>
    </div>
  );
}
