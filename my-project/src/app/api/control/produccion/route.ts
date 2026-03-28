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

  // Hourly production (grouped by date + hour)
  const hourlyRows = await db
    .select({
      date: sql<string>`TO_CHAR(${conteo.ts} AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD')`,
      hour: sql<number>`EXTRACT(HOUR FROM ${conteo.ts} AT TIME ZONE 'America/Santiago')::int`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(conteo)
    .where(
      and(
        inArray(conteo.servicioId, servicioIds),
        gte(conteo.ts, desdeDate),
        lte(conteo.ts, hastaDate)
      )
    )
    .groupBy(
      sql`TO_CHAR(${conteo.ts} AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD')`,
      sql`EXTRACT(HOUR FROM ${conteo.ts} AT TIME ZONE 'America/Santiago')`
    )
    .orderBy(
      sql`TO_CHAR(${conteo.ts} AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD')`,
      sql`EXTRACT(HOUR FROM ${conteo.ts} AT TIME ZONE 'America/Santiago')`
    );

  // Daily production
  const dailyRows = await db
    .select({
      date: sql<string>`TO_CHAR(${conteo.ts} AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD')`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(conteo)
    .where(
      and(
        inArray(conteo.servicioId, servicioIds),
        gte(conteo.ts, desdeDate),
        lte(conteo.ts, hastaDate)
      )
    )
    .groupBy(
      sql`TO_CHAR(${conteo.ts} AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD')`
    )
    .orderBy(
      sql`TO_CHAR(${conteo.ts} AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD')`
    );

  // Total count
  const [totalRow] = await db
    .select({
      total: sql<number>`COUNT(*)::int`,
    })
    .from(conteo)
    .where(
      and(
        inArray(conteo.servicioId, servicioIds),
        gte(conteo.ts, desdeDate),
        lte(conteo.ts, hastaDate)
      )
    );

  // Average start/end times per day (first and last conteo of each day)
  const jornadaRows = await db
    .select({
      date: sql<string>`TO_CHAR(${conteo.ts} AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD')`,
      firstHour: sql<number>`EXTRACT(HOUR FROM MIN(${conteo.ts} AT TIME ZONE 'America/Santiago'))::int`,
      firstMinute: sql<number>`EXTRACT(MINUTE FROM MIN(${conteo.ts} AT TIME ZONE 'America/Santiago'))::int`,
      lastHour: sql<number>`EXTRACT(HOUR FROM MAX(${conteo.ts} AT TIME ZONE 'America/Santiago'))::int`,
      lastMinute: sql<number>`EXTRACT(MINUTE FROM MAX(${conteo.ts} AT TIME ZONE 'America/Santiago'))::int`,
    })
    .from(conteo)
    .where(
      and(
        inArray(conteo.servicioId, servicioIds),
        gte(conteo.ts, desdeDate),
        lte(conteo.ts, hastaDate)
      )
    )
    .groupBy(
      sql`TO_CHAR(${conteo.ts} AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD')`
    );

  // Compute averages
  let avgStartTime: string | null = null;
  let avgEndTime: string | null = null;

  if (jornadaRows.length > 0) {
    let totalStartMinutes = 0;
    let totalEndMinutes = 0;
    for (const row of jornadaRows) {
      totalStartMinutes += row.firstHour * 60 + row.firstMinute;
      totalEndMinutes += row.lastHour * 60 + row.lastMinute;
    }
    const avgStartMins = Math.round(totalStartMinutes / jornadaRows.length);
    const avgEndMins = Math.round(totalEndMinutes / jornadaRows.length);
    avgStartTime = `${Math.floor(avgStartMins / 60)
      .toString()
      .padStart(2, "0")}:${(avgStartMins % 60).toString().padStart(2, "0")}`;
    avgEndTime = `${Math.floor(avgEndMins / 60)
      .toString()
      .padStart(2, "0")}:${(avgEndMins % 60).toString().padStart(2, "0")}`;
  }

  // Avg per hour
  const totalHours = hourlyRows.length || 1;
  const avgPerHour = Math.round((totalRow?.total ?? 0) / totalHours);

  return NextResponse.json({
    hourly: hourlyRows,
    daily: dailyRows,
    total: totalRow?.total ?? 0,
    avgPerHour,
    avgStartTime,
    avgEndTime,
  });
}
