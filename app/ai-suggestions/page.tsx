import { redirect } from "next/navigation";

import { getSafeSession } from "@/lib/auth";
import {
  getAiSuggestions,
  nextAllowedAt,
  suggestionsOnCooldown,
} from "@/lib/ai-suggestions";
import { getAnthropicApiKey } from "@/lib/anthropic";
import { SiteHeader } from "@/components/site-header";
import { AiSuggestions } from "@/components/ai-suggestions/ai-suggestions";

export const metadata = {
  title: "Tiffany AI Suggestions · Tiffany's Tales",
};

// Web search + the model can take 15–40s; give the server action room on Vercel.
export const maxDuration = 60;

export default async function AiSuggestionsPage() {
  const session = await getSafeSession();
  if (!session) {
    redirect("/login");
  }

  const existing = await getAiSuggestions(session.user.id);
  // Use the shared resolver so this matches the nav-tab gate and the generator,
  // which both accept either ANTHROPIC_API_KEY or CLAUDE_API_KEY.
  const enabled = Boolean(getAnthropicApiKey());
  // Once-per-24h limit: compute on the server (current time belongs here) and
  // pass the flag + next-allowed time so the client can disable the button. The
  // server action enforces it authoritatively regardless.
  const nextAt = nextAllowedAt(existing?.generatedAt ?? null);
  const nextAvailableAtMs = nextAt ? nextAt.getTime() : null;
  const onCooldown = suggestionsOnCooldown(existing?.generatedAt ?? null);

  return (
    <div className="min-h-svh bg-muted/40">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            Tiffany AI Suggestions
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tiffany reads your profile and reading log, then hunts down books
            she thinks you&apos;ll love — each with a note on why it&apos;s a fit
            for you.
          </p>
        </div>
        <AiSuggestions
          existing={existing}
          enabled={enabled}
          onCooldown={onCooldown}
          nextAvailableAtMs={nextAvailableAtMs}
        />
      </main>
    </div>
  );
}
