import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { lote, producto, subvariedad, variedad } from "@/db/schema";

// Mismo shape que hoy arma el cliente Supabase con
// `.select('id, codigo_lote, variedad_id, created_at, variedad(nombre, producto(nombre))')`
// — es lo que Lote.fromJson (Dart) espera.

export interface LoteDTO {
  id: string;
  codigo_lote: string | null;
  variedad_id: string | null;
  created_at: string | null;
  procesado?: boolean;
  subvariedad: { nombre: string } | null;
  variedad: { nombre: string; producto: { nombre: string } | null } | null;
}

type LoteRow = typeof lote.$inferSelect;
type VariedadRow = typeof variedad.$inferSelect;
type ProductoRow = typeof producto.$inferSelect;

function toDTO(row: {
  lote: LoteRow;
  subvariedad: typeof subvariedad.$inferSelect | null;
  variedad: VariedadRow | null;
  producto: ProductoRow | null;
}): LoteDTO {
  return {
    id: row.lote.id,
    codigo_lote: row.lote.codigoLote,
    variedad_id: row.lote.variedadId,
    created_at: row.lote.createdAt ? row.lote.createdAt.toISOString() : null,
    subvariedad: row.subvariedad ? { nombre: row.subvariedad.nombre } : null,
    variedad: row.variedad
      ? {
          nombre: row.variedad.nombre,
          producto: row.producto ? { nombre: row.producto.nombre } : null,
        }
      : null,
  };
}

function loteJoinQuery() {
  return db
    .select({ lote, subvariedad, variedad, producto })
    .from(lote)
    .leftJoin(subvariedad, eq(lote.subvariedadId, subvariedad.id))
    .leftJoin(variedad, eq(lote.variedadId, variedad.id))
    .leftJoin(producto, eq(variedad.productoId, producto.id));
}

export async function fetchLotesByIds(ids: string[]): Promise<LoteDTO[]> {
  if (ids.length === 0) return [];
  const rows = await loteJoinQuery().where(inArray(lote.id, ids));
  return rows.map(toDTO);
}

export async function fetchLoteById(id: string): Promise<LoteDTO | null> {
  const rows = await fetchLotesByIds([id]);
  return rows[0] ?? null;
}

export async function fetchLoteByCodigo(codigo: string): Promise<LoteDTO | null> {
  const rows = await loteJoinQuery().where(eq(lote.codigoLote, codigo)).limit(1);
  if (rows.length === 0) return null;
  return toDTO(rows[0]);
}

// Mismo criterio de orden que Lote.displayName / _compareLotes en Dart:
// (producto + variedad) o, a falta de eso, el código, y como desempate el
// código. Se ordena acá para que la app reciba la lista lista para mostrar.
export function sortLotes(lotes: LoteDTO[]): LoteDTO[] {
  const subvariedadName = (l: LoteDTO) => l.subvariedad?.nombre?.trim() || "";
  const displayCode = (l: LoteDTO) => l.codigo_lote ?? l.id.slice(0, 8);

  return [...lotes].sort((a, b) => {
    if (a.procesado !== b.procesado) return a.procesado ? -1 : 1;
    if (a.procesado && b.procesado) {
      const byDate = (b.created_at ? Date.parse(b.created_at) : 0) -
          (a.created_at ? Date.parse(a.created_at) : 0);
      if (byDate !== 0) return byDate;
    } else {
      const bySubvariedad = subvariedadName(a).localeCompare(
        subvariedadName(b),
        undefined,
        { sensitivity: "base" },
      );
      if (bySubvariedad !== 0) return bySubvariedad;
    }
    return displayCode(a).localeCompare(displayCode(b), undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });
}
