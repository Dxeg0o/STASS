import { and, eq, inArray, lt, or, sql } from "drizzle-orm";
import React from "react";
import { db } from "@/db";
import {
  empresaUsuario,
  reportDelivery,
  servicio,
  usuario,
} from "@/db/schema";
import { sendEmail } from "@/lib/email";
import ServiceReportEmail from "@/emails/ServiceReportEmail";
import { buildServiceReport } from "./data";
import { renderServiceReportPdf } from "./pdf";
import { getQualiblickLogoAttachment } from "./logo";
import type { ReportPair } from "./types";

function dateValue(reportDate: string) {
  return new Date(`${reportDate}T00:00:00.000Z`);
}

function safeFilePart(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "servicio";
}

export async function buildReportPair(serviceId: string, reportDate: string): Promise<ReportPair> {
  const [daily, total] = await Promise.all([
    buildServiceReport(serviceId, "daily", reportDate),
    buildServiceReport(serviceId, "total", reportDate),
  ]);
  const [dailyPdf, totalPdf] = await Promise.all([
    renderServiceReportPdf(daily),
    renderServiceReportPdf(total),
  ]);
  return { daily, total, dailyPdf, totalPdf };
}

async function reserveDelivery(serviceId: string, email: string, reportDate: string) {
  const date = dateValue(reportDate);
  const [inserted] = await db
    .insert(reportDelivery)
    .values({ servicioId: serviceId, recipientCorreo: email, reportDate: date })
    .onConflictDoNothing({
      target: [reportDelivery.servicioId, reportDelivery.recipientCorreo, reportDelivery.reportDate],
    })
    .returning({ id: reportDelivery.id });

  if (inserted) {
    const [sending] = await db
      .update(reportDelivery)
      .set({
        status: "sending",
        attempts: sql`${reportDelivery.attempts} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(reportDelivery.id, inserted.id))
      .returning({ id: reportDelivery.id });
    return sending ?? null;
  }

  const [sending] = await db
    .update(reportDelivery)
    .set({
      status: "sending",
      attempts: sql`${reportDelivery.attempts} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(reportDelivery.servicioId, serviceId),
        eq(reportDelivery.recipientCorreo, email),
        eq(reportDelivery.reportDate, date),
        or(
          inArray(reportDelivery.status, ["pending", "failed"]),
          and(
            eq(reportDelivery.status, "sending"),
            lt(reportDelivery.updatedAt, new Date(Date.now() - 30 * 60 * 1000))
          )
        )
      )
    )
    .returning({ id: reportDelivery.id });
  return sending ?? null;
}

async function markFailed(id: string, error: unknown) {
  await db
    .update(reportDelivery)
    .set({
      status: "failed",
      lastError: error instanceof Error ? error.message.slice(0, 2000) : String(error).slice(0, 2000),
      updatedAt: new Date(),
    })
    .where(eq(reportDelivery.id, id));
}

async function markSent(id: string) {
  await db
    .update(reportDelivery)
    .set({ status: "sent", sentAt: new Date(), lastError: null, updatedAt: new Date() })
    .where(eq(reportDelivery.id, id));
}

export async function sendReportToRecipient(
  pair: ReportPair,
  recipient: { correo: string; nombre?: string | null },
  trackDelivery: boolean,
  reportDate: string
) {
  const delivery = trackDelivery
    ? await reserveDelivery(pair.daily.serviceId, recipient.correo, reportDate)
    : { id: "manual-test" };
  if (!delivery) return { sent: false, skipped: true };

  try {
    const filename = safeFilePart(pair.daily.serviceName);
    await sendEmail({
      to: recipient.correo,
      subject: `Reporte QUALIBLICK - ${pair.daily.serviceName} - ${reportDate}`,
      react: React.createElement(ServiceReportEmail, {
        daily: pair.daily,
        total: pair.total,
        recipientName: recipient.nombre,
      }),
      attachments: [
        { filename: `reporte-diario-${filename}-${reportDate}.pdf`, content: pair.dailyPdf },
        { filename: `reporte-total-${filename}.pdf`, content: pair.totalPdf },
        getQualiblickLogoAttachment(),
      ],
    });
    if (trackDelivery) await markSent(delivery.id);
    return { sent: true, skipped: false };
  } catch (error) {
    if (trackDelivery) await markFailed(delivery.id, error);
    throw error;
  }
}

export async function dispatchDailyReports(reportDate: string) {
  const services = await db
    .select({ id: servicio.id, empresaId: servicio.empresaId })
    .from(servicio)
    .where(eq(servicio.estado, "en_curso"));

  let attempted = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const service of services) {
    const recipientsRows = await db
      .select({ correo: usuario.correo, nombre: usuario.nombre })
      .from(empresaUsuario)
      .innerJoin(usuario, eq(usuario.id, empresaUsuario.usuarioId))
      .where(eq(empresaUsuario.empresaId, service.empresaId));
    const recipients = Array.from(
      new Map(recipientsRows.map((recipient) => [recipient.correo.trim().toLowerCase(), recipient])).values()
    );
    if (recipients.length === 0) continue;

    let pair: ReportPair;
    try {
      pair = await buildReportPair(service.id, reportDate);
    } catch (error) {
      failed += recipients.length;
      console.error(`[reporting] Error generando servicio ${service.id}:`, error);
      continue;
    }

    for (const recipient of recipients) {
      attempted += 1;
      try {
        const result = await sendReportToRecipient(pair, recipient, true, reportDate);
        if (result.sent) sent += 1;
        if (result.skipped) skipped += 1;
      } catch (error) {
        failed += 1;
        console.error(`[reporting] Error enviando ${service.id} a ${recipient.correo}:`, error);
      }
    }
  }

  return { reportDate, services: services.length, attempted, sent, failed, skipped };
}
