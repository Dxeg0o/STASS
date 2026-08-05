import { db } from "@/db";
import { loteCierreCalibreBin } from "@/db/schema";
import { eq, isNotNull, isNull, sql } from "drizzle-orm";
import { getCajaCountForLote } from "@/lib/app-session";

/**
 * Contenedores de un lote: los que entraron y los que salieron.
 *
 * Son dos tablas distintas y conviene no confundirlas:
 *
 *  - Entrada: `caja`, el contenedor físico con QR que se asigna a la sesión de
 *    lote (`caja_lote_session`). Una misma caja se asigna a TODAS las salidas a
 *    la vez, porque su producto se reparte entre ellas — por eso el conteo es
 *    del lote y no tiene sentido por salida.
 *  - Salida: los bins que la operaria declara por calibre al cerrar
 *    (`lote_cierre_calibre_bin.bins`). Esos sí son por salida.
 */
export interface ContenedoresLote {
  /** Cajas distintas que entraron al lote. */
  cajasEntrada: number;
  /** Bins declarados de salida. Null si el lote no tiene ninguna declaración. */
  binsSalida: number | null;
}

export async function contenedoresDelLote(loteId: string): Promise<ContenedoresLote> {
  // Cajas distintas, misma definición que ya usa la tablet para el numero de
  // orden de caja — se reutiliza para no tener dos formas de contar lo mismo.
  const cajasEntrada = await getCajaCountForLote(loteId);

  // La tabla convive en dos regímenes (ver schema): filas por salida
  // (dispositivo_id NOT NULL) y filas legacy a nivel de lote. Sumar ambas
  // duplicaría, así que se prefiere el desglose por salida cuando existe.
  const [porSalida] = await db
    .select({ bins: sql<string | null>`SUM(${loteCierreCalibreBin.bins})` })
    .from(loteCierreCalibreBin)
    .where(
      sql`${eq(loteCierreCalibreBin.loteId, loteId)} and ${isNotNull(
        loteCierreCalibreBin.dispositivoId
      )}`
    );

  if (porSalida?.bins != null) {
    return { cajasEntrada, binsSalida: Number(porSalida.bins) };
  }

  const [legacy] = await db
    .select({ bins: sql<string | null>`SUM(${loteCierreCalibreBin.bins})` })
    .from(loteCierreCalibreBin)
    .where(
      sql`${eq(loteCierreCalibreBin.loteId, loteId)} and ${isNull(
        loteCierreCalibreBin.dispositivoId
      )}`
    );

  return {
    cajasEntrada,
    binsSalida: legacy?.bins == null ? null : Number(legacy.bins),
  };
}
