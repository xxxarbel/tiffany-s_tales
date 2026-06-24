"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { RotateCcw, Save } from "lucide-react";

import {
  saveVoiceConfigAction,
  type SettingsState,
} from "@/app/admin/actions";
import {
  AVATAR_SCALE_MAX,
  AVATAR_SCALE_MIN,
  DEFAULT_AGENT_CONFIG,
  defaultModelFor,
  LANGUAGES,
  LISTEN_MODELS,
  THINK_MODELS,
  THINK_PROVIDERS,
  VOICES,
  type AgentConfig,
} from "@/lib/voice-agent/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

const selectCls =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function AdminVoice({ config }: { config: AgentConfig }) {
  const [draft, setDraft] = useState<AgentConfig>(config);
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(
    saveVoiceConfigAction,
    null
  );

  useEffect(() => {
    if (!state) return;
    if (state.ok) toast.success("Voice assistant settings saved.");
    else if (state.error) toast.error(state.error);
  }, [state]);

  function set<K extends keyof AgentConfig>(key: K, value: AgentConfig[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  // Models for the chosen provider, preserving a saved custom id as an option.
  const providerModels = THINK_MODELS[draft.thinkProvider] ?? [];
  const modelOptions = providerModels.some((m) => m.value === draft.thinkModel)
    ? providerModels
    : [{ value: draft.thinkModel, label: draft.thinkModel }, ...providerModels];

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="font-display text-xl">Voice assistant</CardTitle>
        <CardDescription>
          Control the floating voice guide for every visitor — its brain, voice,
          and personality. Changes apply the next time someone starts a chat; no
          redeploy needed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction}>
          <FieldGroup>
            {/* Provider + model */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="thinkProvider">LLM provider</FieldLabel>
                <select
                  id="thinkProvider"
                  name="thinkProvider"
                  className={selectCls}
                  value={draft.thinkProvider}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      thinkProvider: e.target.value,
                      thinkModel: defaultModelFor(e.target.value),
                    }))
                  }
                >
                  {THINK_PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <FieldDescription>
                  All providers are Deepgram-managed — no extra API key.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="thinkModel">Model</FieldLabel>
                <select
                  id="thinkModel"
                  name="thinkModel"
                  className={selectCls}
                  value={draft.thinkModel}
                  onChange={(e) => set("thinkModel", e.target.value)}
                >
                  {modelOptions.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <FieldDescription>
                  The assistant&apos;s brain. Haiku is fast and friendly.
                </FieldDescription>
              </Field>
            </div>

            {/* Voice + language */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="voice">Voice</FieldLabel>
                <select
                  id="voice"
                  name="voice"
                  className={selectCls}
                  value={draft.voice}
                  onChange={(e) => set("voice", e.target.value)}
                >
                  {VOICES.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
                <FieldDescription>Deepgram Aura-2 voice.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="language">Language</FieldLabel>
                <select
                  id="language"
                  name="language"
                  className={selectCls}
                  value={draft.language}
                  onChange={(e) => set("language", e.target.value)}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Speed + temperature */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="speed">
                  Speaking rate · {draft.speed.toFixed(2)}×
                </FieldLabel>
                <input
                  id="speed"
                  name="speed"
                  type="range"
                  min={0.7}
                  max={1.5}
                  step={0.05}
                  value={draft.speed}
                  onChange={(e) => set("speed", Number(e.target.value))}
                  className="mt-2 w-full accent-primary"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="temperature">
                  Creativity · {draft.temperature.toFixed(2)}
                </FieldLabel>
                <input
                  id="temperature"
                  name="temperature"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={draft.temperature}
                  onChange={(e) => set("temperature", Number(e.target.value))}
                  className="mt-2 w-full accent-primary"
                />
                <FieldDescription>
                  Lower is more focused; higher is more playful.
                </FieldDescription>
              </Field>
            </div>

            {/* Avatar size — controls the floating launcher on the live site. */}
            <Field>
              <FieldLabel htmlFor="avatarScale">
                Avatar size · {draft.avatarScale.toFixed(1)}×
              </FieldLabel>
              <div className="flex items-center gap-4">
                <div className="flex size-48 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/voice-assistant.png"
                    alt="Floating avatar size preview"
                    style={{
                      width: 56 * draft.avatarScale,
                      height: 56 * draft.avatarScale,
                    }}
                    className="shrink-0 object-contain drop-shadow-[0_3px_5px_rgba(0,0,0,0.35)] transition-all"
                  />
                </div>
                <div className="flex-1">
                  <input
                    id="avatarScale"
                    name="avatarScale"
                    type="range"
                    min={AVATAR_SCALE_MIN}
                    max={AVATAR_SCALE_MAX}
                    step={0.1}
                    value={draft.avatarScale}
                    onChange={(e) => set("avatarScale", Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <FieldDescription className="mt-2">
                    Sets how big Tiff&apos;s floating avatar appears on the site.
                    Visitors can also drag her anywhere on the screen.
                  </FieldDescription>
                </div>
              </div>
            </Field>

            {/* Speech model */}
            <Field>
              <FieldLabel htmlFor="listenModel">Speech recognition</FieldLabel>
              <select
                id="listenModel"
                name="listenModel"
                className={selectCls}
                value={draft.listenModel}
                onChange={(e) => set("listenModel", e.target.value)}
              >
                {LISTEN_MODELS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>

            {/* Greeting */}
            <Field>
              <FieldLabel htmlFor="greeting">Greeting</FieldLabel>
              <Input
                id="greeting"
                name="greeting"
                value={draft.greeting}
                onChange={(e) => set("greeting", e.target.value)}
                placeholder="Hello and welcome to Tiffany's Tales!"
              />
              <FieldDescription>
                The first line the assistant speaks when a chat starts.
              </FieldDescription>
            </Field>

            {/* Prompt */}
            <Field>
              <FieldLabel htmlFor="prompt">Personality &amp; instructions</FieldLabel>
              <Textarea
                id="prompt"
                name="prompt"
                rows={14}
                value={draft.prompt}
                onChange={(e) => set("prompt", e.target.value)}
                spellCheck={false}
                className="font-mono text-xs leading-relaxed"
              />
              <FieldDescription>
                The system prompt — who the assistant is and what it knows about
                the website. This is what makes it an expert on Tiffany&apos;s
                Tales.
              </FieldDescription>
            </Field>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" className="h-10" disabled={pending}>
                {pending ? <Spinner /> : <Save data-icon="inline-start" />}
                Save voice settings
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10"
                disabled={pending}
                onClick={() => setDraft(DEFAULT_AGENT_CONFIG)}
              >
                <RotateCcw data-icon="inline-start" />
                Reset to defaults
              </Button>
            </div>
            <FieldDescription>
              “Reset to defaults” only fills the form — click Save to apply it.
            </FieldDescription>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
