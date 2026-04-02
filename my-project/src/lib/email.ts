import { Resend } from "resend";
import type { ReactElement } from "react";
import "server-only";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  html,
  react,
}: {
  to: string | string[];
  subject: string;
  html?: string;
  react?: ReactElement;
}) {
  const emailHtml = html ?? (react ? await renderEmailElement(react) : undefined);

  if (!emailHtml) {
    throw new Error("Email content is required.");
  }

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject,
    html: emailHtml,
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
