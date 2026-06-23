"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";

import {
  saveReadingProfileAction,
  type ProfileState,
} from "@/app/profile/actions";
import type { ReadingProfile } from "@/lib/user-profile";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";

// The five prompts, in order. `name` matches the keys read by the server action.
const PROMPTS: {
  name: keyof ReadingProfile;
  label: string;
  placeholder: string;
  rows: number;
}[] = [
  {
    name: "aboutYou",
    label: "Tell me about yourself",
    placeholder: "A little about who you are…",
    rows: 4,
  },
  {
    name: "booksLike",
    label: "Tell me about what books you like",
    placeholder: "The books or authors you love…",
    rows: 3,
  },
  {
    name: "dislikeInBooks",
    label: "Tell me what you don't like in books",
    placeholder: "Things that put you off a book…",
    rows: 3,
  },
  {
    name: "likeInBooks",
    label: "Tell me what you do like in books",
    placeholder: "What makes a book a great read for you…",
    rows: 3,
  },
  {
    name: "preferredGenres",
    label: "Tell me your preferred genres",
    placeholder: "e.g. cosy mystery, literary fiction, fantasy…",
    rows: 2,
  },
];

export function ReadingProfileForm({ profile }: { profile: ReadingProfile }) {
  const [draft, setDraft] = useState<ReadingProfile>(profile);
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(
    saveReadingProfileAction,
    null
  );

  useEffect(() => {
    if (!state) return;
    if (state.ok) toast.success("Reading profile saved! 🐾");
    else toast.error(state.error);
  }, [state]);

  function set<K extends keyof ReadingProfile>(
    key: K,
    value: ReadingProfile[K]
  ) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-xl">
          About you &amp; your reading
        </CardTitle>
        <CardDescription>
          Tell us about yourself and your taste in books — it helps us (and your
          book club guide) suggest reads you&apos;ll love.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction}>
          <FieldGroup>
            {PROMPTS.map((prompt) => (
              <Field key={prompt.name}>
                <FieldLabel htmlFor={prompt.name}>{prompt.label}</FieldLabel>
                <Textarea
                  id={prompt.name}
                  name={prompt.name}
                  rows={prompt.rows}
                  value={draft[prompt.name]}
                  onChange={(e) => set(prompt.name, e.target.value)}
                  placeholder={prompt.placeholder}
                />
              </Field>
            ))}

            <Button type="submit" className="h-10 w-fit" disabled={pending}>
              {pending ? <Spinner /> : <Save data-icon="inline-start" />}
              Save reading profile
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
