"use client"

import { Users, Mail, BarChart3 } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { AppSettings } from "@/lib/settings"
import type { AnalyticsSummary } from "@/lib/analytics"
import { AdminUsersTable, type AdminUser } from "@/components/admin/admin-users-table"
import { AdminSettingsForm } from "@/components/admin/admin-settings-form"
import { AdminAnalytics } from "@/components/admin/admin-analytics"

export function AdminPanel({
  users,
  providersByUser,
  currentUserId,
  settings,
  analytics,
}: {
  users: AdminUser[]
  providersByUser: Record<string, string[]>
  currentUserId: string
  settings: AppSettings
  analytics: AnalyticsSummary[]
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
      <TabsContent value="settings" className="pt-6">
        <AdminSettingsForm settings={settings} />
      </TabsContent>
    </Tabs>
  )
}
