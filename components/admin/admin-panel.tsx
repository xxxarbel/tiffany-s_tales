"use client"

import { Users, Mail, BarChart3, BookMarked, Sparkles, Mic } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { AppSettings } from "@/lib/settings"
import type { AnalyticsSummary } from "@/lib/analytics"
import type { GoodreadsBookRow } from "@/lib/goodreads"
import type { InstagramPostRow } from "@/lib/instagram"
import type { AgentConfig } from "@/lib/voice-agent/settings"
import { AdminUsersTable, type AdminUser } from "@/components/admin/admin-users-table"
import { AdminSettingsForm } from "@/components/admin/admin-settings-form"
import { AdminAnalytics } from "@/components/admin/admin-analytics"
import { AdminGoodreads } from "@/components/admin/admin-goodreads"
import { AdminInstagram } from "@/components/admin/admin-instagram"
import { AdminKnowledge } from "@/components/admin/admin-knowledge"
import { AdminVoice } from "@/components/admin/admin-voice"
import { InstagramIcon } from "@/components/icons/instagram-icon"

export function AdminPanel({
  users,
  providersByUser,
  currentUserId,
  settings,
  analytics,
  goodreads,
  instagram,
  voiceConfig,
}: {
  users: AdminUser[]
  providersByUser: Record<string, string[]>
  currentUserId: string
  settings: AppSettings
  analytics: AnalyticsSummary[]
  goodreads: { books: GoodreadsBookRow[]; total: number; userId: string | null }
  instagram: {
    posts: InstagramPostRow[]
    total: number
    feedUrl: string | null
  }
  voiceConfig: AgentConfig
}) {
  return (
    <Tabs defaultValue="users" className="w-full">
      <TabsList>
        <TabsTrigger value="users">
          <Users data-icon="inline-start" />
          Users
          <span className="ml-1.5 rounded-full bg-muted px-1.5 text-xs text-muted-foreground">
            {users.length}
          </span>
        </TabsTrigger>
        <TabsTrigger value="analytics">
          <BarChart3 data-icon="inline-start" />
          Analytics
        </TabsTrigger>
        <TabsTrigger value="goodreads">
          <BookMarked data-icon="inline-start" />
          Goodreads
        </TabsTrigger>
        <TabsTrigger value="instagram">
          <InstagramIcon className="size-4" data-icon="inline-start" />
          Instagram
        </TabsTrigger>
        <TabsTrigger value="voice">
          <Mic data-icon="inline-start" />
          Voice
        </TabsTrigger>
        <TabsTrigger value="knowledge">
          <Sparkles data-icon="inline-start" />
          Knowledge
        </TabsTrigger>
        <TabsTrigger value="settings">
          <Mail data-icon="inline-start" />
          Email settings
        </TabsTrigger>
      </TabsList>
      <TabsContent value="users" className="pt-6">
        <AdminUsersTable
          users={users}
          providersByUser={providersByUser}
          currentUserId={currentUserId}
        />
      </TabsContent>
      <TabsContent value="analytics" className="pt-6">
        <AdminAnalytics summaries={analytics} />
      </TabsContent>
      <TabsContent value="goodreads" className="pt-6">
        <AdminGoodreads
          books={goodreads.books}
          total={goodreads.total}
          userId={goodreads.userId}
        />
      </TabsContent>
      <TabsContent value="instagram" className="pt-6">
        <AdminInstagram
          posts={instagram.posts}
          total={instagram.total}
          feedUrl={instagram.feedUrl}
        />
      </TabsContent>
      <TabsContent value="voice" className="pt-6">
        <AdminVoice config={voiceConfig} />
      </TabsContent>
      <TabsContent value="knowledge" className="pt-6">
        <AdminKnowledge />
      </TabsContent>
      <TabsContent value="settings" className="pt-6">
        <AdminSettingsForm settings={settings} />
      </TabsContent>
    </Tabs>
  )
}
