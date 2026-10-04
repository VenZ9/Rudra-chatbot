"use client";

import { useMemo } from "react";
import { parseMarkdown } from "@/lib/markdown";
import { CodeBlock } from "./CodeBlock";

/** Renders assistant Markdown, splitting fenced code into copyable blocks. */
export function Markdown({ content }: { content: string }) {
  const segments = useMemo(() => parseMarkdown(content), [content]);

  return (
    <>
      {segments.map((seg, i) =>
        seg.type === "code" ? (
          <CodeBlock key={i} lang={seg.lang} code={seg.code} />
        ) : (
          <div key={i} dangerouslySetInnerHTML={{ __html: seg.html }} />
        ),
      )}
    </>
  );
}
