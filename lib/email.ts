import { Resend } from "resend";

// Resend is optional: if RESEND_API_KEY isn't set, the app still runs and
// registration simply skips the emails (logged, never thrown). This keeps local
// dev and builds working without email configured.
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// The "from" address. Until a custom domain is verified in Resend, mail must be
// sent from Resend's shared sender `onboarding@resend.dev`. Once you verify a
// domain at https://resend.com/domains, set RESEND_FROM (e.g.
// "Tiffany's Tales <hello@tiffanystales.com>") and member emails will deliver.
const FROM = process.env.RESEND_FROM ?? "Tiffany's Tales <onboarding@resend.dev>";

// Where new-registration notifications are sent. Override with ADMIN_EMAIL.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "arbeling@gmail.com";

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

  const displayName = member.name?.trim() || "there";

  const results = await Promise.allSettled([
    resend.emails.send({
      from: FROM,
      to: [ADMIN_EMAIL],
      subject: `New member registered: ${member.name?.trim() || member.email}`,
      html: adminNotificationHtml(member),
    }),
    resend.emails.send({
      from: FROM,
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
