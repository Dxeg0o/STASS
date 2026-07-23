import type { ReactElement } from "react";
import { Resend } from "resend";
import "server-only";

export async function sendEmail({
  to,
  subject,
  html,
  react,
  attachments,
}: {
  to: string | string[];
  subject: string;
  html?: string;
  react?: ReactElement;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentId?: string;
  }>;
}) {
  const emailHtml = html ?? (react ? await renderEmailElement(react) : undefined);

  if (!emailHtml) {
    throw new Error("Email content is required.");
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  if (!from) {
    throw new Error("EMAIL_FROM is not configured.");
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    html: emailHtml,
    attachments,
  });

  if (error) {
    console.error("[sendEmail] Resend error:", error);
    throw new Error(error.message);
  }
}

async function renderEmailElement(react: ReactElement) {
  const { renderToStaticMarkup } = await import("react-dom/server");

  return `<!DOCTYPE html>${renderToStaticMarkup(react)}`;
}
