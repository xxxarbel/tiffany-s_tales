// Mints a short-lived Deepgram JWT so the long-lived API key never reaches the
// browser. The browser uses the returned access_token as a WebSocket subprotocol
// to connect to the Voice Agent API.
//
// Must run at request time (reads env + makes a network call) — never prerender.
export const dynamic = "force-dynamic";

const DEEPGRAM_GRANT_URL = "https://api.deepgram.com/v1/auth/grant";

// Token only needs to be valid at WS connection-open time; the session persists
// after. Keep the TTL short.
const TTL_SECONDS = 60;

export async function POST() {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "DEEPGRAM_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(DEEPGRAM_GRANT_URL, {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ttl_seconds: TTL_SECONDS }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return Response.json(
        { error: "Failed to mint Deepgram token.", detail },
        { status: 502 },
      );
    }

    // { access_token, expires_in }
    const data = (await res.json()) as { access_token: string; expires_in: number };
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return Response.json(
      { error: "Unexpected error minting Deepgram token.", detail: String(err) },
      { status: 502 },
    );
  }
}
