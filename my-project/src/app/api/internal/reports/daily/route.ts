import { NextResponse } from "next/server";
import { dispatchDailyReports } from "@/lib/reporting/dispatch";
import { automaticReportDates } from "@/lib/reporting/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Large services can contain hundreds of lots and require multiple PDFs.
// The Hobby plan caps serverless functions at 60 seconds; compact PDF
// generation keeps the full dispatch within this limit.
export const maxDuration = 60;

// El cron dispara cada hora en el minuto 10 y la ventana se decide aca, en hora
// local: asi el cambio de horario de Chile no corre la hora de envio.
const REPORTING_HOUR = 18;
const RETRY_UNTIL_HOUR = 21;
// Margen sobre maxDuration para alcanzar a responder y registrar el resumen.
const BUDGET_MS = 50_000;

function authorized(request: Request) {
  const secret = process.env.REPORTS_CRON_SECRET?.trim();
  const auth = request.headers.get("authorization") ?? "";
  return Boolean(secret && auth === `Bearer ${secret}`);
}

function localHour() {
  return Number(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santiago",
    hour: "2-digit",
    hourCycle: "h23",
  }).format(new Date()));
}

/**
 * Disparo manual, con el mismo secreto del cron: `{ "force": true }` salta la
 * ventana horaria y `{ "dates": ["YYYY-MM-DD"] }` fija que fechas reportar.
 * Sirve para reenviar dias perdidos sin esperar al horario. La idempotencia la
 * sigue dando `report_delivery`: una fecha ya enviada no se duplica.
 */
type ManualTrigger = { force?: boolean; dates?: string[] };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as ManualTrigger;
  const force = body.force === true;
  const manualDates = Array.isArray(body.dates)
    ? body.dates.filter((date) => typeof date === "string" && DATE_PATTERN.test(date))
    : [];
  if (manualDates.length > 0 && !force) {
    return NextResponse.json({ error: "\"dates\" requiere \"force\": true" }, { status: 400 });
  }

  // Las pasadas de 19:10 a 21:10 repiten el trabajo completo: crean lo que
  // falte y retoman lo pending/failed (o un 'sending' de mas de 30 min). No se
  // limitan a reintentar, porque el corte por deadline puede haber dejado
  // servicios enteros sin fila en report_delivery, y esos solo se recuperan si
  // una pasada posterior los inserta. Lo ya enviado nunca se reenvia.
  const hour = localHour();
  if (!force && (hour < REPORTING_HOUR || hour > RETRY_UNTIL_HOUR)) {
    return NextResponse.json({ skipped: true, reason: "outside_reporting_window", hour });
  }

  const reportDates = manualDates.length > 0 ? manualDates : automaticReportDates();
  if (reportDates.length === 0) {
    return NextResponse.json({ ok: true, skipped: true, reason: "weekend", reportDates: [] });
  }

  // Secuencial y con presupuesto: los lunes son tres fechas compitiendo por los
  // mismos 60 s de maxDuration. Lo que no alcance lo retoma la pasada siguiente,
  // que vuelve a recorrer servicios y fechas desde cero.
  const deadline = Date.now() + BUDGET_MS;
  const runs = [] as Awaited<ReturnType<typeof dispatchDailyReports>>[];
  for (const reportDate of reportDates) {
    runs.push(await dispatchDailyReports(reportDate, { deadline }));
    if (Date.now() > deadline) break;
  }
  const result = runs.reduce(
    (total, run) => ({
      services: total.services + run.services,
      attempted: total.attempted + run.attempted,
      sent: total.sent + run.sent,
      failed: total.failed + run.failed,
      skipped: total.skipped + run.skipped,
      errors: [...total.errors, ...run.errors],
    }),
    { services: 0, attempted: 0, sent: 0, failed: 0, skipped: 0, errors: [] as typeof runs[number]["errors"] }
  );
  // pg_net corta a los 5 s, asi que el body de esta respuesta nunca llega a
  // Postgres: el unico rastro de un fallo son los logs y report_delivery.
  if (result.failed > 0) {
    console.error(`[reporting] ${result.failed} entregas fallidas`, result.errors);
  } else {
    console.log(`[reporting] ${JSON.stringify({ reportDates, ...result, errors: undefined })}`);
  }
  return NextResponse.json({ ok: true, reportDates, runs, ...result });
}
