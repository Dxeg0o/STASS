import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { conteo, servicio } from "@/db/schema";
import { buildReportPair, sendReportToRecipient } from "@/lib/reporting/dispatch";
import { formatLocalDate, shiftLocalDate } from "@/lib/reporting/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env.REPORTS_CRON_SECRET?.trim();
  const auth = request.headers.get("authorization") ?? "";
  return Boolean(secret && auth === `Bearer ${secret}`);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const recipient = String(body.recipient ?? "").trim().toLowerCase();
  const allowedRecipient = (process.env.REPORT_TEST_RECIPIENT ?? "dsoler.olguin@gmail.com").trim().toLowerCase();
  if (!recipient || recipient !== allowedRecipient) {
    return NextResponse.json({ error: "Recipient not allowed for test delivery" }, { status: 400 });
  }

  const serviceName = String(body.serviceName ?? "Planting Stock Pelú").trim();
  const serviceId = typeof body.serviceId === "string" ? body.serviceId.trim() : null;
  const [service] = await db
    .select({ id: servicio.id, name: servicio.nombre })
    .from(servicio)
    .where(serviceId ? eq(servicio.id, serviceId) : and(eq(servicio.nombre, serviceName), eq(servicio.estado, "en_curso")))
    .limit(1);
  if (!service) {
    return NextResponse.json({ error: `Servicio no encontrado: ${serviceName}` }, { status: 404 });
  }

  const [latest] = await db
    .select({ date: sql<string>`MAX((${conteo.ts} AT TIME ZONE 'America/Santiago')::date)` })
    .from(conteo)
    .where(eq(conteo.servicioId, service.id));
  const reportDate = latest?.date ? String(latest.date).slice(0, 10) : shiftLocalDate(formatLocalDate(), -1);
  const pair = await buildReportPair(service.id, reportDate);
  await sendReportToRecipient(pair, { correo: recipient, nombre: "Diego" }, false, reportDate);

  return NextResponse.json({ ok: true, service: service.name, reportDate, recipient });
}
