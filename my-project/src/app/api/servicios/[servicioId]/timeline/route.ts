import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

/**
 * Segmentos de actividad real por lote para la línea temporal (Gantt).
 *
 * A diferencia de /detail (que devuelve una sola barra MIN(first_ts)→MAX(last_ts)
 * y por eso "rellena" los huecos muertos generando solapamientos visuales), este
 * endpoint reconstruye los bloques contiguos de actividad real cortando cada vez
 * que hay un hueco mayor a `gap` minutos.
 *
 * Implementación: NO usa tablas materializadas. Hace un "loose index scan"
 * recursivo sobre `conteo` apoyado en el índice idx_conteo_lote (lote_id, ts):
 * salta de actividad en actividad de a `gap` minutos en lugar de leer las
 * millones de filas del servicio. La lista de lotes con actividad sale de
 * `lote_total_stats` (ya agregada, sin escanear conteo). Para el servicio más
 * cargado (25M de conteos) corre en ~25 ms.
 *
 * Query params:
 *   - from / to : ISO timestamps para acotar el rango (opcional).
 *   - gap       : minutos de inactividad que separan dos segmentos (default 10).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ servicioId: string }> }
) {
  const { servicioId } = await params;
  const { searchParams } = new URL(request.url);

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const gapMinRaw = Number(searchParams.get("gap"));
  const gapMin =
    Number.isFinite(gapMinRaw) && gapMinRaw > 0
      ? Math.min(240, Math.max(1, Math.round(gapMinRaw)))
      : 10;

  // Filtros de rango reutilizables (se aplican a cada sub-scan de conteo)
  const fromSeed = from ? sql`AND ts >= ${from}` : sql``;
  const toSeed = to ? sql`AND ts <= ${to}` : sql``;

  try {
    const rows = (await db.execute(sql`
      WITH RECURSIVE
      params AS (
        SELECT ${servicioId}::uuid AS svc,
               (${gapMin} * interval '1 minute') AS gap
      ),
      cand AS (
        SELECT DISTINCT lts.lote_id AS lote
        FROM lote_total_stats lts, params p
        WHERE lts.servicio_id = p.svc
          AND lts.first_ts IS NOT NULL
          ${to ? sql`AND lts.first_ts <= ${to}` : sql``}
          ${from ? sql`AND lts.last_ts >= ${from}` : sql``}
      ),
      seed AS (
        SELECT c.lote, x.m AS cur, x.m AS seg_start
        FROM cand c, params p
        CROSS JOIN LATERAL (
          SELECT date_trunc('minute', min(ts)) AS m
          FROM conteo
          WHERE lote_id = c.lote AND servicio_id = p.svc
            ${fromSeed} ${toSeed}
        ) x
        WHERE x.m IS NOT NULL
      ),
      walk AS (
        SELECT lote, cur, seg_start FROM seed
        UNION ALL
        SELECT w.lote, nxt.m,
               CASE WHEN nxt.gap_found THEN nxt.m ELSE w.seg_start END
        FROM walk w, params p
        CROSS JOIN LATERAL (
          SELECT COALESCE(inwin.mx, after.mn) AS m, (inwin.mx IS NULL) AS gap_found
          FROM
            (SELECT date_trunc('minute', max(ts)) AS mx
             FROM conteo
             WHERE lote_id = w.lote AND servicio_id = p.svc
               AND ts >  w.cur + interval '1 minute'
               AND ts <= w.cur + p.gap + interval '1 minute'
               ${toSeed}) inwin,
            (SELECT date_trunc('minute', min(ts)) AS mn
             FROM conteo
             WHERE lote_id = w.lote AND servicio_id = p.svc
               AND ts > w.cur + p.gap + interval '1 minute'
               ${toSeed}) after
        ) nxt
        WHERE nxt.m IS NOT NULL
      )
      SELECT w.lote AS "loteId",
             l.codigo_lote AS "codigoLote",
             v.nombre AS "variedadNombre",
             sv.nombre AS "subvariedadNombre",
             w.seg_start AS "start",
             max(w.cur) + interval '1 minute' AS "end"
      FROM walk w
      JOIN lote l ON l.id = w.lote
      LEFT JOIN variedad v ON v.id = l.variedad_id
      LEFT JOIN subvariedad sv ON sv.id = l.subvariedad_id
      GROUP BY w.lote, l.codigo_lote, v.nombre, sv.nombre, w.seg_start
      ORDER BY "start" ASC
    `)) as unknown as Array<{
      loteId: string;
      codigoLote: string | null;
      variedadNombre: string | null;
      subvariedadNombre: string | null;
      start: Date | string;
      end: Date | string;
    }>;

    const segments = rows.map((r) => ({
      loteId: r.loteId,
      codigoLote: r.codigoLote,
      variedadNombre: r.variedadNombre,
      subvariedadNombre: r.subvariedadNombre,
      start: new Date(r.start).toISOString(),
      end: new Date(r.end).toISOString(),
    }));

    return NextResponse.json({ gapMin, segments });
  } catch (err) {
    console.error("[timeline] error", err);
    return NextResponse.json(
      { error: "Error al calcular segmentos de actividad" },
      { status: 500 }
    );
  }
}
