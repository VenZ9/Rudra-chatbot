/**
 * A small, dependency-free Markdown renderer.
 *
 * Ported from the reference implementation so the output HTML — and therefore
 * the rendered result — matches it exactly. Fenced code blocks are split out as
 * their own segments so they can be rendered as React components with a working
 * copy button, rather than as raw HTML.
 */

export type Segment =
  | { type: "html"; html: string }
  | { type: "code"; lang: string; code: string };

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Runs the block + inline pipeline over a stretch of non-code text. */
function renderTextBlock(src: string): string {
  let text = escapeHtml(src);

  // Blockquotes
  text = text.replace(/^&gt; (.*)$/gm, "<blockquote>$1</blockquote>");

  // Headings
  text = text.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  text = text.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  text = text.replace(/^# (.*)$/gm, "<h1>$1</h1>");

  // Unordered lists
  text = text.replace(/(?:^|\n)((?:[-*] .+(?:\n|$))+)/g, (_m, blk: string) => {
    const items = blk
      .trim()
      .split("\n")
      .map((l) => "<li>" + l.replace(/^[-*] /, "") + "</li>")
      .join("");
    return "\n<ul>" + items + "</ul>\n";
  });

  // Ordered lists
  text = text.replace(/(?:^|\n)((?:\d+\. .+(?:\n|$))+)/g, (_m, blk: string) => {
    const items = blk
      .trim()
      .split("\n")
      .map((l) => "<li>" + l.replace(/^\d+\. /, "") + "</li>")
      .join("");
    return "\n<ol>" + items + "</ol>\n";
  });

  // Inline formatting
  text = text.replace(/`([^`\n]+)`/g, '<code class="inline">$1</code>');
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  text = text.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );

  // Paragraphs
  text = text
    .split(/\n{2,}/)
    .map((p) => {
      const t = p.trim();
      if (!t) return "";
      if (/^<(h[123]|ul|ol|blockquote|pre)/.test(t)) return t;
      return "<p>" + t.replace(/\n/g, "<br>") + "</p>";
    })
    .join("");

  return text;
}

/** Splits a Markdown string into renderable segments. */
export function parseMarkdown(src: string): Segment[] {
  const segments: Segment[] = [];
  const fence = /```(\w*)\n?([\s\S]*?)```/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = fence.exec(src)) !== null) {
    if (match.index > last) {
      const html = renderTextBlock(src.slice(last, match.index));
      if (html) segments.push({ type: "html", html });
    }
    segments.push({
      type: "code",
      lang: match[1] || "text",
      code: match[2].replace(/\n$/, ""),
    });
    last = match.index + match[0].length;
  }

  if (last < src.length) {
    const html = renderTextBlock(src.slice(last));
    if (html) segments.push({ type: "html", html });
  }

  return segments;
}
