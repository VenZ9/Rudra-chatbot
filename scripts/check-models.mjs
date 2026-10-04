#!/usr/bin/env node
/**
 * Verifies that every model in the free roster is (a) still advertised as free
 * and (b) still has at least one live endpoint.
 *
 * Free OpenRouter ids are retired regularly, and a retired id is the single
 * most likely reason this app stops answering. Run this before assuming a bug
 * in the code:
 *
 *   npm run check:models
 *
 * Exit code is 1 if any roster model is gone, so it can gate a deploy.
 */

const CATALOG = "https://openrouter.ai/api/v1/models";

/**
 * A SUPERSET of MODELS in lib/models.ts: it checks the four models the UI
 * offers plus four other strong free candidates. Watching the extras means a
 * replacement is already known-good if one of the four is retired. Kept in
 * sync with lib/models.ts by hand — this script must not import app code, so
 * it still runs when the build is broken.
 */
const ROSTER = [
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "google/gemma-4-31b-it:free",
  "qwen/qwen3.8-27b:free",
  "dots-studio/dots-3-note-preview:free",
  "apodex/apodex-1.1-mini:free",
  "thinkingmachines/inkling-small:free",
  "nvidia/nemotron-3.5-lightning:free",
];

const DEFAULT_MODEL = ROSTER[0];
const FALLBACK_MODEL = ROSTER[1];

/** The listing returns 200 with an empty `endpoints` array for a retired model. */
async function hasLiveEndpoint(id) {
  // NOT encodeURIComponent: the id contains a '/', which must stay literal or
  // OpenRouter answers 404 for every model.
  const segment = id.replace(/[^A-Za-z0-9._:/~-]/g, "");
  const res = await fetch(`${CATALOG}/${segment}/endpoints`, {
    headers: { Accept: "application/json" },
  });
  if (res.status === 404) return { live: false, reason: "404 — id unknown" };
  if (!res.ok) return { live: null, reason: `probe failed (HTTP ${res.status})` };
  const body = await res.json();
  const endpoints = body?.data?.endpoints;
  if (!Array.isArray(endpoints)) return { live: null, reason: "unexpected probe payload" };
  return {
    live: endpoints.length > 0,
    reason: endpoints.length > 0 ? `${endpoints.length} endpoint(s)` : "0 endpoints — retired",
  };
}

function money(v) {
  return v === "0" ? "free" : String(v);
}

const res = await fetch(CATALOG, { headers: { Accept: "application/json" } });
if (!res.ok) {
  console.error(`Could not reach the OpenRouter catalog (HTTP ${res.status}).`);
  process.exit(2);
}

const catalog = (await res.json()).data ?? [];
const byId = new Map(catalog.map((m) => [m.id, m]));

let failures = 0;
console.log(`Checked ${new Date().toISOString()}\n`);

for (const id of ROSTER) {
  const meta = byId.get(id);
  if (!meta) {
    console.log(`✗ ${id}\n    not in the catalog at all`);
    failures++;
    continue;
  }

  const prompt = meta?.pricing?.prompt;
  const completion = meta?.pricing?.completion;
  const isFree = prompt === "0" && completion === "0";
  const { live, reason } = await hasLiveEndpoint(id);

  const roles = [
    id === DEFAULT_MODEL ? "default" : null,
    id === FALLBACK_MODEL ? "fallback" : null,
  ].filter(Boolean);

  const ok = isFree && live === true;
  if (!ok) failures++;

  console.log(
    `${ok ? "✓" : "✗"} ${id}${roles.length ? ` (${roles.join(", ")})` : ""}\n` +
      `    pricing: ${money(prompt)} / ${money(completion)}   endpoints: ${reason}`,
  );
}

console.log();
if (failures > 0) {
  console.error(
    `${failures} of ${ROSTER.length} roster model(s) are gone. Update MODELS in lib/models.ts ` +
      `and DEFAULT_MODEL / FALLBACK_MODEL, then re-run this check.`,
  );
  process.exit(1);
}
console.log(`All ${ROSTER.length} roster models are free and serving.`);
