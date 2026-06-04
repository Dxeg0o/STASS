import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

/**
 * Endpoint ligero exclusivo para el combobox de Analítica.
 * Una sola query SQL (CTE) — sin N+1, sin paginación costosa.
 * Devuelve sólo los campos que necesita el selector:
 *   id, codigoLote, variedadNombre, productoNombre,
 *   etapaActual, servicioActual, totalBulbs, lastTs
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get("empresaId")?.trim();

  if (!empresaId) {
    return NextResponse.json(
      { error: "empresaId is required" },
      { status: 400 }
    );
  }

  const rows = await db.execute(sql`
    WITH empresa_lotes AS (
      SELECT DISTINCT ls.lote_id
      FROM lote_servicio ls
      JOIN servicio s ON s.id = ls.servicio_id
      WHERE s.empresa_id = ${empresaId}
    ),
    latest_assignment AS (
      SELECT DISTINCT ON (ls.lote_id)
        ls.lote_id,
        s.nombre  AS servicio_nombre,
        tp.nombre AS tipo_proceso_nombre
      FROM lote_servicio ls
      JOIN servicio s ON s.id = ls.servicio_id
      LEFT JOIN proceso p  ON p.id  = s.proceso_id
      LEFT JOIN tipo_proceso tp ON tp.id = p.tipo_proceso_id
      WHERE ls.lote_id IN (SELECT lote_id FROM empresa_lotes)
      ORDER BY ls.lote_id, ls.asignado_at DESC
    ),
    lote_stats AS (
      SELECT
        lote_id,
        SUM(count_in + count_out)::int AS total_bulbs,
        MAX(last_ts)                   AS last_ts
      FROM lote_total_stats
      WHERE lote_id IN (SELECT lote_id FROM empresa_lotes)
      GROUP BY lote_id
    )
    SELECT
      l.id,
      l.codigo_lote,
      v.nombre  AS variedad_nombre,
      pr.nombre AS producto_nombre,
      la.tipo_proceso_nombre AS etapa_actual,
      la.servicio_nombre     AS servicio_actual,
      COALESCE(st.total_bulbs, 0) AS total_bulbs,
      st.last_ts
    FROM lote l
    JOIN empresa_lotes el ON el.lote_id = l.id
    LEFT JOIN variedad v   ON v.id  = l.variedad_id
    LEFT JOIN producto pr  ON pr.id = v.producto_id
    LEFT JOIN latest_assignment la ON la.lote_id = l.id
    LEFT JOIN lote_stats st        ON st.lote_id = l.id
    ORDER BY l.created_at DESC
  `);

  return NextResponse.json({ data: rows });
}
