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

    /**
     * Legacy fallback. Used when the async Clipboard API is unavailable OR its
     * permission is denied — an unfocused window, a non-secure context, and
     * headless browsers all reject `writeText`, so rejecting is just as
     * important to handle as the API being missing.
     */
    const legacyCopy = () => {
      const ta = document.createElement("textarea");
      ta.value = code;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-9999px";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      document.body.removeChild(ta);
      return ok;
    };

    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
        ok = true;
      }
    } catch {
      ok = false;
    }
    if (!ok) ok = legacyCopy();

    setState(ok ? "copied" : "failed");
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
