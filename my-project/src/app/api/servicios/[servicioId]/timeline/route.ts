import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

/**
 * Línea temporal de lotes (Gantt) basada en SESIONES de lote (lote_session).
 *
 * Cada fila/segmento es una sesión: el periodo en que un lote estuvo asignado
 * como activo en un dispositivo (start_time → end_time). Una sesión sin
 * end_time está en curso (se dibuja hasta "ahora").
 *
 * El alcance al servicio se hace por la existencia de la combinación
 * (lote, servicio, dispositivo) en lote_total_stats, que es la prueba de que
 * ese lote+dispositivo realmente operó en este servicio.
 *
 * Detección de solapamientos: en un mismo dispositivo no puede haber dos lotes
 * activos a la vez, así que cualquier traslape > 1 min entre sesiones es una
 * anomalía. El cliente la marca en rojo y muestra una alerta; aquí solo se
 * entregan las sesiones ordenadas por inicio.
 *
 * Query params: from / to (ISO) para acotar el rango (opcional).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ servicioId: string }> }
) {
  const { servicioId } = await params;
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  try {
    const rows = (await db.execute(sql`
      SELECT
        ls.id                AS "sessionId",
        ls.lote_id           AS "loteId",
        l.codigo_lote        AS "codigoLote",
        v.nombre             AS "variedadNombre",
        sv.nombre            AS "subvariedadNombre",
        ls.dispositivo_id    AS "dispositivoId",
        d.nombre             AS "dispositivoNombre",
        ls.start_time        AS "start",
        ls.end_time          AS "end"
      FROM lote_session ls
      JOIN lote l ON l.id = ls.lote_id
      LEFT JOIN variedad v ON v.id = l.variedad_id
      LEFT JOIN subvariedad sv ON sv.id = l.subvariedad_id
      LEFT JOIN dispositivo d ON d.id = ls.dispositivo_id
      WHERE EXISTS (
        SELECT 1 FROM lote_total_stats lts
        WHERE lts.servicio_id = ${servicioId}::uuid
          AND lts.lote_id = ls.lote_id
          AND lts.dispositivo_id = ls.dispositivo_id
      )
      ${to ? sql`AND ls.start_time <= ${to}` : sql``}
      ${from ? sql`AND COALESCE(ls.end_time, now()) >= ${from}` : sql``}
      ORDER BY ls.start_time ASC
    `)) as unknown as Array<{
      sessionId: string;
      loteId: string;
      codigoLote: string | null;
      variedadNombre: string | null;
      subvariedadNombre: string | null;
      dispositivoId: string | null;
      dispositivoNombre: string | null;
      start: Date | string;
      end: Date | string | null;
    }>;

    const sessions = rows.map((r) => ({
      sessionId: r.sessionId,
      loteId: r.loteId,
      codigoLote: r.codigoLote,
      variedadNombre: r.variedadNombre,
      subvariedadNombre: r.subvariedadNombre,
      dispositivoId: r.dispositivoId,
      dispositivoNombre: r.dispositivoNombre,
      start: new Date(r.start).toISOString(),
      end: r.end ? new Date(r.end).toISOString() : null,
    }));

    return NextResponse.json({ sessions });
  } catch (err) {
    console.error("[timeline] error", err);
    return NextResponse.json(
      { error: "Error al cargar la línea temporal" },
      { status: 500 }
    );
  }
}
