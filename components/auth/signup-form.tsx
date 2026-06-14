"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"

export function SignupForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

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
          toast.success(`Welcome to the pack, ${name}! 🐾`)
          router.push("/dashboard")
          router.refresh()
        },
        onError: (ctx) => {
          toast.error(ctx.error.message ?? "Something went wrong. Please try again.")
          setLoading(false)
        },
      }
    )
  }

  return (
    <form onSubmit={onSubmit}>
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
