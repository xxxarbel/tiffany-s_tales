import { getAnthropicApiKey } from "@/lib/anthropic";

// Tells the browser whether AI suggestions are configured (an Anthropic key is
// present on the server), so the site header can hide the "Tiffany AI
// Suggestions" tab entirely when the feature is off — mirroring the voice
// launcher's gating. The key itself is never sent, only the boolean.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const enabled = Boolean(getAnthropicApiKey());
  return Response.json(
    { enabled },
    { headers: { "Cache-Control": "no-store" } },
  );
}
