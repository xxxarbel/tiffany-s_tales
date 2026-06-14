"use client"

import { toast } from "sonner"
import { SendIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"

export function ContactForm() {
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    toast.success("Thanks for your message — I'll be in touch soon!", {
      description: "Welcome to the pack. 🐾",
    })
    form.reset()
  }

  return (
    <form onSubmit={onSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input id="name" name="name" placeholder="Your name" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="message">Message</FieldLabel>
          <Textarea
            id="message"
            name="message"
            placeholder="Tell me which pack you'd like to join…"
            rows={4}
            required
          />
        </Field>
        <Field orientation="horizontal">
          <Checkbox id="copy" name="copy" defaultChecked />
          <FieldLabel htmlFor="copy" className="font-normal">
            Send me a copy
          </FieldLabel>
        </Field>
        <Button type="submit" className="h-10 w-full">
          <SendIcon data-icon="inline-start" />
          Send message
        </Button>
      </FieldGroup>
    </form>
  )
}
