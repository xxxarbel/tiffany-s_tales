"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { UserPlus } from "lucide-react"

import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"

/**
 * Lets an admin create an account directly: the admin picks the email and a
 * password to hand to the person, and the account is created already verified,
 * so they can sign in straight away without a verification email.
 */
export function AdminAddUser() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [makeAdmin, setMakeAdmin] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const address = email.trim().toLowerCase()
    setPending(true)
    try {
      const { error } = await authClient.admin.createUser({
        email: address,
        password,
        name: name.trim() || address.split("@")[0],
        role: makeAdmin ? "admin" : "user",
        data: { emailVerified: true },
      })
      if (error) {
        toast.error(error.message ?? "Couldn't add that member.")
        return
      }
      toast.success(`${address} can now sign in with the password you set.`)
      setEmail("")
      setPassword("")
      setName("")
      setMakeAdmin(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add that member.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="font-display text-xl">Add a member</CardTitle>
        <CardDescription>
          Choose their email and a password to give them. No verification email
          is needed — they can sign in straight away.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="newMemberEmail">Email</FieldLabel>
              <Input
                id="newMemberEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                autoComplete="off"
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="newMemberPassword">Password</FieldLabel>
              <Input
                id="newMemberPassword"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                autoComplete="off"
                required
              />
              <FieldDescription>At least 8 characters.</FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="newMemberName">Name</FieldLabel>
              <Input
                id="newMemberName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Optional"
                autoComplete="off"
              />
            </Field>

            <Field orientation="horizontal">
              <Checkbox
                id="newMemberAdmin"
                checked={makeAdmin}
                onCheckedChange={(checked) => setMakeAdmin(checked === true)}
              />
              <FieldLabel htmlFor="newMemberAdmin" className="font-normal">
                Make them an admin
              </FieldLabel>
            </Field>

            <Button type="submit" className="h-10 w-fit" disabled={pending}>
              {pending ? <Spinner /> : <UserPlus data-icon="inline-start" />}
              Add member
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
