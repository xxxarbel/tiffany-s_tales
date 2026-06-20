"use server";

import { sendContactEmail } from "@/lib/email";

export type ContactState = { ok: boolean; error?: string } | null;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Public contact-form Server Action. Validates input and emails the configured
 * contact recipient (reply-to = sender). No auth — this is a public form.
 */
export async function submitContact(
  _prev: ContactState,
  formData: FormData
): Promise<ContactState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const sendCopy = formData.get("copy") != null;

  if (!name || !email || !message) {
    return { ok: false, error: "Please fill in your name, email and message." };
  }
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  const res = await sendContactEmail({ name, email, message, sendCopy });
  if (!res.ok) {
    return {
      ok: false,
      error: "Sorry — we couldn't send your message. Please try again later.",
    };
  }
  return { ok: true };
}
