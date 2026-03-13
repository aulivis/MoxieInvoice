import { Resend } from 'resend';

/**
 * Resend client. Only created when RESEND_API_KEY is set.
 * Set RESEND_API_KEY in .env (replace re_xxxxxxxxx with your real API key from https://resend.com).
 */
function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey?.trim()) return null;
  return new Resend(apiKey.trim());
}

export type SendEmailOptions = {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

/**
 * Send an email via Resend. No-op if RESEND_API_KEY is not set.
 * Returns { data, error } like Resend's send().
 */
export async function sendEmail(options: SendEmailOptions): Promise<
  | { data: { id: string }; error: null }
  | { data: null; error: { message: string } }
> {
  const resend = getResendClient();
  if (!resend) {
    return { data: null, error: { message: 'RESEND_API_KEY is not set' } };
  }
  return resend.emails.send({
    from: options.from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}
