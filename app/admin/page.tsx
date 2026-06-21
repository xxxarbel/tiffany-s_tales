import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { account } from "@/lib/schema";
import { getSettings } from "@/lib/settings";
import { getAnalyticsSummary } from "@/lib/analytics";
import { getAdminBooks, getGoodreadsUserId } from "@/lib/goodreads";
import { getAdminPosts, getBeholdFeedUrl } from "@/lib/instagram";
import { getVoiceAgentConfig } from "@/lib/voice/agent-config";
import { SiteHeader } from "@/components/site-header";
import { AdminPanel } from "@/components/admin/admin-panel";

export const metadata = {
  title: "Admin · Tiffany's Tales",
};

export default async function AdminPage() {
  const session = await requireAdmin();

  // All users (admin plugin endpoint). Sorted newest-first in the UI.
  const { users } = await auth.api.listUsers({
    query: { limit: 200 },
    headers: await headers(),
  });

  // Map userId -> linked providers (credential / google) for a Provider column.
  // listUsers returns user rows only, so this comes from the account table.
  const providersByUser: Record<string, string[]> = {};
  try {
    const rows = await db
      .select({ userId: account.userId, providerId: account.providerId })
      .from(account);
    for (const row of rows) {
      (providersByUser[row.userId] ??= []).push(row.providerId);
    }
  } catch (error) {
    console.error("[admin] failed to load providers:", error);
  }

  const settings = await getSettings();

  // First-party analytics, one summary per range the dashboard can toggle.
  const analytics = await Promise.all(
    [7, 30, 90].map((days) => getAnalyticsSummary(days))
  );

  // Goodreads import data: recent books + total + the saved RSS user id.
  const [{ books, total }, goodreadsUserId] = await Promise.all([
    getAdminBooks(),
    getGoodreadsUserId(),
  ]);

  // Instagram import data: recent posts + total + the saved Behold feed URL.
  const [{ posts: instagramPosts, total: instagramTotal }, beholdFeedUrl] =
    await Promise.all([getAdminPosts(), getBeholdFeedUrl()]);

  // The owner-editable voice assistant config (model, voice, prompt).
  const voiceConfig = await getVoiceAgentConfig();

  return (
    <div className="min-h-svh bg-muted/40">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            Admin
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage members and the club&apos;s email settings.
          </p>
        </div>
        <AdminPanel
          users={users}
          providersByUser={providersByUser}
          currentUserId={session.user.id}
          settings={settings}
          analytics={analytics}
          goodreads={{ books, total, userId: goodreadsUserId }}
          instagram={{
            posts: instagramPosts,
            total: instagramTotal,
            feedUrl: beholdFeedUrl,
          }}
          voiceConfig={voiceConfig}
        />
      </main>
    </div>
  );
}
