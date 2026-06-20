"use client"

import { useActionState, useEffect } from "react"
import { toast } from "sonner"
import { Save } from "lucide-react"

import type { AppSettings } from "@/lib/settings"
import { updateSettingsAction, type SettingsState } from "@/app/admin/actions"
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
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"

export function AdminSettingsForm({ settings }: { settings: AppSettings }) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(
    updateSettingsAction,
    null
  )

  useEffect(() => {
    if (!state) return
    if (state.ok) {
      toast.success("Email settings saved.")
    } else if (state.error) {
      toast.error(state.error)
    }
  }, [state])

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="font-display text-xl">Email settings</CardTitle>
        <CardDescription>
          These override the environment defaults at runtime — no redeploy
          needed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="contactRecipient">
                Contact-form recipient
              </FieldLabel>
              <Input
                id="contactRecipient"
                name="contactRecipient"
                type="email"
                defaultValue={settings.contactRecipient}
                placeholder="you@example.com"
                required
              />
              <FieldDescription>
                Where messages from the Contact page are sent.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="emailFrom">From address</FieldLabel>
              <Input
                id="emailFrom"
                name="emailFrom"
                defaultValue={settings.emailFrom}
                placeholder="Tiffany's Tales <hello@yourdomain.com>"
                required
              />
              <FieldDescription>
                The sender for verification, welcome and contact emails. Must use
                a domain verified in Resend to reach non-owner addresses.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="adminNotificationRecipient">
                Admin-notification recipient
              </FieldLabel>
              <Input
                id="adminNotificationRecipient"
                name="adminNotificationRecipient"
                type="email"
                defaultValue={settings.adminNotificationRecipient}
                placeholder="you@example.com"
                required
              />
              <FieldDescription>
                Who gets notified when a new member registers.
              </FieldDescription>
            </Field>

            <Button type="submit" className="h-10 w-fit" disabled={pending}>
              {pending ? <Spinner /> : <Save data-icon="inline-start" />}
              Save settings
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
