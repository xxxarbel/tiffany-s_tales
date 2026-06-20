import { Resend } from "resend";

import { getSettings } from "@/lib/settings";

// Resend is optional: if RESEND_API_KEY isn't set, the app still runs and
// registration simply skips the emails (logged, never thrown). This keeps local
// dev and builds working without email configured.
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// The "from" address and recipients are now resolved at send time from
// `getSettings()` (DB-backed, admin-editable, with env fallbacks) instead of
// module-load constants — so the owner can change them without a redeploy.
// Until a custom domain is verified in Resend, the "from" must stay
// `onboarding@resend.dev` and mail only delivers to the Resend account owner.

type NewMember = { name?: string | null; email: string };

/**
 * Fires on every new registration (email/password and Google). Sends:
 *   1. an admin notification to ADMIN_EMAIL, and
 *   2. a welcome email to the new member.
 *
 * Never throws — a failed send is logged but must not break sign-up. Both sends
 * run concurrently and are awaited (important on serverless: a fire-and-forget
 * send can be dropped when the function freezes after responding).
 */
export async function sendRegistrationEmails(member: NewMember): Promise<void> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping registration emails");
    return;
  }

  const { emailFrom, adminNotificationRecipient } = await getSettings();
  const displayName = member.name?.trim() || "there";

  const results = await Promise.allSettled([
    resend.emails.send({
      from: emailFrom,
      to: [adminNotificationRecipient],
      subject: `New member registered: ${member.name?.trim() || member.email}`,
      html: adminNotificationHtml(member),
    }),
    resend.emails.send({
      from: emailFrom,
      to: [member.email],
      subject: "Welcome to Tiffany's Tales 🐾",
      html: welcomeHtml(displayName),
    }),
  ]);

  results.forEach((result, index) => {
    const label = index === 0 ? "admin notification" : "member welcome";
    if (result.status === "rejected") {
      console.error(`[email] ${label} failed:`, result.reason);
    } else if (result.value.error) {
      console.error(`[email] ${label} error:`, result.value.error);
    } else {
      console.log(`[email] ${label} sent:`, result.value.data?.id);
    }
  });
}

type VerificationEmail = { name?: string | null; email: string; url: string };

/**
 * Sends the "verify your email" message for email/password sign-ups. Better Auth
 * generates the one-time verification `url`; clicking it hits
 * /api/auth/verify-email, marks the address verified and (via
 * autoSignInAfterVerification) signs the member in.
 *
 * Never throws — a failed send is logged but must not break sign-up.
 */
export async function sendVerificationEmail({
  name,
  email,
  url,
}: VerificationEmail): Promise<void> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping verification email");
    return;
  }

  const { emailFrom } = await getSettings();
  const displayName = name?.trim() || "there";

  try {
    const { data, error } = await resend.emails.send({
      from: emailFrom,
      to: [email],
      subject: "Verify your email · Tiffany's Tales 🐾",
      html: verificationHtml(displayName, url),
    });
    if (error) {
      console.error("[email] verification email error:", error);
    } else {
      console.log("[email] verification email sent:", data?.id);
    }
  } catch (err) {
    console.error("[email] verification email failed:", err);
  }
}

type ContactMessage = {
  name: string;
  email: string;
  message: string;
  sendCopy?: boolean;
};

/**
 * Sends a contact-form submission to the configured contact recipient, with
 * reply-to set to the sender so the owner can reply directly. Optionally copies
 * the sender. Never throws; no-op when RESEND_API_KEY is unset.
 */
export async function sendContactEmail({
  name,
  email,
  message,
  sendCopy,
}: ContactMessage): Promise<{ ok: boolean }> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping contact email");
    return { ok: false };
  }

  const { emailFrom, contactRecipient } = await getSettings();

  try {
    const { data, error } = await resend.emails.send({
      from: emailFrom,
      to: [contactRecipient],
      replyTo: email,
      subject: `New contact message from ${name}`,
      html: contactHtml({ name, email, message }),
    });
    if (error) {
      console.error("[email] contact email error:", error);
      return { ok: false };
    }
    console.log("[email] contact email sent:", data?.id);

    // Optional copy to the sender — best-effort, doesn't affect the result.
    if (sendCopy) {
      await resend.emails
        .send({
          from: emailFrom,
          to: [email],
          subject: "Your message to Tiffany's Tales 🐾",
          html: contactCopyHtml({ name, message }),
        })
        .catch((err) => console.error("[email] contact copy failed:", err));
    }

    return { ok: true };
  } catch (err) {
    console.error("[email] contact email failed:", err);
    return { ok: false };
  }
}

function verificationHtml(name: string, url: string): string {
  return shell(`
    <h1 style="margin:0 0 12px;font-size:22px;color:#45284a;">Verify your email, ${escapeHtml(name)} 🐾</h1>
    <p style="margin:0 0 20px;color:#3a2340;line-height:1.6;">
      Thanks for joining Tiffany's Tales! Please confirm this is your email
      address by tapping the button below.
    </p>
    <p style="margin:0 0 24px;">
      <a href="${escapeHtml(url)}" style="display:inline-block;background:#7a4a7c;color:#f8f3f6;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">
        Verify my email
      </a>
    </p>
    <p style="margin:0 0 8px;color:#6c5a6a;font-size:13px;">
      Or paste this link into your browser:
    </p>
    <p style="margin:0 0 16px;word-break:break-all;font-size:13px;">
      <a href="${escapeHtml(url)}" style="color:#7a4a7c;">${escapeHtml(url)}</a>
    </p>
    <p style="margin:0;color:#6c5a6a;font-size:13px;">
      If you didn't create this account, you can safely ignore this email.
    </p>
  `);
}

function contactHtml({
  name,
  email,
  message,
}: {
  name: string;
  email: string;
  message: string;
}): string {
  return shell(`
    <h1 style="margin:0 0 12px;font-size:20px;color:#45284a;">New contact message 🐾</h1>
    <table style="border-collapse:collapse;font-size:14px;color:#3a2340;margin-bottom:16px;">
      <tr><td style="padding:4px 16px 4px 0;color:#6c5a6a;">Name</td><td style="padding:4px 0;font-weight:600;">${escapeHtml(name)}</td></tr>
      <tr><td style="padding:4px 16px 4px 0;color:#6c5a6a;">Email</td><td style="padding:4px 0;font-weight:600;">${escapeHtml(email)}</td></tr>
    </table>
    <p style="margin:0 0 6px;color:#6c5a6a;font-size:13px;">Message</p>
    <p style="margin:0;color:#3a2340;line-height:1.6;white-space:pre-wrap;">${escapeHtml(message)}</p>
  `);
}

function contactCopyHtml({
  name,
  message,
}: {
  name: string;
  message: string;
}): string {
  return shell(`
    <h1 style="margin:0 0 12px;font-size:20px;color:#45284a;">Thanks, ${escapeHtml(name)} 🐾</h1>
    <p style="margin:0 0 16px;color:#3a2340;line-height:1.6;">
      Thanks for getting in touch with Tiffany's Tales — we'll be in touch soon. Here's a copy of your message:
    </p>
    <p style="margin:0;color:#3a2340;line-height:1.6;white-space:pre-wrap;">${escapeHtml(message)}</p>
  `);
}

function adminNotificationHtml(member: NewMember): string {
  return shell(`
    <h1 style="margin:0 0 12px;font-size:20px;color:#45284a;">New member registered 🐾</h1>
    <p style="margin:0 0 16px;color:#3a2340;">Someone just joined the pack:</p>
    <table style="border-collapse:collapse;font-size:14px;color:#3a2340;">
      <tr><td style="padding:4px 16px 4px 0;color:#6c5a6a;">Name</td><td style="padding:4px 0;font-weight:600;">${escapeHtml(member.name?.trim() || "—")}</td></tr>
      <tr><td style="padding:4px 16px 4px 0;color:#6c5a6a;">Email</td><td style="padding:4px 0;font-weight:600;">${escapeHtml(member.email)}</td></tr>
    </table>
  `);
}

function welcomeHtml(name: string): string {
  return shell(`
    <h1 style="margin:0 0 12px;font-size:22px;color:#45284a;">Welcome to the pack, ${escapeHtml(name)}! 🐾</h1>
    <p style="margin:0 0 16px;color:#3a2340;line-height:1.6;">
      Your Tiffany's Tales account is all set up. We're so glad to have you — books,
      monthly meet-ups and a wonderful community of readers await.
    </p>
    <p style="margin:0;color:#6c5a6a;font-size:14px;">Happy reading,<br/>Tiffany &amp; the Tales team</p>
  `);
}

// Shared email wrapper (brand purple/cream).
function shell(inner: string): string {
  return `<div style="background:#f8f3f6;padding:32px 0;font-family:Helvetica,Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e6d9e4;border-radius:12px;padding:28px;">
      ${inner}
    </div>
  </div>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
