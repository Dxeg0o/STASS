import { db } from "@/db";
import { dispositivo } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { verifyAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

// La tabla `conteo` es de alto volumen: damos margen a la función y forzamos
// runtime Node + render dinámico (la consulta agrega muchas filas).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Bins de calibre: floor(perimeter) de 4 a 34  →  "Calibre 4-5 cm" ... "Calibre 34-35 cm"
const BIN_MIN = 4;
const BIN_MAX = 34;
const BINS: number[] = [];
for (let b = BIN_MIN; b <= BIN_MAX; b++) BINS.push(b);

interface SessionRow {
  session_id: string;
  codigo_lote: string | null;
  ventana: number;
  producto: string | null;
  variedad: string | null;
  subvariedad: string | null;
  inicio: string;
  termino: string | null;
  duracion_min: number | null;
}

/**
 * Exporta las ventanas (lote_session) del dispositivo a Excel (.xlsx),
 * reproduciendo el formato del CSV "..._ventanas_...".
 *
 * Query params opcionales:
 *   ?tz=America/Santiago   zona horaria para los horarios (default America/Santiago)
 *   ?dir=0|1|all           qué mediciones cuentan: 0=in (default), 1=out, all=ambas
 *
 * Solo lectura.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ dispositivoId: string }> }
) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { dispositivoId } = await params;
    const { searchParams } = new URL(req.url);
    const tz = searchParams.get("tz") || "America/Santiago";
    const dirParam = searchParams.get("dir") || "0";
    const dirCond =
      dirParam === "all"
        ? sql`TRUE`
        : sql`c.direction = ${dirParam === "1" ? 1 : 0}`;

    const [device] = await db
      .select({ id: dispositivo.id, nombre: dispositivo.nombre })
      .from(dispositivo)
      .where(eq(dispositivo.id, dispositivoId))
      .limit(1);

    if (!device) {
      return NextResponse.json(
        { error: "Dispositivo not found" },
        { status: 404 }
      );
    }

    // 1. Ventanas (sesiones) + contexto del lote. Ventana = row_number por lote.
    const sessions = (await db.execute(sql`
      SELECT
        s.id AS session_id,
        l.codigo_lote AS codigo_lote,
        ROW_NUMBER() OVER (PARTITION BY s.lote_id ORDER BY s.start_time)::int AS ventana,
        p.nombre AS producto,
        v.nombre AS variedad,
        sv.nombre AS subvariedad,
        to_char(s.start_time AT TIME ZONE ${tz}, 'YYYY-MM-DD HH24:MI') AS inicio,
        to_char(s.end_time   AT TIME ZONE ${tz}, 'YYYY-MM-DD HH24:MI') AS termino,
        ROUND(EXTRACT(EPOCH FROM (COALESCE(s.end_time, now()) - s.start_time)) / 60)::int AS duracion_min
      FROM lote_session s
      JOIN lote l               ON l.id = s.lote_id
      LEFT JOIN variedad v      ON v.id = l.variedad_id
      LEFT JOIN producto p      ON p.id = v.producto_id
      LEFT JOIN subvariedad sv  ON sv.id = l.subvariedad_id
      WHERE s.dispositivo_id = ${dispositivoId}
      ORDER BY s.start_time
    `)) as unknown as SessionRow[];

    // 2. Histograma + total + desviación por sesión, en UNA sola pasada.
    //    LATERAL hace de lote_session el lado externo (~pocas filas) y por cada
    //    sesión escanea solo su ventana [start_time, end_time) usando el índice
    //    idx_conteo_dispositivo (dispositivo_id, ts). GROUPING SETS devuelve:
    //      - filas con bin != NULL  → conteo por calibre
    //      - fila  con bin == NULL  → total y stddev de toda la sesión
    const agg = (await db.execute(sql`
      SELECT s.id AS session_id, g.bin, g.cnt, g.stddev
      FROM lote_session s
      LEFT JOIN LATERAL (
        SELECT floor(c.perimeter)::int AS bin,
               COUNT(*)::int AS cnt,
               stddev_samp(c.perimeter) AS stddev
        FROM conteo c
        WHERE c.dispositivo_id = s.dispositivo_id
          AND c.ts >= s.start_time
          AND c.ts < COALESCE(s.end_time, now())
          AND c.perimeter IS NOT NULL
          AND ${dirCond}
        GROUP BY GROUPING SETS ((floor(c.perimeter)), ())
      ) g ON TRUE
      WHERE s.dispositivo_id = ${dispositivoId}
    `)) as unknown as {
      session_id: string;
      bin: number | null;
      cnt: number | null;
      stddev: number | string | null;
    }[];

    const histMap = new Map<string, Map<number, number>>();
    const statsMap = new Map<
      string,
      { total: number; stddev: number | string | null }
    >();
    for (const r of agg) {
      if (r.bin === null) {
        // fila de rollup () → total + stddev de la sesión completa
        statsMap.set(r.session_id, {
          total: Number(r.cnt ?? 0),
          stddev: r.stddev,
        });
      } else {
        if (!histMap.has(r.session_id)) histMap.set(r.session_id, new Map());
        histMap.get(r.session_id)!.set(Number(r.bin), Number(r.cnt ?? 0));
      }
    }

    // 4. Construir filas con el orden de columnas del CSV original.
    const header = [
      "Lote",
      "Ventana",
      "Dispositivo",
      "Session ID",
      "Producto",
      "Variedad",
      "Subvariedad",
      "Horario inicio",
      "Horario termino",
      "Duracion (min)",
      "Desviacion estandar",
      "Conteo total",
      ...BINS.map((b) => `Calibre ${b}-${b + 1} cm`),
    ];

    const rows: (string | number)[][] = [header];

    for (const s of sessions) {
      const st = statsMap.get(s.session_id);
      const h = histMap.get(s.session_id) ?? new Map<number, number>();
      const total = st ? Number(st.total) : 0;
      const stddev =
        st && st.stddev != null
          ? Number(Number(st.stddev).toFixed(3))
          : "";

      rows.push([
        s.codigo_lote ?? "",
        Number(s.ventana),
        device.nombre,
        s.session_id,
        s.producto ?? "",
        s.variedad ?? "",
        s.subvariedad ?? "",
        s.inicio ?? "",
        s.termino ?? "",
        s.duracion_min != null ? Number(s.duracion_min) : "",
        stddev,
        total,
        ...BINS.map((b) => h.get(b) ?? 0),
      ]);
    }

    // 5. Generar el .xlsx en memoria.
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ventanas");
    const buf = XLSX.write(wb, {
      type: "array",
      bookType: "xlsx",
    }) as Uint8Array;

    const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
    const filename = `${device.nombre}_ventanas_${stamp}.xlsx`;

    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error exporting dispositivo ventanas:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
