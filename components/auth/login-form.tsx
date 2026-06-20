"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"

export function LoginForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  // "login" shows the credentials form; "forgot" swaps to the reset-request
  // form (email only). Keeps both flows on the Log in tab without a dialog.
  const [mode, setMode] = useState<"login" | "forgot">("login")

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const email = String(data.get("email") ?? "").trim()
    const password = String(data.get("password") ?? "")

    setLoading(true)
    await authClient.signIn.email(
      { email, password },
      {
        onSuccess: () => {
          toast.success("Welcome back! 🐾")
          router.push("/dashboard")
          router.refresh()
        },
        onError: (ctx) => {
          // 403 = email not verified yet. Better Auth re-sends the verification
          // link on this attempt, so point the member back to their inbox.
          if (ctx.error.status === 403) {
            toast.error(
              "Please verify your email first — we've sent you a fresh link."
            )
          } else {
            toast.error(ctx.error.message ?? "Invalid email or password.")
          }
          setLoading(false)
        },
      }
    )
  }

  async function onForgotSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const email = String(data.get("email") ?? "").trim()
    if (!email) return

    setLoading(true)
    await authClient.requestPasswordReset(
      { email, redirectTo: `${window.location.origin}/reset-password` },
      {
        onSuccess: () => {
          // Deliberately generic so we don't reveal whether an account exists.
          toast.success(
            "If that email is registered, we've sent a reset link. Check your inbox 🐾"
          )
          setMode("login")
          setLoading(false)
        },
        onError: (ctx) => {
          toast.error(
            ctx.error.message ?? "Couldn't send the reset link. Please try again."
          )
          setLoading(false)
        },
      }
    )
  }

  if (mode === "forgot") {
    return (
      <form onSubmit={onForgotSubmit} suppressHydrationWarning>
        <FieldGroup>
          <p className="text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a link to reset your
            password.
          </p>
          <Field>
            <FieldLabel htmlFor="forgot-email">Email</FieldLabel>
            <Input
              id="forgot-email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </Field>
          <Button type="submit" className="h-10 w-full" disabled={loading}>
            {loading ? <Spinner /> : null}
            Send reset link
          </Button>
          <Button
            type="button"
            variant="link"
            className="h-auto w-full"
            disabled={loading}
            onClick={() => setMode("login")}
          >
            Back to log in
          </Button>
        </FieldGroup>
      </form>
    )
  }

  return (
    <form onSubmit={onSubmit} suppressHydrationWarning>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="login-email">Email</FieldLabel>
          <Input
            id="login-email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </Field>
        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="login-password">Password</FieldLabel>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto px-0 text-xs font-normal"
              onClick={() => setMode("forgot")}
            >
              Forgot password?
            </Button>
          </div>
          <Input
            id="login-password"
            name="password"
            type="password"
            placeholder="Your password"
            autoComplete="current-password"
            required
          />
        </Field>
        <Button type="submit" className="h-10 w-full" disabled={loading}>
          {loading ? <Spinner /> : null}
          Log in
        </Button>
      </FieldGroup>
    </form>
  )
}
