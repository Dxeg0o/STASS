// app/api/lotes/summary/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { loteTotalStats, dispositivo } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import {
  claveParDispositivoServicio,
  compararPorSalida,
  resolverSalidasCalibre,
} from "@/lib/salida-calibre";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const loteId = searchParams.get("loteId");
  if (!loteId) {
    return NextResponse.json({ error: "loteId is required" }, { status: 400 });
  }

  const rows = await db
    .select({
      dispositivoId: loteTotalStats.dispositivoId,
      dispositivoNombre: dispositivo.nombre,
      servicioId: loteTotalStats.servicioId,
      countIn: sql<number>`SUM(${loteTotalStats.countIn})::int`,
      countOut: sql<number>`SUM(${loteTotalStats.countOut})::int`,
      lastTimestamp: sql<Date>`MAX(${loteTotalStats.lastTs})`,
    })
    .from(loteTotalStats)
    .innerJoin(dispositivo, eq(dispositivo.id, loteTotalStats.dispositivoId))
    .where(eq(loteTotalStats.loteId, loteId))
    .groupBy(
      loteTotalStats.dispositivoId,
      dispositivo.nombre,
      loteTotalStats.servicioId
    );

  // Las filas ya vienen por (dispositivo, servicio), así que la salida se
  // resuelve exacta para cada una — sin cruces entre servicios.
  const salidas = await resolverSalidasCalibre(
    loteId,
    rows.map((r) => ({
      dispositivoId: r.dispositivoId,
      servicioId: r.servicioId,
    }))
  );

  const result = rows
    .map((r) => {
      const salida = salidas.get(
        claveParDispositivoServicio(r.dispositivoId, r.servicioId)
      );
      return {
        dispositivo: r.dispositivoNombre,
        dispositivoNombre: r.dispositivoNombre,
        servicioId: r.servicioId,
        salidaOrden: salida?.salidaOrden ?? null,
        // Si el servicio no tiene salidas configuradas se cae al nombre del
        // equipo, misma convención que /api/app/lotes/resumen-calibres.
        salidaLabel: salida?.salidaNombre ?? r.dispositivoNombre,
        calibres: salida?.calibres ?? [],
        countIn: r.countIn,
        countOut: r.countOut,
        lastTimestamp: r.lastTimestamp
          ? new Date(r.lastTimestamp).toISOString()
          : null,
      };
    })
    .sort(compararPorSalida);

  return NextResponse.json(result);
}
