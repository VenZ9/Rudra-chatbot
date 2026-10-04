# Rudra Chatbot

A polished, streaming AI chat interface built with **Next.js (App Router)**, **TypeScript**, the **Vercel AI SDK**, and **Tailwind CSS**. It works with any OpenAI-compatible endpoint and defaults to **OpenRouter** on a free-tier model.

The API key lives on the server only — it is never sent to the browser.

---

## Features

- **Real token streaming** — responses appear as they are generated.
- **Secure serverless route** — `app/api/chat/route.ts` holds the key; the client never sees it.
- **Markdown rendering** — headings, bold, italics, lists, blockquotes, links, inline code.
- **Code blocks** — language label plus a copy-to-clipboard button.
- **Stop generation** — cancels the stream mid-flight.
- **Typing indicator** — animated dots while waiting for the first token, then a blinking caret.
- **Configurable system prompt** — edit one string in `lib/system-prompt.ts`.
- **Graceful errors** — friendly in-chat messages for 401/402/404/429/5xx and timeouts.
- **Persistent history** — the transcript survives a refresh via `localStorage`.
- **Dark / light theme** — toggle in the header, persisted, applied before first paint (no flash).
- **Model switcher** — pick from several free OpenRouter models in the header.
- **Automatic model fallback** — if a model is retired upstream, the server detects it and moves to a working free model instead of erroring.
- **Responsive** — mobile-first, with a desktop layout at wider breakpoints.

---

## Quick start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.local.example .env.local
#    then edit .env.local and paste your key

# 3. Run
npm run dev
```

Open <http://localhost:3000>.

### Getting a free API key

1. Go to <https://openrouter.ai/keys>
2. Sign in and click **Create Key**
3. Copy it into `.env.local` as `OPENROUTER_API_KEY`

The default model, `google/gemma-4-26b-a4b-it:free`, is free to use — no credits required.

---

## Free models

Every model below was verified against the **live** OpenRouter catalog on **2026-10-04**. Each
one reports `pricing.prompt = "0"` and `pricing.completion = "0"` — genuinely free, no credits
required.

| Model id | Context | Max output | Structured | In the picker |
| --- | --- | --- | --- | --- | --- |
| `google/gemma-4-26b-a4b-it:free` | 262 144 | 32 768 | `response_format` | **default** |
| `nvidia/nemotron-3-super-120b-a12b:free` | 262 144 | 235 929 | `structured_outputs` + `response_format` + `tools` | **fallback** |
| `qwen/qwen3.8-27b:free` | 262 144 | 235 929 | `structured_outputs` + `tools` | ✅ |
| `google/gemma-4-31b-it:free` | 262 144 | 32 768 | `response_format` | ✅ |

None of the four carries an `expiration_date`, so none is on a scheduled retirement notice today.
Run `npm run check:models` to re-verify the whole roster in one request.

### Why `google/gemma-4-26b-a4b-it:free` is the default

- **Fast.** It is a mixture-of-experts model with roughly 4B active parameters, so it starts
  answering quickly. On its model page it measured a **p50 latency of ~1.09 s** with **100 %
  uptime** over the 30-minute window when this was checked — the lowest latency of the finalists.
- **Streams immediately.** It does **not** use a reasoning mode, so the first token reaches the
  UI right away instead of being held back behind invisible thinking. In a chat UI this matters
  more than raw benchmark score.
- **Free** — `pricing.prompt` and `pricing.completion` are both `"0"`.
- **262 144-token context**, far beyond what a chat session needs.

### Why `nvidia/nemotron-3-super-120b-a12b:free` is the fallback

It is the most **capable** of the four, not the fastest:

- Supports `structured_outputs`, `response_format` **and** `tools` — a superset of what the
  default offers, so any request the default could serve, this can too.
- **235 929 max output tokens** against the default's 32 768, so a very long answer cannot be
  truncated by the fallback.
- Same 262 144-token context.

Being a reasoning-capable model it can be slower to first token, which is exactly why it is the
fallback rather than the default: speed for the common case, headroom for the rare one.

### Automatic fallback

Free models on OpenRouter come and go. The previous default, `google/gemma-2-9b-it:free`,
was itself retired upstream — which is exactly why this behaviour exists.

Before opening the stream, `app/api/chat/route.ts` asks OpenRouter whether the requested model
still has a live endpoint (`lib/model-availability.ts`). If it does not, the route moves down the
fallback chain, streams from the first working model, and pushes a notice into the chat so the
user can see the reply is not from the model they picked.

**How "retired" is detected.** This is subtler than it looks, and getting it wrong silently
disables the entire fallback. A retired model does **not** return 404 from
`/api/v1/models/<id>/endpoints` — it returns **HTTP 200 with `endpoints: []`**. Only a completely
unknown id returns 404. So the check treats a model as unavailable when *either* is true:

- the listing returns **404**, or
- the listing returns **200 with an empty `endpoints` array**.

Everything else is treated as available. A timeout, a network error, a rate limit or a 5xx means
the *lookup* failed, not that the model is gone — and a broken probe must never be the reason a
user gets no answer. Decisions are memoised per serverless instance for 5 minutes.

If every model in the chain is unavailable, the route answers `503` immediately with one clear
message rather than opening a request that is certain to fail. That matters because a provider
error surfaces *inside* the stream as an error part rather than as a thrown exception, so it
could never be caught downstream.

To re-verify the free roster at any time, use the bundled script:

```bash
npm run check:models
```

---

## Environment variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `OPENROUTER_API_KEY` | **Yes** | — | Your OpenRouter key. Server-side only. |
| `OPENROUTER_BASE_URL` | No | `https://openrouter.ai/api/v1` | Point at any OpenAI-compatible endpoint. |
| `OPENROUTER_MODEL` | No | `google/gemma-4-26b-a4b-it:free` | Overrides the default model. |
| `OPENROUTER_FALLBACK_MODEL` | No | `nvidia/nemotron-3-super-120b-a12b:free` | Tried first if the model above is unavailable. |
| `OPENROUTER_SITE_URL` | No | — | Sent as `HTTP-Referer` for OpenRouter attribution. |
| `OPENROUTER_SITE_NAME` | No | — | Sent as `X-Title` for OpenRouter attribution. |

Only `OPENROUTER_API_KEY` is needed to run the app.

---

## Deploy to Vercel

1. Push this repository to GitHub.
2. Go to <https://vercel.com/new> and **import the repository**.
3. Vercel detects Next.js automatically — leave the build settings as they are.
4. **Add the environment variable** before deploying:
   - Open **Project → Settings → Environment Variables**
   - Add `OPENROUTER_API_KEY` with your key
   - Apply it to **Production**, **Preview**, and **Development**
5. Click **Deploy**.

> **Important:** the app will build and load without the key, but every message will return a friendly "No API key configured" error until `OPENROUTER_API_KEY` is set in Vercel's project settings. Adding it after the first deploy requires a redeploy to take effect.

No `vercel.json` is needed, and there is no custom server, database, or paid service.

---

## Project structure

```
app/
  api/chat/route.ts     Serverless streaming endpoint (holds the key)
  globals.css           Design tokens, keyframes, prose + code styles
  layout.tsx            Root layout, metadata, theme bootstrap
  page.tsx              Client-only entry point
components/
  ChatApp.tsx           Wires useChat, theme, persistence
  Header.tsx            Brand, model switcher, theme + clear buttons
  MessageList.tsx       Transcript, auto-scroll, typing + error states
  Message.tsx           A single user/assistant bubble
  Markdown.tsx          Markdown → React
  CodeBlock.tsx         Code block with copy button
  Composer.tsx          Input, send/stop, watermark
  EmptyState.tsx        Hero + suggestion cards
  SuggestionCard.tsx    One starter prompt
  ScrollToBottomButton.tsx
  TypingDots.tsx
  icons.tsx             Inline SVG icons
lib/
  markdown.ts           Dependency-free Markdown parser
  models.ts             Free-model roster (client-safe: no env reads)
  models.server.ts      Server-only model resolution + fallback chain
  model-availability.ts Server-side probe that detects retired models
  errors.ts             Status extraction + friendly error messages
  storage.ts            localStorage helpers (history + theme)
  suggestions.ts        Starter prompts
  system-prompt.ts      The assistant's personality
scripts/
  check-models.mjs      Verifies the free roster against the live catalog
types/
  index.ts              Shared types
```

---

## Customising

**Change the personality** — edit `DEFAULT_SYSTEM_PROMPT` in `lib/system-prompt.ts`.

**Add a model** — add an entry to `MODELS` in `lib/models.ts` (client-safe, so keep `process.env` out of it). The API route validates against this list, so unknown ids are rejected server-side.

**Change the fallback chain** — edit `resolveFallbacks()` in `lib/models.server.ts`, or set `OPENROUTER_FALLBACK_MODEL` to put one model at the front of the chain without a redeploy.

**Change the starter prompts** — edit `lib/suggestions.ts`.

**Re-theme** — every colour is a CSS custom property at the top of `app/globals.css`. Change the tokens there and the whole UI follows, in both themes.

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |

---

## Dependency & security notes

The dependency set is **pinned to exact versions** (no `^`/`~` ranges) and `package-lock.json`
is committed, so `npm ci` produces a byte-reproducible tree on Vercel and locally.

| Package | Version | Note |
| --- | --- | --- |
| `next` | `15.5.27` | Patched release line for **CVE-2025-66478** / CVE-2025-55182 |
| `react` / `react-dom` | `19.2.8` | Aligned with Next 15.5 |
| `ai` / `@ai-sdk/react` / `@ai-sdk/openai` | `4.3.19` / `1.2.12` / `1.3.24` | Unchanged — already current, no advisories |
| `eslint` | `10.12.0` | Actively supported line (9.x is end-of-life) |
| `typescript-eslint` | `8.71.0` | Supports ESLint 10 |
| `eslint-plugin-react-hooks` | `7.1.1` | Supports ESLint 10 |
| `@next/eslint-plugin-next` | `16.3.8` | Native flat config |

### Why `eslint.config.mjs` is composed by hand

ESLint 10 removed the legacy eslintrc mode. `eslint-config-next` still bundles
`eslint-plugin-react`, `eslint-plugin-import` and `eslint-plugin-jsx-a11y`, and **none of those
support ESLint 10 yet** — their latest releases still declare a `^9` peer range, and
`eslint-plugin-react` throws at lint time under ESLint 10
(`contextOrFilename.getFilename is not a function`).

Rather than freeze the project on an end-of-life ESLint, the config composes the three plugins
that *do* support ESLint 10 directly:

- `@next/eslint-plugin-next` → `core-web-vitals` (native flat config)
- `eslint-plugin-react-hooks` → `rules-of-hooks` + `exhaustive-deps`
- `typescript-eslint` → `recommended`

The React Hooks rule set is intentionally limited to those two classic rules — the same rules the
project ran before. The newer compiler-oriented rules (`set-state-in-effect` and friends) are left
off because this app legitimately uses the standard hydration-gate and localStorage-backed-theme
patterns they flag.

To go back to `eslint-config-next`, upgrade it once its bundled plugins add ESLint 10 support.

---

## Security notes

- The API key is read from `process.env` inside the route handler and is never included in any response body or client bundle.
- Request bodies are validated server-side: the message array, each role, each content string, and the model id are all checked before anything is sent upstream.
- Message count and length are capped to prevent abuse.
- No personal data is collected, and there is no authentication.

---

## License

MIT
