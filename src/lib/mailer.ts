import nodemailer from "nodemailer";

/** Sends an email via Brevo SMTP relay (preferred) or the Brevo REST API,
 * falling back to a console log in dev when no credentials are configured.
 * Shared by OTP emails and the weekly PDF report / other transactional mail. */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
}) {
  const smtpHost = process.env.SMTP_HOST || "smtp-relay.brevo.com";
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const brevoKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL || "intellectflowteam@gmail.com";

  if (smtpUser && smtpPass) {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: false,
      auth: { user: smtpUser, pass: smtpPass },
    });
    await transporter.sendMail({
      from: `"IntellectFlow" <${senderEmail}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      attachments: opts.attachments,
    });
    return;
  }

  if (brevoKey) {
    // The Brevo REST API doesn't take raw attachment bytes in the same field
    // as SMTP; it wants base64 content per attachment.
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json", "api-key": brevoKey },
      body: JSON.stringify({
        sender: { name: "IntellectFlow", email: senderEmail },
        to: [{ email: opts.to }],
        subject: opts.subject,
        htmlContent: opts.html,
        attachment: opts.attachments?.map((a) => ({ name: a.filename, content: a.content.toString("base64") })),
      }),
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Brevo email sending failed: ${res.statusText} — ${errorText}`);
    }
    return;
  }

  console.log(`[DEV EMAIL LOG] No email credentials configured. Would have sent "${opts.subject}" to ${opts.to}.`);
}
