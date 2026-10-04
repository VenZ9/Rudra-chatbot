"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { escapeHtml } from "@/lib/markdown";

interface CodeBlockProps {
  lang: string;
  code: string;
}

type CopyState = "idle" | "copied" | "failed";

export function CodeBlock({ lang, code }: CodeBlockProps) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const copy = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        // Fallback for non-secure contexts where the Clipboard API is absent.
        const ta = document.createElement("textarea");
        ta.value = code;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (!ok) throw new Error("copy failed");
      }
      setState("copied");
    } catch {
      setState("failed");
    }
    timer.current = setTimeout(() => setState("idle"), 1600);
  }, [code]);

  return (
    <div className="code-block">
      <div className="code-head">
        <span>{lang}</span>
        <button
          type="button"
          className={`copy-btn${state === "copied" ? " copied" : ""}`}
          onClick={copy}
          aria-label={`Copy ${lang} code`}
        >
          {state === "copied" ? "Copied!" : state === "failed" ? "Failed" : "Copy"}
        </button>
      </div>
      <pre>
        <code dangerouslySetInnerHTML={{ __html: escapeHtml(code) }} />
      </pre>
    </div>
  );
}
