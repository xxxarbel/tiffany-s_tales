"use server";

import { requireAdmin } from "@/lib/admin";
import { updateSettings } from "@/lib/settings";

export type SettingsState = { ok: boolean; error?: string } | null;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Accepts a plain address or a "Display Name <email@domain>" form.
function emailValid(value: string) {
  const match = value.match(/<([^>]+)>/);
  const address = (match ? match[1] : value).trim();
  return EMAIL_RE.test(address);
}

/**
 * Admin-only Server Action to update the app's email settings. Re-checks admin
 * inside the action (defense in depth — never trust that the page guarded it).
 */
export async function updateSettingsAction(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  await requireAdmin();

  const emailFrom = String(formData.get("emailFrom") ?? "").trim();
  const adminNotificationRecipient = String(
    formData.get("adminNotificationRecipient") ?? ""
  ).trim();
  const contactRecipient = String(formData.get("contactRecipient") ?? "").trim();

  for (const [label, value] of [
    ["From address", emailFrom],
    ["Admin-notification recipient", adminNotificationRecipient],
    ["Contact recipient", contactRecipient],
  ] as const) {
    if (!value) {
      return { ok: false, error: `${label} can't be empty.` };
    }
    if (!emailValid(value)) {
      return { ok: false, error: `${label} isn't a valid email address.` };
    }
  }

  try {
    await updateSettings({
      emailFrom,
      adminNotificationRecipient,
      contactRecipient,
    });
    return { ok: true };
  } catch (error) {
    console.error("[admin] failed to save settings:", error);
    return { ok: false, error: "Couldn't save settings. Please try again." };
  }
}
