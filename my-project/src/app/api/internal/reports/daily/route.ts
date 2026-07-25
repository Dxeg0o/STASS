import { NextResponse } from "next/server";
import { dispatchDailyReports } from "@/lib/reporting/dispatch";
import { automaticReportDates } from "@/lib/reporting/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Large services can contain hundreds of lots and require multiple PDFs.
// The Hobby plan caps serverless functions at 60 seconds; compact PDF
// generation keeps the full dispatch within this limit.
export const maxDuration = 60;

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

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hour = localHour();
  if (hour !== 8) {
    return NextResponse.json({ skipped: true, reason: "outside_reporting_window", hour });
  }

  const reportDates = automaticReportDates();
  if (reportDates.length === 0) {
    return NextResponse.json({ ok: true, skipped: true, reason: "weekend", reportDates: [] });
  }

  const runs = await Promise.all(reportDates.map((reportDate) => dispatchDailyReports(reportDate)));
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
  return NextResponse.json({ ok: true, reportDates, runs, ...result });
}
