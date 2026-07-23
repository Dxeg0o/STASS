import { NextResponse } from "next/server";
import { dispatchDailyReports } from "@/lib/reporting/dispatch";
import { formatLocalDate, shiftLocalDate } from "@/lib/reporting/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const reportDate = shiftLocalDate(formatLocalDate(), -1);
  const result = await dispatchDailyReports(reportDate);
  return NextResponse.json({ ok: true, ...result });
}
