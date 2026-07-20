import type {
  caja,
  cajaLoteSession,
  loteSession,
  loteStats,
} from "@/db/schema";

// Serializadores a JSON snake_case — el mismo shape que hoy produce Supabase
// PostgREST y que los modelos Dart (fromJson) ya saben parsear. Así, cuando la
// app cambie su capa de red de Supabase a esta API (Fase C), los modelos no
// cambian una sola línea.

type CajaRow = typeof caja.$inferSelect;
type LoteSessionRow = typeof loteSession.$inferSelect;
type CajaLoteSessionRow = typeof cajaLoteSession.$inferSelect;
type LoteStatsRow = typeof loteStats.$inferSelect;

export function serializeCaja(row: CajaRow) {
  return {
    id: row.id,
    codigo: row.codigo,
    empresa_id: row.empresaId,
    tipo: row.tipo,
    capacidad: row.capacidad,
    activa: row.activa,
  };
}

export function serializeLoteSession(row: LoteSessionRow) {
  return {
    id: row.id,
    lote_id: row.loteId,
    dispositivo_id: row.dispositivoId,
    start_time: row.startTime.toISOString(),
    end_time: row.endTime ? row.endTime.toISOString() : null,
  };
}

export function serializeCajaLoteSession(row: CajaLoteSessionRow) {
  return {
    id: row.id,
    caja_id: row.cajaId,
    lote_session_id: row.loteSessionId,
    asignado_at: row.asignadoAt ? row.asignadoAt.toISOString() : null,
    retirado_at: row.retiradoAt ? row.retiradoAt.toISOString() : null,
  };
}

export function serializeLoteStats(row: LoteStatsRow) {
  return {
    lote_id: row.loteId,
    servicio_id: row.servicioId,
    calibre: row.calibre,
    count_in: row.countIn,
    count_out: row.countOut,
    first_ts: row.firstTs ? row.firstTs.toISOString() : null,
    last_ts: row.lastTs ? row.lastTs.toISOString() : null,
  };
}
