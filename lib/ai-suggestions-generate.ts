import Anthropic from "@anthropic-ai/sdk";

import { getAnthropicApiKey } from "@/lib/anthropic";
import { getUserProfile } from "@/lib/user-profile";
import { getBookLog } from "@/lib/book-log";
import { resolveCoverUrl } from "@/lib/goodreads";
import type { Suggestion } from "@/lib/ai-suggestions";

// Tiffany's AI book concierge. Reads the member's free-text reading profile and
// their rated reading log, asks claude-haiku-4-5 to infer their tastes and search
// goodreads.com / amazon.com for books they'd enjoy, and returns 3–5 picks each
// with a substantiation that cites the member's own stated tastes and ratings.
// Covers are then resolved to real images via the shared cover resolver.
//
// Model/API notes (verified against the claude-api reference):
//  - Haiku 4.5 takes the BASIC web search tool `web_search_20250305` (the
//    dynamic-filtering `web_search_20260209` requires Opus/Sonnet 4.6+).
//  - No `effort` (errors on Haiku 4.5) and no `thinking` (Haiku isn't an
//    adaptive-thinking model) — both are omitted.
//  - Structured outputs ARE supported on Haiku 4.5 via `output_config.format`.
//  - Server tools run a server-side loop; a `pause_turn` stop reason is resumed
//    by re-sending `[user, assistant(response.content)]` (no "Continue" message).

const MODEL = "claude-haiku-4-5";
const MAX_CONTINUATIONS = 5;
const COVER_CONCURRENCY = 5;

const ALLOWED_DOMAINS = [
  "goodreads.com",
  "www.goodreads.com",
  "amazon.com",
  "www.amazon.com",
];

// Structured-output schema. Note: structured outputs don't support array
// length constraints (minItems/maxItems), so the 3–5 count is requested in the
// prompt rather than enforced by the schema.
const SUGGESTIONS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["suggestions"],
  properties: {
    suggestions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "author", "reason"],
        properties: {
          title: { type: "string" },
          author: { type: "string" },
          reason: { type: "string" },
        },
      },
    },
  },
} as const;

const SYSTEM_PROMPT = [
  "You are Tiffany, the warm and well-read book concierge for the Tiffany's Tales book club.",
  "A member has shared their reading profile and a log of books they've read and rated.",
  "Your job: infer what this reader loves and dislikes, then recommend books they'd genuinely enjoy next.",
  "Use the web_search tool to search goodreads.com and amazon.com for strong candidates and to confirm real titles and authors.",
  "Rules:",
  "- Recommend 3 to 5 books, no more, no fewer.",
  "- Never recommend a book that already appears in the member's reading log.",
  "- For each pick, write a 'reason' (2–3 sentences) that points to the member's OWN stated tastes and specific ratings — e.g. reference a genre they prefer, something they said they like or dislike, or a logged book they rated highly.",
  "- Make sure every title and author is a real, correctly-spelled book.",
].join("\n");

/** Build the user message embedding the profile fields and the rated log. */
function buildUserMessage(
  profile: Awaited<ReturnType<typeof getUserProfile>>,
  log: Awaited<ReturnType<typeof getBookLog>>
): string {
  const lines: string[] = [];

  lines.push("# The member's reading profile");
  lines.push(`About them: ${profile.aboutYou || "(not provided)"}`);
  lines.push(`Books they like: ${profile.booksLike || "(not provided)"}`);
  lines.push(`What they like in books: ${profile.likeInBooks || "(not provided)"}`);
  lines.push(`What they dislike in books: ${profile.dislikeInBooks || "(not provided)"}`);
  lines.push(`Preferred genres: ${profile.preferredGenres || "(not provided)"}`);

  lines.push("");
  lines.push("# The member's reading log (do NOT recommend any of these)");
  if (log.length === 0) {
    lines.push("(empty — they haven't logged any books yet)");
  } else {
    for (const entry of log) {
      const author = entry.author ? ` by ${entry.author}` : "";
      const genre = entry.genre ? ` [${entry.genre}]` : "";
      let sentiment = "not yet rated";
      if (entry.rating != null) {
        if (entry.rating >= 4) sentiment = `loved it (${entry.rating}/5)`;
        else if (entry.rating <= 2) sentiment = `disliked it (${entry.rating}/5)`;
        else sentiment = `it was okay (${entry.rating}/5)`;
      }
      lines.push(`- "${entry.title}"${author}${genre} — ${sentiment}`);
    }
  }

  lines.push("");
  lines.push(
    "Search goodreads.com and amazon.com, then return 3–5 fresh recommendations as JSON " +
      "with a `suggestions` array; each item has `title`, `author`, and a `reason` that " +
      "cites this member's specific tastes and ratings."
  );

  return lines.join("\n");
}

/** Pull the JSON `suggestions` array out of the model's final text output. */
function parseSuggestions(text: string): Suggestion[] {
  let raw = text.trim();
  // Strip a ```json … ``` fence if the model wrapped the output (fallback path).
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) raw = fence[1].trim();
  // Otherwise narrow to the outermost JSON object.
  if (!raw.startsWith("{")) {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) raw = raw.slice(start, end + 1);
  }

  const parsed = JSON.parse(raw) as { suggestions?: unknown };
  const list = Array.isArray(parsed?.suggestions) ? parsed.suggestions : [];

  return list
    .map((item): Suggestion | null => {
      if (!item || typeof item !== "object") return null;
      const obj = item as Record<string, unknown>;
      const title = typeof obj.title === "string" ? obj.title.trim() : "";
      const author = typeof obj.author === "string" ? obj.author.trim() : "";
      const reason = typeof obj.reason === "string" ? obj.reason.trim() : "";
      if (!title) return null;
      return { title, author, reason, coverUrl: null };
    })
    .filter((s): s is Suggestion => s !== null)
    .slice(0, 5);
}

/** Resolve real cover images for each pick, with bounded concurrency. */
async function attachCovers(picks: Suggestion[]): Promise<Suggestion[]> {
  const result = [...picks];
  let cursor = 0;

  async function worker() {
    while (cursor < result.length) {
      const i = cursor++;
      const pick = result[i];
      result[i] = {
        ...pick,
        coverUrl: await resolveCoverUrl({
          title: pick.title,
          author: pick.author || null,
          isbn: null,
          isbn13: null,
          coverUrl: null,
        }),
      };
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(COVER_CONCURRENCY, result.length) }, worker)
  );
  return result;
}

/**
 * Generate a fresh set of suggestions for a member. Reads their profile + log,
 * runs the model (with web search + structured output, resuming `pause_turn`),
 * parses the picks, and resolves a real cover for each. Throws on API failure so
 * the caller (the server action) can surface a friendly error.
 */
export async function generateSuggestions(userId: string): Promise<Suggestion[]> {
  const [profile, log] = await Promise.all([
    getUserProfile(userId),
    getBookLog(userId),
  ]);

  // Pass the key explicitly so it works under either env-var name
  // (ANTHROPIC_API_KEY or CLAUDE_API_KEY), not just the SDK's default.
  const client = new Anthropic({ apiKey: getAnthropicApiKey() });
  const userMessage = buildUserMessage(profile, log);

  const tools: Anthropic.Messages.ToolUnion[] = [
    {
      type: "web_search_20250305",
      name: "web_search",
      max_uses: 5,
      allowed_domains: ALLOWED_DOMAINS,
    },
  ];

  // Primary path: structured output. Fallback (if web search + structured
  // output ever reject together): re-run JSON-only and parse the text. Haiku is
  // reliable for this small shape; the prompt already asks for the JSON object.
  async function run(useFormat: boolean): Promise<string> {
    let messages: Anthropic.MessageParam[] = [
      { role: "user", content: userMessage },
    ];
    let response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools,
      messages,
      ...(useFormat
        ? { output_config: { format: { type: "json_schema", schema: SUGGESTIONS_SCHEMA } } }
        : {}),
    });

    let continuations = 0;
    while (response.stop_reason === "pause_turn" && continuations < MAX_CONTINUATIONS) {
      messages = [
        { role: "user", content: userMessage },
        { role: "assistant", content: response.content },
      ];
      response = await client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools,
        messages,
        ...(useFormat
          ? { output_config: { format: { type: "json_schema", schema: SUGGESTIONS_SCHEMA } } }
          : {}),
      });
      continuations++;
    }

    return response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
  }

  let text: string;
  try {
    text = await run(true);
  } catch (error) {
    console.error("[ai-suggestions] structured run failed, retrying JSON-only:", error);
    text = await run(false);
  }

  const picks = parseSuggestions(text);
  return attachCovers(picks);
}
