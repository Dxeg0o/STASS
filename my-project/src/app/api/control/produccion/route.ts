import { NextResponse } from "next/server";
import { db } from "@/db";
import { conteo, servicio, dispositivo } from "@/db/schema";
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
      hourlyPorDispositivo: [],
      dispositivos: [],
      daily: [],
      total: 0,
      avgPerHour: 0,
      avgStartTime: null,
      avgEndTime: null,
    });
  }

  // Una sola consulta agrupada por (date, hour, dispositivo). De aquí derivamos
  // en JS: hourlyPorDispositivo, hourly, daily, total y jornada (inicio/fin),
  // evitando escanear la tabla más de una vez. El dispositivo entra en el group
  // by porque es la granularidad más fina que necesitamos: todo lo demás sale
  // de sumar sobre estas filas.
  const localTs = sql`${conteo.ts} AT TIME ZONE 'America/Santiago'`;
  const dateExpr = sql<string>`TO_CHAR(${localTs}, 'YYYY-MM-DD')`;
  const hourExpr = sql<number>`EXTRACT(HOUR FROM ${localTs})::int`;

  const rows = await db
    .select({
      date: dateExpr,
      hour: hourExpr,
      dispositivoId: conteo.dispositivoId,
      dispositivoNombre: dispositivo.nombre,
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
    .innerJoin(dispositivo, eq(dispositivo.id, conteo.dispositivoId))
    .where(
      and(
        inArray(conteo.servicioId, servicioIds),
        gte(conteo.ts, desdeDate),
        lte(conteo.ts, hastaDate)
      )
    )
    .groupBy(dateExpr, hourExpr, conteo.dispositivoId, dispositivo.nombre)
    .orderBy(dateExpr, hourExpr);

  const hourlyPorDispositivo = rows.map((r) => ({
    date: r.date,
    hour: r.hour,
    dispositivoId: r.dispositivoId,
    dispositivoNombre: r.dispositivoNombre,
    count: r.count,
  }));

  // hourly: las mismas franjas pero sumando los dispositivos. Se recorre en el
  // orden que vino de la DB, así que el Map preserva el orden por date, hour.
  const porFranja = new Map<
    string,
    { date: string; hour: number; count: number }
  >();
  for (const r of rows) {
    const key = `${r.date}|${r.hour}`;
    const existing = porFranja.get(key);
    if (existing) existing.count += r.count;
    else porFranja.set(key, { date: r.date, hour: r.hour, count: r.count });
  }
  const hourly = Array.from(porFranja.values());

  let total = 0;
  // Mapa date -> { count, minStart, maxEnd } para derivar daily y jornada
  const byDate = new Map<
    string,
    { count: number; minStart: number; maxEnd: number }
  >();
  // Totales por dispositivo, para que el cliente arme la leyenda y el resumen
  // sin recorrer todo el detalle.
  const porDispositivo = new Map<
    string,
    { id: string; nombre: string; total: number }
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

    const equipo = porDispositivo.get(r.dispositivoId);
    if (equipo) {
      equipo.total += r.count;
    } else {
      porDispositivo.set(r.dispositivoId, {
        id: r.dispositivoId,
        nombre: r.dispositivoNombre,
        total: r.count,
      });
    }
  }

  const dispositivos = Array.from(porDispositivo.values()).sort(
    (a, b) => b.total - a.total
  );

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

  // Avg per hour: total dividido por número de franjas hora con datos. Se
  // cuenta sobre `hourly` y no sobre `rows`: con el dispositivo en el group by
  // hay una fila por equipo y hora, y usar rows.length infla el divisor.
  const totalHours = hourly.length || 1;
  const avgPerHour = Math.round(total / totalHours);

  return NextResponse.json({
    hourly,
    hourlyPorDispositivo,
    dispositivos,
    daily,
    total,
    avgPerHour,
    avgStartTime,
    avgEndTime,
  });
}
