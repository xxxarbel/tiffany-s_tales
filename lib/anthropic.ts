// Resolve the Anthropic (Claude) API key from the environment, accepting either
// common variable name. `ANTHROPIC_API_KEY` is what the SDK reads by default;
// `CLAUDE_API_KEY` is a frequent alias (e.g. set that way in Vercel), so we fall
// back to it rather than silently treating the feature as unconfigured.
export function getAnthropicApiKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || undefined;
}
