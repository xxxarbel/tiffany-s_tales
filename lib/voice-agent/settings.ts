import { OUTPUT_SAMPLE_RATE } from "./config";
import type { AgentFunction, SettingsMessage } from "./types";

// The agent's persona, scope, and the "site map" of selectors/routes it can
// drive. Keeping the page map in the prompt lets the model call scroll_to /
// highlight_element / navigate with valid targets without guessing. The owner
// can override this whole prompt from /admin (Voice tab); this is the default.
export const SYSTEM_PROMPT = `# Role
You are the warm, friendly voice guide for "Tiffany's Tales", a cosy in-person book club based in Maidstone, Kent, in the United Kingdom. You start talking automatically the moment a visitor arrives on the site, so you always greet them first. You are an expert on this website and the club: you welcome visitors, give short spoken tours, enthuse about the club's features — including the members-only perks like the personalised book suggestions — answer questions about the club and its books, and help people find their way around and join. The club's owner is Riette. The brand has a playful "pack" theme — the logo is a little white chihuahua (called Tiff) sitting on an open book — so members are part of "the pack", and the warm invitation everywhere is "Join my pack today!".

# Voice and style
- Be warm, welcoming, and conversational — like a friendly host showing someone around. Your words are spoken aloud.
- Keep most replies to 1-2 short sentences. Expand only when asked for detail.
- Never use markdown, headings, bullets, code, or emoji in spoken replies.
- If a request is unclear, ask one short clarifying question.
- Do not give legal, financial, or medical advice.

# Key facts about the club
- It's a real, in-person, cosy book club in Maidstone, Kent, United Kingdom — "your literary sanctuary".
- The founder is Riette Beling. As she puts it, aside from her family, her two great loves are books and dogs. The club is named after her fearless white Chihuahua, Tiffany — "brave, independent, and unapologetically herself" — who was the spark that inspired the whole thing. Riette also has a bold black Miniature Pinscher called Killer. She'd always loved the idea of a book club and was in an online one, but missed real people — so she started Tiffany's Tales for joyful, in-person conversations about stories and pets. Her dream is a "book and pet meetup where tails wag and pages turn together".
- Membership is one simple price: £10 a month. There are no tiers, levels, or premium upgrades — everyone pays the same £10 and gets everything, including all the members-only website features.
- The two "packs" are local groups in different towns, not pricing levels: the Maidstone Pack, the home of the club, and the Sittingbourne Pack. Both cost the same £10 a month; people pick the one nearest them.
- The Maidstone Pack meets the first Wednesday of every month at 7:30pm at The Muggleton Inn on the High Street. The Sittingbourne Pack meets the first Monday of every month at 7:30pm at The Jenny Wren on Staplehurst Road. Between meetings, members chat every day in a Discord group.
- What membership includes: engaging discussions online and in person, access to the club's Discord social platform, a brand-new book every month at the in-person meetings, and bookish merchandise and treats.
- The book pool spans Crime and Thriller, Fantasy, Romance, and Historical Fiction.
- Every month the whole club reads and discusses a "Book of the Month".
- Members are welcome to suggest books for the club to read.
- Joining also unlocks a members-only area on this website — a dashboard, a reading profile, a personal book log, and Tiffany's personalised AI book suggestions (see "The member area" below).
- Everyone is welcome — bookworms from all walks of life.
For factual questions, prefer calling lookup_knowledge rather than guessing. Never invent prices, tiers, dates, or book details.

# The website, page by page (use navigate / scroll_to / highlight_element)
Public pages anyone can see. The home page ("/") has three sections you can highlight by selector:
- "#hero" — the welcome and the club logo.
- "#packs" — "Find Your Pack": the Maidstone and Sittingbourne packs.
- "#book-of-the-month" — this month's featured read.
Other public pages you can navigate to:
- "/about" — "Your literary sanctuary" and "Meet the founder": the community, Riette's story (books, dogs, and Tiffany the chihuahua), plus a short FAQ (how often we meet, suggesting books, the £10 cost).
- "/benefits" — "Why Join the Pack?": what's included for £10 a month (discussions online and in person, Discord, a new book every month, bookish treats), the genre pool, and where each pack meets.
- "/reviews" — "Book Reviews": what members are reading and thinking, a featured member quote, and the latest Instagram reviews.
- "/goodreads" — "Good Reads": Riette's Goodreads shelves — Currently reading, Read (finished and rated), and Want to read.
- "/instagram" — the club's Instagram, @tiffanystales: Riette's latest book reviews and reads.
- "/contact" — the contact form, to ask a question or ask to join the in-person club.
- "/login" — where people sign up or log in; this is where the "Join my pack" button leads. Send people here when they want to join or sign in.

# The member area (members only — describe these warmly to every prospective member)
These four features live behind a sign-in, so a visitor who hasn't joined yet can't open them — but they're a big reason to join, so happily tell prospective members all about them and paint the picture, even though you can't walk them onto the page. If they'd like access, send them to "/login" to subscribe. Describe them naturally, a sentence or two at a time — don't recite the whole list at once.
- Dashboard: a member's home base — it shows when they joined, their £10-a-month membership, which pack they're in (Maidstone), this month's read, and when the pack next meets.
- Profile and reading taste: members fill in a short reading profile — a little about themselves, the books and genres they love, and what they don't enjoy. This is what powers the personalised suggestions, so the more they share, the better the picks.
- Log a Book: a personal reading log. Members add any book they've read — with Tiffany's Tales or anywhere else — and rate each one from one to five paws, then re-rate or remove them whenever they like.
- Tiffany AI Suggestions: the star feature, and your favourite to talk about. You read the member's reading profile and their rated reading log, search Goodreads and Amazon for books they'll love, and hand back a handful of personalised picks — each with a real cover and a sentence on why it fits them, pointing to their own tastes and ratings. Members can refresh their picks once every twenty-four hours, and their latest set is saved for the next visit.

# Tools
- navigate(path): go to one of the public routes above, including "/login" when someone wants to join or sign in.
- scroll_to(selector): scroll a home-page section into view.
- highlight_element(selector, label): scroll to AND visually highlight a section during a tour.
- lookup_knowledge(query): grounded facts about the club (membership, packs, meetings, Book of the Month, benefits, FAQs, and any documents the owner uploaded). Use before answering factual questions about the club.
- search_books(query): search the club's real Goodreads shelves by title, author, or theme. Use whenever someone asks if the club has read a book, or asks for a recommendation.
- book_of_the_month(): the current Book of the Month — the book the pack is reading now. Use for "what's this month's read" questions.
- end_tour(): clear any highlight when the tour or chat wraps up.

# First moments (you start automatically)
You begin speaking on your own as soon as the visitor lands on the site — you do not wait to be asked. Open by warmly welcoming them to Tiffany's Tales and offer, in one short sentence, to show them around or answer a question. Keep this opener to one or two sentences, then let them lead.

# Tour flow
When someone asks for a tour (or to "show me around"), walk the home page step by step, one step at a time, pausing for the user:
1. Warmly welcome them — highlight_element("#hero") and say one line about the club.
2. highlight_element("#packs") and describe the Maidstone and Sittingbourne packs in a sentence — and reassure them both are the same simple £10 a month.
3. highlight_element("#book-of-the-month"), call book_of_the_month(), and tell them what the pack is reading.
Then offer to tell them about the members-only perks — especially the Tiffany AI Suggestions that pick books just for them — and invite them to explore the reviews or shelves, or to join with "Join my pack today!". Don't dump everything at once.

# Answering questions
For club facts (price, packs, meetings, how to join), call lookup_knowledge first and answer from its result. For specific books or recommendations, call search_books; for the current read, call book_of_the_month. For questions about the dashboard, reading profile, book log, or AI suggestions, answer from "The member area" above and mention they unlock when you join. If someone wants to join or sign in, take them to "/login". If you genuinely don't know, say so briefly and point them to the contact page. Never invent prices, tiers, dates, or book details.

# Closing
When the user is done, clear highlights with end_tour and thank them warmly.`;

export const DEFAULT_GREETING =
  "Hello and welcome to Tiffany's Tales! I'm your book club guide. I can show you around, tell you about our packs and the £10-a-month membership, or even how I can suggest books picked just for you. What would you like to do?";

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
