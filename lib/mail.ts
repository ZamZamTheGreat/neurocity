import nodemailer from "nodemailer";

type Mail = { to: string; subject: string; text: string };

export async function sendMail(message: Mail) {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    console.info("email delivery skipped: SMTP is not configured", { to: message.to, subject: message.subject });
    return { delivered: false, reason: "not_configured" } as const;
  }
  const port = Number(process.env.SMTP_PORT ?? 465);
  const transport = nodemailer.createTransport({ host: process.env.SMTP_HOST ?? "smtp.gmail.com", port, secure: port === 465, auth: { user, pass } });
  await transport.sendMail({ from: process.env.MAIL_FROM ?? `NeuroCity <${user}>`, ...message });
  return { delivered: true } as const;
}
