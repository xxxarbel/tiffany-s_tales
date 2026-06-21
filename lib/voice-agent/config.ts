// Non-secret runtime constants for the Deepgram Voice Agent client.

export const DEEPGRAM_AGENT_WS_URL =
  "wss://agent.deepgram.com/v1/agent/converse";

// Server route that mints short-lived JWTs.
export const TOKEN_ENDPOINT = "/api/deepgram/token";

// Server route backing the lookup_knowledge function call.
export const KNOWLEDGE_ENDPOINT = "/api/knowledge";

// Server route for uploading/listing/deleting knowledge documents.
export const DOCUMENTS_ENDPOINT = "/api/documents";

// Server route backing the search_books / book_of_the_month function calls.
export const BOOKS_ENDPOINT = "/api/voice/books";

// Server route serving the owner-edited agent config (model/voice/prompt).
export const VOICE_CONFIG_ENDPOINT = "/api/voice/config";

// Browsers can't set custom headers on a WebSocket, so the credential is passed
// via subprotocols. A JWT access token (from /v1/auth/grant) authenticates with
// the "bearer" scheme — ["bearer", <jwt>]. (A raw API key would use "token".)
export const WS_SUBPROTOCOL = "bearer";

// Send a KeepAlive every few seconds to hold the socket open while idle.
export const KEEPALIVE_MS = 5000;

// Output audio format declared in Settings (linear16, mono, raw PCM).
export const OUTPUT_SAMPLE_RATE = 24000;

// Fallback input rate; the real rate is read from the mic AudioContext at runtime.
export const INPUT_SAMPLE_RATE = 48000;

// AudioWorklet processor served as a static file (see public/worklets).
export const PCM_WORKLET_URL = "/worklets/pcm-recorder.worklet.js";
