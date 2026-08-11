import { and, eq, inArray, lt, or, sql } from "drizzle-orm";
import React from "react";
import { db } from "@/db";
import {
  conteo,
  empresaUsuario,
  reportDelivery,
  servicio,
  usuario,
} from "@/db/schema";
import { sendEmail } from "@/lib/email";
import ServiceReportEmail from "@/emails/ServiceReportEmail";
import { buildServiceReport, localDayRange } from "./data";
import { renderServiceReportPdf } from "./pdf";
import { renderServiceReportWorkbook } from "./xlsx";
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

/**
 * Idioma de los entregables. Los reportes que salen al cliente van en ingles;
 * el castellano existe solo para revisar el contenido internamente.
 */
const REPORT_LANG = "en" as const;

export async function buildReportPair(serviceId: string, reportDate: string): Promise<ReportPair> {
  // Antes de leer nada: el resumen declarado se materializa aca y no en el
  // dispatch, para que el envio de prueba y cualquier otro consumidor futuro
  // tampoco puedan construir el reporte sobre una tabla sin refrescar.
  await refreshDeclaredSummary(serviceId, reportDate);
  const [daily, total] = await Promise.all([
    buildServiceReport(serviceId, "daily", reportDate),
    buildServiceReport(serviceId, "total", reportDate),
  ]);
  const [dailyPdf, totalPdf] = await Promise.all([
    renderServiceReportPdf(daily, REPORT_LANG),
    renderServiceReportPdf(total, REPORT_LANG),
  ]);
  return {
    daily,
    total,
    dailyPdf,
    totalPdf,
    workbook: renderServiceReportWorkbook(daily, total, REPORT_LANG),
  };
}

/**
 * Reserva una entrega, creandola si no existe.
 *
 * Cada pasada crea lo que falte: el corte por deadline puede dejar servicios o
 * fechas sin fila, y esas entregas solo pueden recuperarse si una pasada
 * posterior las inserta. Los duplicados los impide el estado, no el saltarse el
 * insert: el UPDATE de abajo nunca toca una fila `sent`.
 */
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
  reportDate: string,
  reservedDeliveryId?: string
) {
  const delivery = trackDelivery
    ? reservedDeliveryId
      ? { id: reservedDeliveryId }
      : await reserveDelivery(pair.daily.serviceId, recipient.correo, reportDate)
    : { id: "manual-test" };
  if (!delivery) return { sent: false, skipped: true };

  try {
    const filename = safeFilePart(pair.daily.serviceName);
    await sendEmail({
      to: recipient.correo,
      subject: `QUALIBLICK report - ${pair.daily.serviceName} - ${reportDate}`,
      react: React.createElement(ServiceReportEmail, {
        daily: pair.daily,
        recipientName: recipient.nombre,
        lang: REPORT_LANG,
      }),
      attachments: [
        { filename: `daily-report-${filename}-${reportDate}.pdf`, content: pair.dailyPdf },
        { filename: `total-report-${filename}.pdf`, content: pair.totalPdf },
        { filename: `report-${filename}-${reportDate}.xlsx`, content: pair.workbook },
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

/**
 * `lote_calibre_declarado_dia` solo se recalcula cuando un operador guarda
 * tramos de calibre en la app. Sin este refresco, el informe de un servicio en
 * modo declarado sale vacio para cualquier dia en que nadie haya vuelto a
 * guardar. Se recalcula solo la fecha reportada y solo los lotes con conteos
 * ese dia (ver migracion 0034); para servicios en modo medido no hay filas que
 * tocar y el bucle simplemente no itera.
 */
async function refreshDeclaredSummary(serviceId: string, reportDate: string) {
  const [service] = await db
    .select({ modoCalibre: servicio.modoCalibre })
    .from(servicio)
    .where(eq(servicio.id, serviceId))
    .limit(1);
  if (service?.modoCalibre !== "declarado") return 0;

  const day = localDayRange(reportDate);
  const lotes = await db
    .selectDistinct({ loteId: conteo.loteId })
    .from(conteo)
    .where(
      and(
        eq(conteo.servicioId, serviceId),
        sql`${conteo.ts} >= ${day.from}`,
        sql`${conteo.ts} < ${day.to}`
      )
    );
  for (const { loteId } of lotes) {
    await db.execute(
      sql`select refresh_lote_calibre_declarado_dia_rango(${loteId}::uuid, ${serviceId}::uuid, ${reportDate}::date)`
    );
  }
  return lotes.length;
}

export async function dispatchDailyReports(
  reportDate: string,
  options: { deadline?: number } = {}
) {
  const { deadline } = options;
  const outOfTime = () => deadline !== undefined && Date.now() > deadline;
  const day = localDayRange(reportDate);
  const services = await db
    .select({
      id: servicio.id,
      serviceName: servicio.nombre,
      empresaId: servicio.empresaId,
      modoCalibre: servicio.modoCalibre,
    })
    .from(servicio)
    .where(sql`exists (
      select 1
      from ${conteo}
      where ${conteo.servicioId} = ${servicio.id}
        and ${conteo.ts} >= ${day.from}
        and ${conteo.ts} < ${day.to}
    )`);

  let attempted = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const errors: Array<{ serviceId: string; serviceName: string; stage: "build" | "send"; error: string }> = [];

  for (const service of services) {
    if (outOfTime()) {
      // Lo no procesado queda como pending/failed en report_delivery y lo toma
      // la pasada de reintento de la hora siguiente.
      break;
    }
    const recipientsRows = await db
      .select({ correo: usuario.correo, nombre: usuario.nombre })
      .from(empresaUsuario)
      .innerJoin(usuario, eq(usuario.id, empresaUsuario.usuarioId))
      .where(eq(empresaUsuario.empresaId, service.empresaId));
    const recipients = Array.from(
      new Map(recipientsRows.map((recipient) => [recipient.correo.trim().toLowerCase(), recipient])).values()
    );
    if (recipients.length === 0) continue;

    // Reserve the deliveries before the expensive report/PDF build. This makes
    // failures visible in report_delivery and allows the next cron run to retry
    // instead of silently losing the service with no delivery record.
    const reserved = [] as Array<{ recipient: (typeof recipients)[number]; deliveryId: string }>;
    for (const recipient of recipients) {
      const delivery = await reserveDelivery(service.id, recipient.correo, reportDate);
      if (delivery) reserved.push({ recipient, deliveryId: delivery.id });
      else skipped += 1;
    }
    if (reserved.length === 0) continue;

    let pair: ReportPair;
    try {
      pair = await buildReportPair(service.id, reportDate);
    } catch (error) {
      failed += reserved.length;
      const message = error instanceof Error ? error.message : String(error);
      errors.push({ serviceId: service.id, serviceName: service.serviceName, stage: "build", error: message.slice(0, 500) });
      await Promise.all(reserved.map(({ deliveryId }) => markFailed(deliveryId, error)));
      console.error(`[reporting] Error generando servicio ${service.id} (${service.serviceName}):`, error);
      continue;
    }

    for (const { recipient, deliveryId } of reserved) {
      attempted += 1;
      try {
        const result = await sendReportToRecipient(pair, recipient, true, reportDate, deliveryId);
        if (result.sent) sent += 1;
        if (result.skipped) skipped += 1;
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        errors.push({ serviceId: service.id, serviceName: service.serviceName, stage: "send", error: message.slice(0, 500) });
        console.error(`[reporting] Error enviando ${service.id} (${service.serviceName}) a ${recipient.correo}:`, error);
      }
    }
  }

  return { reportDate, services: services.length, attempted, sent, failed, skipped, errors };
}
