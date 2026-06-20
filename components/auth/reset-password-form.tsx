"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { ShieldAlert } from "lucide-react"

import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"

export function ResetPasswordForm({
  token,
  error,
}: {
  token?: string
  error?: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Better Auth redirects here with ?error=INVALID_TOKEN when the link is bad or
  // expired, or with no token at all. Either way, there's nothing to reset.
  if (error || !token) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="size-6" />
        </div>
        <h3 className="font-display text-lg font-semibold">
          This link has expired
        </h3>
        <p className="text-sm text-muted-foreground">
          Password reset links are valid for 1 hour and can only be used once.
          Please request a fresh one.
        </p>
        <Button render={<Link href="/login" />} className="mt-2 h-10 w-full">
          Back to log in
        </Button>
      </div>
    )
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const newPassword = String(data.get("password") ?? "")
    const confirm = String(data.get("confirm") ?? "")

    if (newPassword.length < 8) {
      toast.error("Your password must be at least 8 characters.")
      return
    }
    if (newPassword !== confirm) {
      toast.error("Those passwords don't match.")
      return
    }

    setLoading(true)
    await authClient.resetPassword(
      { newPassword, token: token as string },
      {
        onSuccess: () => {
          toast.success("Password updated — you can log in now. 🐾")
          router.push("/login")
        },
        onError: (ctx) => {
          toast.error(
            ctx.error.message ?? "Couldn't reset your password. Please try again."
          )
          setLoading(false)
        },
      }
    )
  }

  return (
    <form onSubmit={onSubmit} suppressHydrationWarning>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="reset-password">New password</FieldLabel>
          <Input
            id="reset-password"
            name="password"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="reset-confirm">Confirm password</FieldLabel>
          <Input
            id="reset-confirm"
            name="confirm"
            type="password"
            placeholder="Re-enter your new password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>
        <Button type="submit" className="h-10 w-full" disabled={loading}>
          {loading ? <Spinner /> : null}
          Reset password
        </Button>
      </FieldGroup>
    </form>
  )
}
