import { isModelAvailable } from "@/lib/model-availability";
import { DEFAULT_MODEL, FALLBACK_MODEL, MODELS } from "@/lib/models";
import { resolveApiKey, resolveBaseUrl } from "@/lib/models.server";

/**
 * Readiness check.
 *
 * Free OpenRouter ids get retired without notice, which is the single most
 * likely reason this app stops answering. `GET /api/models` answers "is my
 * model still alive?" in one request, so a deployment can be diagnosed without
 * reading server logs.
 *
 * It never returns the key — only whether one is configured.
 */
export const runtime = "nodejs";

export async function GET() {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    return Response.json(
      { ok: false, keyConfigured: false, error: "OPENROUTER_API_KEY is not set." },
      { status: 500 },
    );
  }

  const baseURL = resolveBaseUrl();
  const cfg = { baseURL, apiKey };

  // De-duplicate: the default and the fallback also appear in MODELS.
  const ids = [...new Set([DEFAULT_MODEL, FALLBACK_MODEL, ...MODELS.map((m) => m.id)])];
  const available = await Promise.all(ids.map((id) => isModelAvailable(id, cfg)));

  const models = ids.map((id, i) => ({ id, available: available[i] }));

  return Response.json({
    ok: models.some((m) => m.available),
    keyConfigured: true,
    baseURL,
    defaultModel: DEFAULT_MODEL,
    fallbackModel: FALLBACK_MODEL,
    models,
  });
}
