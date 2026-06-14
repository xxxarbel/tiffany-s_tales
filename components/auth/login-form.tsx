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
          toast.error(ctx.error.message ?? "Invalid email or password.")
          setLoading(false)
        },
      }
    )
  }

  return (
    <form onSubmit={onSubmit}>
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
          <FieldLabel htmlFor="login-password">Password</FieldLabel>
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
