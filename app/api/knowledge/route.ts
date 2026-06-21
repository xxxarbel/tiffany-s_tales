import { groundedAnswer } from "@/lib/voice/documents";
import { lookupKnowledge } from "@/lib/voice-agent/knowledge";

// Backs the lookup_knowledge function call. Keeps club facts grounded on the
// server so the agent answers from a known source rather than guessing.
//
// Primary source is the Postgres document store (lib/voice/documents); if it has
// no match — or is unavailable — we fall back to the static FAQ so the live voice
// experience never breaks. The {answer} contract is unchanged.
export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // the `pg` driver needs the Node runtime

export async function POST(request: Request) {
  let query = "";
  try {
    const body = (await request.json()) as { query?: string };
    query = typeof body.query === "string" ? body.query : "";
  } catch {
    // ignore malformed body
  }

  if (!query.trim()) {
    return Response.json(
      { error: "Missing 'query'." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  let answer: string | null = null;
  try {
    answer = await groundedAnswer(query);
  } catch (err) {
    // DB down / not configured — log and fall back to the static knowledge base.
    console.error("knowledge: document store lookup failed, using fallback:", err);
  }

  return Response.json(
    { answer: answer ?? lookupKnowledge(query) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
