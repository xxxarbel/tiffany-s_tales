import { OUTPUT_SAMPLE_RATE } from "./config";
import type { AgentFunction, SettingsMessage } from "./types";

// The agent's persona, scope, and the "site map" of selectors/routes it can
// drive. Keeping the page map in the prompt lets the model call scroll_to /
// highlight_element / navigate with valid targets without guessing. The owner
// can override this whole prompt from /admin (Voice tab); this is the default.
export const SYSTEM_PROMPT = `# Role
You are the warm, friendly voice guide for "Tiffany's Tales", a cosy in-person book club based in Maidstone, Kent, in the United Kingdom. You are an expert on this website and the club: you greet visitors, give short spoken tours, answer questions about the club and its books, and help people find their way around the site and join. The club's owner is Riette. The brand has a playful "pack" theme — the logo is a little white chihuahua (called Tiff) sitting on an open book — so members are part of "the pack", and the warm invitation everywhere is "Join my pack today!".

# Voice and style
- Be warm, welcoming, and conversational — like a friendly host showing someone around. Your words are spoken aloud.
- Keep most replies to 1-2 short sentences. Expand only when asked for detail.
- Never use markdown, headings, bullets, code, or emoji in spoken replies.
- If a request is unclear, ask one short clarifying question.
- Do not give legal, financial, or medical advice.

# Key facts about the club
- It's a real, in-person, cosy book club in Maidstone, Kent, United Kingdom — "your literary sanctuary".
- Membership costs £10 a month.
- There are two "packs" (local groups): the Maidstone Pack, the home of the club, and the Sittingbourne Pack.
- Each pack meets once a month in person to discuss the book, and members chat every day in a Discord group in between.
- Every month the whole club reads and discusses a "Book of the Month".
- Members are welcome to suggest books for the club to read.
- Everyone is welcome — bookworms from all walks of life.
For factual questions, prefer calling lookup_knowledge rather than guessing.

# The website, page by page (use navigate / scroll_to / highlight_element)
The home page ("/") has three sections you can highlight by selector:
- "#hero" — the welcome and the club logo.
- "#packs" — "Find Your Pack": the Maidstone and Sittingbourne packs.
- "#book-of-the-month" — this month's featured read.
Other pages you can navigate to:
- "/about" — "Your literary sanctuary": about the community, plus a short FAQ (how often we meet, suggesting books, the £10 cost).
- "/benefits" — "Why Join the Pack?": the three benefits — Real Connection (meet readers in person), Lively Discussion (every voice matters), and A Fresh Story (a new book each month, chosen together).
- "/reviews" — "Book Reviews": what members are reading and thinking, a featured member quote, and the latest Instagram reviews.
- "/goodreads" — "Good Reads": Riette's Goodreads shelves — Currently reading, Read (finished and rated), and Want to read.
- "/instagram" — the club's Instagram, @tiffanystales: Riette's latest book reviews and reads.
- "/contact" — the contact form, to ask a question or ask to join the in-person club.
To join, send people to "/contact" to get in touch, or mention the "Join my pack" button in the site header (which goes to sign-up).

# Tools
- navigate(path): go to one of the routes above.
- scroll_to(selector): scroll a home-page section into view.
- highlight_element(selector, label): scroll to AND visually highlight a section during a tour.
- lookup_knowledge(query): grounded facts about the club (membership, packs, meetings, Book of the Month, benefits, FAQs, and any documents the owner uploaded). Use before answering factual questions about the club.
- search_books(query): search the club's real Goodreads shelves by title, author, or theme. Use whenever someone asks if the club has read a book, or asks for a recommendation.
- book_of_the_month(): the current Book of the Month — the book the pack is reading now. Use for "what's this month's read" questions.
- end_tour(): clear any highlight when the tour or chat wraps up.

# Tour flow
When someone asks for a tour (or to "show me around"), walk the home page step by step, one step at a time, pausing for the user:
1. Warmly welcome them — highlight_element("#hero") and say one line about the club.
2. highlight_element("#packs") and describe the Maidstone and Sittingbourne packs in a sentence.
3. highlight_element("#book-of-the-month"), call book_of_the_month(), and tell them what the pack is reading.
Then invite them to explore the reviews or shelves, or to join — "Join my pack today!". Don't dump everything at once.

# Answering questions
For club facts, call lookup_knowledge first and answer from its result. For specific books or recommendations, call search_books; for the current read, call book_of_the_month. If you genuinely don't know, say so briefly and point them to the contact page. Never invent prices, dates, or book details.

# Closing
When the user is done, clear highlights with end_tour and thank them warmly.`;

export const DEFAULT_GREETING =
  "Hello and welcome to Tiffany's Tales! I'm your book club guide. I can show you around, tell you about our packs, or help you find a good read. What would you like to do?";

// Declared so the model knows which functions it can call. Handlers live in the
// browser (see VoiceAgentProvider) and run against the host page DOM / API.
export const AGENT_FUNCTIONS: AgentFunction[] = [
  {
    name: "navigate",
    description:
      "Navigate the browser to a different page/route within the site.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Route path, e.g. '/about'." },
      },
      required: ["path"],
    },
  },
  {
    name: "scroll_to",
    description: "Smoothly scroll a section of the current page into view.",
    parameters: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "A CSS selector from the page map.",
        },
      },
      required: ["selector"],
    },
  },
  {
    name: "highlight_element",
    description:
      "Scroll an element into view and visually highlight it during the tour.",
    parameters: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "A CSS selector from the page map.",
        },
        label: {
          type: "string",
          description: "Optional short caption to show near the element.",
        },
      },
      required: ["selector"],
    },
  },
  {
    name: "lookup_knowledge",
    description:
      "Look up grounded facts about the club (membership, packs, meetings, Book of the Month, benefits, FAQs).",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The user's question, in natural language.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "search_books",
    description:
      "Search the club's real Goodreads shelves for books by title, author, or theme. Use to check if the club has read a book or to recommend one.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "A book title, author name, or theme/genre, e.g. 'Project Hail Mary' or 'cosy mystery'.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "book_of_the_month",
    description:
      "Get the club's current Book of the Month — the book the pack is reading now.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "end_tour",
    description: "Clear any active highlight when the tour or chat is done.",
    parameters: { type: "object", properties: {} },
  },
];

/**
 * User-editable subset of the agent configuration (surfaced in the settings
 * panel). The audio formats and the tour function declarations are fixed.
 */
export interface AgentConfig {
  /** STT model. Deepgram listen provider. */
  listenModel: string;
  /** LLM provider type: "anthropic" | "open_ai" | "google". */
  thinkProvider: string;
  /** LLM model id for the chosen provider. */
  thinkModel: string;
  /** LLM sampling temperature. */
  temperature: number;
  /** Deepgram Aura-2 TTS voice (speak model). */
  voice: string;
  /** Speaking rate multiplier (0.7–1.5). */
  speed: number;
  /** Agent language code. */
  language: string;
  /** Spoken opening line. */
  greeting: string;
  /** System prompt / instructions. */
  prompt: string;
}

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  listenModel: "flux-general-en",
  // Anthropic Haiku is a Deepgram-managed think provider — no separate key.
  thinkProvider: "anthropic",
  thinkModel: "claude-4-5-haiku-latest",
  temperature: 0.7,
  // A warm, friendly female voice suits the cosy book-club host persona.
  voice: "aura-2-thalia-en",
  speed: 1.0,
  language: "en",
  greeting: DEFAULT_GREETING,
  prompt: SYSTEM_PROMPT,
};

// ---- Option lists for the settings UI ----

export const LISTEN_MODELS: { value: string; label: string }[] = [
  { value: "flux-general-en", label: "Flux General (v2) — fast turn-taking" },
  { value: "nova-3", label: "Nova-3" },
  { value: "nova-2", label: "Nova-2" },
];

export const THINK_PROVIDERS: { value: string; label: string }[] = [
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "google", label: "Google (Gemini)" },
  { value: "open_ai", label: "OpenAI" },
  { value: "groq", label: "Groq (open models)" },
];

// Models available per provider (Deepgram-managed — no extra credentials needed).
export const THINK_MODELS: Record<string, { value: string; label: string }[]> = {
  anthropic: [
    { value: "claude-4-5-haiku-latest", label: "Claude Haiku 4.5" },
    { value: "claude-4-5-sonnet-latest", label: "Claude Sonnet 4.5" },
    { value: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku" },
    { value: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet" },
  ],
  google: [
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  ],
  open_ai: [
    { value: "gpt-4o-mini", label: "GPT-4o mini" },
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4.1-mini", label: "GPT-4.1 mini" },
    { value: "gpt-4.1", label: "GPT-4.1" },
  ],
  groq: [
    { value: "openai/gpt-oss-20b", label: "GPT-OSS 20B" },
    { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
  ],
};

export function defaultModelFor(provider: string): string {
  return THINK_MODELS[provider]?.[0]?.value ?? "";
}

// Curated Aura-2 voices (Deepgram speak provider).
export const VOICES: { value: string; label: string }[] = [
  { value: "aura-2-thalia-en", label: "Thalia (f)" },
  { value: "aura-2-asteria-en", label: "Asteria (f)" },
  { value: "aura-2-athena-en", label: "Athena (f)" },
  { value: "aura-2-aurora-en", label: "Aurora (f)" },
  { value: "aura-2-hera-en", label: "Hera (f)" },
  { value: "aura-2-helena-en", label: "Helena (f)" },
  { value: "aura-2-harmonia-en", label: "Harmonia (f)" },
  { value: "aura-2-andromeda-en", label: "Andromeda (f)" },
  { value: "aura-2-iris-en", label: "Iris (f)" },
  { value: "aura-2-odysseus-en", label: "Odysseus (m)" },
  { value: "aura-2-apollo-en", label: "Apollo (m)" },
  { value: "aura-2-arcas-en", label: "Arcas (m)" },
];

export const LANGUAGES: { value: string; label: string }[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
];

/**
 * Build the Settings message sent immediately after the Welcome message.
 * `inputSampleRate` is the mic AudioContext's actual rate (don't hardcode it —
 * browsers may coerce it); `config` is the (possibly user-edited) agent config.
 */
export function buildSettings(
  inputSampleRate: number,
  config: AgentConfig = DEFAULT_AGENT_CONFIG,
): SettingsMessage {
  // Flux requires the v2 listen API; Nova models use the default version.
  const listenProvider: Record<string, unknown> =
    config.listenModel.startsWith("flux")
      ? { type: "deepgram", version: "v2", model: config.listenModel }
      : { type: "deepgram", model: config.listenModel };

  return {
    type: "Settings",
    audio: {
      input: { encoding: "linear16", sample_rate: inputSampleRate },
      output: {
        encoding: "linear16",
        sample_rate: OUTPUT_SAMPLE_RATE,
        container: "none",
      },
    },
    agent: {
      language: config.language,
      listen: { provider: listenProvider },
      think: {
        provider: {
          type: config.thinkProvider,
          model: config.thinkModel,
          temperature: config.temperature,
        },
        prompt: config.prompt,
        functions: AGENT_FUNCTIONS,
      },
      speak: {
        provider: {
          type: "deepgram",
          model: config.voice,
          speed: config.speed,
        },
      },
      greeting: config.greeting,
    },
  };
}
