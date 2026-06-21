import { getVoiceAgentConfig } from "@/lib/voice/agent-config";

// Serves the owner-edited voice assistant config to the browser so the floating
// guide always uses the latest model / voice / prompt the admin saved — even on
// statically-cached marketing pages. No secret is exposed: the prompt and model
// ids are sent from the browser to Deepgram in the Settings handshake anyway.
// The pg driver needs the Node runtime.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const config = await getVoiceAgentConfig();
  // `enabled` lets the browser hide the launcher entirely when the server has no
  // Deepgram key, so visitors never hit a broken assistant (a 500 from the token
  // route). The key itself is never sent — only whether it's present.
  const enabled = Boolean(process.env.DEEPGRAM_API_KEY);
  return Response.json(
    { config, enabled },
    { headers: { "Cache-Control": "no-store" } },
  );
}
