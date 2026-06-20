"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Save } from "lucide-react"

import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { UserAvatar } from "@/components/auth/user-menu"

type ProfileUser = {
  name?: string | null
  email?: string | null
  image?: string | null
}

export function ProfileForm({ user }: { user: ProfileUser }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(user.name ?? "")
  const [image, setImage] = useState(user.image ?? "")

  const trimmedName = name.trim()
  const trimmedImage = image.trim()
  const dirty =
    trimmedName !== (user.name ?? "").trim() ||
    trimmedImage !== (user.image ?? "").trim()

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!trimmedName) {
      toast.error("Please enter your name.")
      return
    }

    setLoading(true)
    await authClient.updateUser(
      { name: trimmedName, image: trimmedImage || undefined },
      {
        onSuccess: () => {
          toast.success("Profile updated! 🐾")
          setLoading(false)
          router.refresh()
        },
        onError: (ctx) => {
          toast.error(ctx.error.message ?? "Couldn't save your changes.")
          setLoading(false)
        },
      }
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-xl">Edit profile</CardTitle>
        <CardDescription>
          Your name and photo appear across the member area.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <div className="flex items-center gap-4">
              <UserAvatar
                user={{ name: trimmedName || user.name, image: trimmedImage }}
                className="size-16 ring-2 ring-primary/20"
              />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">
                  {trimmedName || "Your name"}
                </p>
                <p>{user.email}</p>
              </div>
            </div>

            <Field>
              <FieldLabel htmlFor="profile-name">Name</FieldLabel>
              <Input
                id="profile-name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="profile-image">Photo URL</FieldLabel>
              <Input
                id="profile-image"
                name="image"
                type="url"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://…"
                autoComplete="off"
              />
              <FieldDescription>
                Paste a link to an image, or leave blank to use your initials.
              </FieldDescription>
            </Field>

            <Button
              type="submit"
              className="h-10 w-fit"
              disabled={loading || !dirty}
            >
              {loading ? <Spinner /> : <Save data-icon="inline-start" />}
              Save changes
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
