import { NextResponse } from "next/server";
import { db } from "@/db";
import { conteo, servicio } from "@/db/schema";
import { eq, and, gte, lte, inArray, sql } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get("empresaId");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const procesoId = searchParams.get("procesoId");
  const servicioId = searchParams.get("servicioId");

  if (!empresaId || !desde || !hasta) {
    return NextResponse.json(
      { error: "empresaId, desde, and hasta are required" },
      { status: 400 }
    );
  }

  const desdeDate = new Date(desde);
  const hastaDate = new Date(hasta);

  // Get servicioIds
  let servicioIds: string[];
  if (servicioId) {
    servicioIds = [servicioId];
  } else {
    const conditions = [eq(servicio.empresaId, empresaId)];
    if (procesoId) conditions.push(eq(servicio.procesoId, procesoId));

    const servicios = await db
      .select({ id: servicio.id })
      .from(servicio)
      .where(and(...conditions));
    servicioIds = servicios.map((s) => s.id);
  }

  if (servicioIds.length === 0) {
    return NextResponse.json({
      hourly: [],
      daily: [],
      total: 0,
      avgPerHour: 0,
      avgStartTime: null,
      avgEndTime: null,
    });
  }

  // Una sola consulta agrupada por (date, hour). De aquí derivamos en JS:
  // hourly, daily, total y jornada (inicio/fin), evitando 4 escaneos de la tabla.
  const localTs = sql`${conteo.ts} AT TIME ZONE 'America/Santiago'`;
  const dateExpr = sql<string>`TO_CHAR(${localTs}, 'YYYY-MM-DD')`;
  const hourExpr = sql<number>`EXTRACT(HOUR FROM ${localTs})::int`;

  const rows = await db
    .select({
      date: dateExpr,
      hour: hourExpr,
      count: sql<number>`COUNT(*)::int`,
      // MIN/MAX sobre el ts real, convirtiendo después (correcto en cambios de DST)
      firstMin: sql<number>`(
        EXTRACT(HOUR FROM (MIN(${conteo.ts}) AT TIME ZONE 'America/Santiago')) * 60 +
        EXTRACT(MINUTE FROM (MIN(${conteo.ts}) AT TIME ZONE 'America/Santiago'))
      )::int`,
      lastMin: sql<number>`(
        EXTRACT(HOUR FROM (MAX(${conteo.ts}) AT TIME ZONE 'America/Santiago')) * 60 +
        EXTRACT(MINUTE FROM (MAX(${conteo.ts}) AT TIME ZONE 'America/Santiago'))
      )::int`,
    })
    .from(conteo)
    .where(
      and(
        inArray(conteo.servicioId, servicioIds),
        gte(conteo.ts, desdeDate),
        lte(conteo.ts, hastaDate)
      )
    )
    .groupBy(dateExpr, hourExpr)
    .orderBy(dateExpr, hourExpr);

  const hourly = rows.map((r) => ({
    date: r.date,
    hour: r.hour,
    count: r.count,
  }));

  let total = 0;
  // Mapa date -> { count, minStart, maxEnd } para derivar daily y jornada
  const byDate = new Map<
    string,
    { count: number; minStart: number; maxEnd: number }
  >();
  for (const r of rows) {
    total += r.count;
    const existing = byDate.get(r.date);
    if (existing) {
      existing.count += r.count;
      existing.minStart = Math.min(existing.minStart, r.firstMin);
      existing.maxEnd = Math.max(existing.maxEnd, r.lastMin);
    } else {
      byDate.set(r.date, {
        count: r.count,
        minStart: r.firstMin,
        maxEnd: r.lastMin,
      });
    }
  }

  // daily ordenado por fecha (rows ya viene ordenado por date, hour)
  const daily = Array.from(byDate.entries()).map(([date, v]) => ({
    date,
    count: v.count,
  }));

  // Average start/end times: promedio por día de los inicios/términos diarios
  let avgStartTime: string | null = null;
  let avgEndTime: string | null = null;

  if (byDate.size > 0) {
    let totalStartMinutes = 0;
    let totalEndMinutes = 0;
    for (const v of byDate.values()) {
      totalStartMinutes += v.minStart;
      totalEndMinutes += v.maxEnd;
    }
    const avgStartMins = Math.round(totalStartMinutes / byDate.size);
    const avgEndMins = Math.round(totalEndMinutes / byDate.size);
    avgStartTime = `${Math.floor(avgStartMins / 60)
      .toString()
      .padStart(2, "0")}:${(avgStartMins % 60).toString().padStart(2, "0")}`;
    avgEndTime = `${Math.floor(avgEndMins / 60)
      .toString()
      .padStart(2, "0")}:${(avgEndMins % 60).toString().padStart(2, "0")}`;
  }

  // Avg per hour: total dividido por número de franjas hora con datos
  const totalHours = rows.length || 1;
  const avgPerHour = Math.round(total / totalHours);

  return NextResponse.json({
    hourly,
    daily,
    total,
    avgPerHour,
    avgStartTime,
    avgEndTime,
  });
}
