import { db } from "@/lib/db";
import { appSettings } from "@/lib/schema";

/**
 * Runtime-editable app settings, backed by the `app_settings` key/value table
 * and overridable from the admin UI. Each value falls back to an env var (and
 * then a hard-coded default) so the app behaves exactly as before until the
 * owner edits a value. Reads never throw — a DB failure falls back to env so
 * email can't break.
 */
export type AppSettings = {
  emailFrom: string;
  adminNotificationRecipient: string;
  contactRecipient: string;
};

// DB keys for each setting.
const KEY = {
  emailFrom: "email_from",
  adminNotificationRecipient: "admin_notification_recipient",
  contactRecipient: "contact_recipient",
} as const;

// Env fallbacks (preserve prior behaviour from lib/email.ts).
const FALLBACK_FROM =
  process.env.RESEND_FROM ?? "Tiffany's Tales <onboarding@resend.dev>";
const FALLBACK_ADMIN = process.env.ADMIN_EMAIL ?? "arbeling@gmail.com";
const FALLBACK_CONTACT = process.env.CONTACT_EMAIL; // undefined → use admin recipient

/**
 * Resolves the effective settings: DB value ?? env fallback ?? default. Read on
 * each call (a ~3-row primary-key select) so writes are always reflected, even
 * across separate serverless instances.
 */
export async function getSettings(): Promise<AppSettings> {
  let stored: Record<string, string> = {};
  try {
    const rows = await db.select().from(appSettings);
    stored = Object.fromEntries(
      rows
        .filter((r) => r.value != null && r.value !== "")
        .map((r) => [r.key, r.value as string])
    );
  } catch (error) {
    console.error("[settings] read failed, using env fallbacks:", error);
  }

  const adminNotificationRecipient =
    stored[KEY.adminNotificationRecipient] || FALLBACK_ADMIN;

  return {
    emailFrom: stored[KEY.emailFrom] || FALLBACK_FROM,
    adminNotificationRecipient,
    contactRecipient:
      stored[KEY.contactRecipient] ||
      FALLBACK_CONTACT ||
      adminNotificationRecipient,
  };
}

/** Upserts the provided settings. Only keys present in `partial` are written. */
export async function updateSettings(
  partial: Partial<AppSettings>
): Promise<void> {
  const entries = Object.entries(KEY)
    .filter(([field]) => partial[field as keyof AppSettings] !== undefined)
    .map(([field, key]) => ({
      key,
      value: (partial[field as keyof AppSettings] ?? "").trim(),
    }));

  for (const { key, value } of entries) {
    await db
      .insert(appSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value, updatedAt: new Date() },
      });
  }
}
