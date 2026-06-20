"use client"

import { useState } from "react"
import { toast } from "sonner"
import { MailCheck } from "lucide-react"

import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"

export function SignupForm() {
  const [loading, setLoading] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const name = String(data.get("name") ?? "").trim()
    const email = String(data.get("email") ?? "").trim()
    const password = String(data.get("password") ?? "")

    setLoading(true)
    await authClient.signUp.email(
      { name, email, password },
      {
        onSuccess: () => {
          // Email verification is required, so no session is created here — the
          // member must click the link we just emailed before they can log in.
          toast.success("Almost there — check your email to verify! 🐾")
          setSentTo(email)
        },
        onError: (ctx) => {
          toast.error(ctx.error.message ?? "Something went wrong. Please try again.")
          setLoading(false)
        },
      }
    )
  }

  if (sentTo) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <MailCheck className="size-6" />
        </div>
        <h3 className="font-display text-lg font-semibold">Check your inbox</h3>
        <p className="text-sm text-muted-foreground">
          We&apos;ve sent a verification link to{" "}
          <span className="font-medium text-foreground">{sentTo}</span>. Click it
          to activate your account, then log in.
        </p>
        <p className="text-xs text-muted-foreground">
          Can&apos;t find it? Check your spam folder.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} suppressHydrationWarning>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="signup-name">Name</FieldLabel>
          <Input id="signup-name" name="name" placeholder="Your name" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="signup-email">Email</FieldLabel>
          <Input
            id="signup-email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="signup-password">Password</FieldLabel>
          <Input
            id="signup-password"
            name="password"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>
        <Button type="submit" className="h-10 w-full" disabled={loading}>
          {loading ? <Spinner /> : null}
          Create my account
        </Button>
      </FieldGroup>
    </form>
  )
}
