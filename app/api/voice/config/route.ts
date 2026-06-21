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
  return Response.json({ config }, { headers: { "Cache-Control": "no-store" } });
}
