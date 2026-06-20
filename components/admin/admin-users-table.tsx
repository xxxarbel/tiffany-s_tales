"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  MoreHorizontal,
  Pause,
  Play,
  ShieldCheck,
  ShieldOff,
  Trash2,
} from "lucide-react"

import { authClient } from "@/lib/auth-client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Spinner } from "@/components/ui/spinner"

export type AdminUser = {
  id: string
  name: string
  email: string
  emailVerified: boolean
  createdAt: Date | string
  role?: string | null
  banned?: boolean | null
}

type Action = "promote" | "demote" | "pause" | "resume" | "remove"

const PROVIDER_LABELS: Record<string, string> = {
  credential: "Email",
  google: "Google",
}

function actionCopy(action: Action, name: string) {
  switch (action) {
    case "promote":
      return {
        title: "Make this member an admin?",
        body: `${name} will get full admin access — managing users and settings.`,
        confirm: "Make admin",
        destructive: false,
      }
    case "demote":
      return {
        title: "Revoke admin access?",
        body: `${name} will go back to a regular member with no admin access.`,
        confirm: "Revoke admin",
        destructive: false,
      }
    case "pause":
      return {
        title: "Pause this member?",
        body: `${name} won't be able to sign in until you resume them. Their account and data are kept.`,
        confirm: "Pause member",
        destructive: true,
      }
    case "resume":
      return {
        title: "Resume this member?",
        body: `${name} will be able to sign in again.`,
        confirm: "Resume member",
        destructive: false,
      }
    case "remove":
      return {
        title: "Remove this member?",
        body: `This permanently deletes ${name}'s account, sessions and sign-in methods. This can't be undone.`,
        confirm: "Remove member",
        destructive: true,
      }
  }
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function AdminUsersTable({
  users,
  providersByUser,
  currentUserId,
}: {
  users: AdminUser[]
  providersByUser: Record<string, string[]>
  currentUserId: string
}) {
  const router = useRouter()
  const [confirm, setConfirm] = useState<{ user: AdminUser; action: Action } | null>(
    null
  )
  const [busy, setBusy] = useState(false)

  const sorted = [...users].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  async function runAction() {
    if (!confirm) return
    const { user, action } = confirm
    setBusy(true)

    const calls: Record<Action, () => Promise<{ error?: unknown }>> = {
      promote: () => authClient.admin.setRole({ userId: user.id, role: "admin" }),
      demote: () => authClient.admin.setRole({ userId: user.id, role: "user" }),
      pause: () => authClient.admin.banUser({ userId: user.id }),
      resume: () => authClient.admin.unbanUser({ userId: user.id }),
      remove: () => authClient.admin.removeUser({ userId: user.id }),
    }

    const successMsg: Record<Action, string> = {
      promote: `${user.name} is now an admin.`,
      demote: `${user.name} is no longer an admin.`,
      pause: `${user.name} has been paused.`,
      resume: `${user.name} has been resumed.`,
      remove: `${user.name} has been removed.`,
    }

    try {
      const { error } = await calls[action]()
      if (error) {
        toast.error(
          (error as { message?: string }).message ?? "That action failed."
        )
      } else {
        toast.success(successMsg[action])
        router.refresh()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That action failed.")
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  const copy = confirm ? actionCopy(confirm.action, confirm.user.name) : null

  return (
    <>
      <div className="overflow-hidden rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead className="hidden sm:table-cell">Provider</TableHead>
              <TableHead className="hidden md:table-cell">Joined</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((user) => {
              const isSelf = user.id === currentUserId
              const isAdmin = user.role === "admin"
              const providers = providersByUser[user.id] ?? []
              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{user.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {providers.length > 0 ? (
                        providers.map((p) => (
                          <Badge key={p} variant="outline">
                            {PROVIDER_LABELS[p] ?? p}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell>
                    {isAdmin ? (
                      <Badge>Admin</Badge>
                    ) : (
                      <Badge variant="outline">Member</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.banned ? (
                      <Badge variant="destructive">Paused</Badge>
                    ) : (
                      <Badge variant="secondary">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Actions for ${user.name}`}
                          />
                        }
                      >
                        <MoreHorizontal />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() =>
                            setConfirm({
                              user,
                              action: isAdmin ? "demote" : "promote",
                            })
                          }
                        >
                          {isAdmin ? <ShieldOff /> : <ShieldCheck />}
                          {isAdmin ? "Revoke admin" : "Make admin"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={isSelf}
                          onClick={() =>
                            setConfirm({
                              user,
                              action: user.banned ? "resume" : "pause",
                            })
                          }
                        >
                          {user.banned ? <Play /> : <Pause />}
                          {user.banned ? "Resume member" : "Pause member"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={isSelf}
                          onClick={() => setConfirm({ user, action: "remove" })}
                        >
                          <Trash2 />
                          Remove member
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setConfirm(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy?.title}</AlertDialogTitle>
            <AlertDialogDescription>{copy?.body}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={copy?.destructive ? "destructive" : "default"}
              disabled={busy}
              onClick={runAction}
            >
              {busy ? <Spinner /> : null}
              {copy?.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
