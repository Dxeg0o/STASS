import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  servicio,
  loteServicio,
  loteStats,
  vLoteCalibreDeclarado,
} from "@/db/schema";

// ─── Único punto de decisión medido/declarado ──────────────────────────────
//
// Dashboard y correos (F4) llaman SOLO a `getCalibreBreakdown`. Ningún otro lugar del
// código decide de qué fuente sale el calibre de un servicio — esa es la garantía de
// que la dualidad medido/declarado no se reimplemente (y potencialmente diverja) en
// cada pantalla. Ver docs/plan_calibre_declarado_por_salida.md §4.2/§6 en
// qualiblick-app.
//
// - 'medido': calibre calculado por QB desde perímetro (lote_stats). Comportamiento
//   histórico, sin cambios — es lo que ya usa el dashboard hoy.
// - 'declarado': calibre que la operaria declaró por salida al cerrar el lote
//   (v_lote_calibre_declarado, que ya resuelve vigencia temporal y el bucket "Sin
//   declarar"). El calibre medido queda como referencia interna de QA, no se envía al
//   cliente en este modo.

export interface CalibreRow {
  calibreFrom: number | null;
  calibreTo: number | null;
  label: string;
  bins: number;
  unidades: number;
  salidas: string[] | null;
}

export interface CalibreBreakdown {
  source: "medido" | "declarado";
  rows: CalibreRow[];
  sinDeclarar?: { unidades: number };
}

function label(from: number | null, to: number | null): string {
  if (from === null && to !== null) return `Calibre <${to} cm`;
  if (to === null && from !== null) return `Calibre >${from} cm`;
  if (from !== null && to !== null) return `Calibre ${from}-${to} cm`;
  return "Sin declarar";
}

export async function getCalibreBreakdown(
  servicioId: string,
  opts: { loteId?: string } = {}
): Promise<CalibreBreakdown> {
  const svc = await db.query.servicio.findFirst({
    where: eq(servicio.id, servicioId),
    columns: { id: true, modoCalibre: true },
  });
  if (!svc) {
    throw new Error(`Servicio ${servicioId} no encontrado`);
  }

  if (svc.modoCalibre === "declarado") {
    return getDeclarado(servicioId, opts.loteId);
  }
  return getMedido(servicioId, opts.loteId);
}

async function getDeclarado(
  servicioId: string,
  loteId?: string
): Promise<CalibreBreakdown> {
  const rows = await db
    .select()
    .from(vLoteCalibreDeclarado)
    .where(
      loteId
        ? and(
            eq(vLoteCalibreDeclarado.servicioId, servicioId),
            eq(vLoteCalibreDeclarado.loteId, loteId)
          )
        : eq(vLoteCalibreDeclarado.servicioId, servicioId)
    );

  const declarados = rows.filter((r) => !r.sinDeclarar);
  const sinDeclarar = rows.filter((r) => r.sinDeclarar);

  const byRange = new Map<string, CalibreRow>();
  for (const r of declarados) {
    const key = `${r.calibreFrom ?? "null"}:${r.calibreTo ?? "null"}`;
    const current = byRange.get(key) ?? {
      calibreFrom: r.calibreFrom,
      calibreTo: r.calibreTo,
      label: label(r.calibreFrom, r.calibreTo),
      bins: 0,
      unidades: 0,
      salidas: [] as string[],
    };
    current.bins += Number(r.bins) || 0;
    current.unidades += Number(r.unidades) || 0;
    if (r.salidas) {
      current.salidas = [...new Set([...(current.salidas ?? []), ...r.salidas])];
    }
    byRange.set(key, current);
  }

  const sinDeclararUnidades = sinDeclarar.reduce(
    (sum, r) => sum + (Number(r.unidades) || 0),
    0
  );

  return {
    source: "declarado",
    rows: [...byRange.values()].sort(
      (a, b) => (a.calibreFrom ?? -Infinity) - (b.calibreFrom ?? -Infinity)
    ),
    ...(sinDeclararUnidades > 0
      ? { sinDeclarar: { unidades: sinDeclararUnidades } }
      : {}),
  };
}

async function getMedido(
  servicioId: string,
  loteId?: string
): Promise<CalibreBreakdown> {
  const links = await db
    .select({ loteId: loteServicio.loteId })
    .from(loteServicio)
    .where(eq(loteServicio.servicioId, servicioId));

  const linkedLoteIds = [...new Set(links.map((row) => row.loteId))];
  const loteIds = loteId
    ? linkedLoteIds.filter((id) => id === loteId)
    : linkedLoteIds;
  if (loteIds.length === 0) {
    return { source: "medido", rows: [] };
  }

  const statRows = await db
    .select({
      calibre: loteStats.calibre,
      unidades: sql<number>`COALESCE(SUM(${loteStats.countIn} + ${loteStats.countOut}), 0)::int`,
    })
    .from(loteStats)
    .where(
      and(
        eq(loteStats.servicioId, servicioId),
        inArray(loteStats.loteId, loteIds)
      )
    )
    .groupBy(loteStats.calibre);

  const byBucket = new Map<number, number>();
  for (const row of statRows) {
    const calibre = Number(row.calibre);
    if (!Number.isFinite(calibre)) continue;
    const bucket = Math.floor(calibre);
    byBucket.set(bucket, (byBucket.get(bucket) ?? 0) + (Number(row.unidades) || 0));
  }

  const rows: CalibreRow[] = [...byBucket.entries()]
    .sort(([a], [b]) => a - b)
    .map(([bucket, unidades]) => ({
      calibreFrom: bucket,
      calibreTo: bucket + 1,
      label: label(bucket, bucket + 1),
      bins: 0,
      unidades,
      salidas: null,
    }));

  return { source: "medido", rows };
}
