-- ═══════════════════════════════════════════════════════════════════════════
-- Migración 0013: trigger dual de stats
--
-- Regla:
--   - Toda medición insertada en conteo alimenta lote_stats.
--   - Si la medición viene con caja_lote_session_id, además alimenta caja_stats.
--
-- No cambia el modelo de sesiones ni recalcula históricos: solo corrige el
-- comportamiento del trigger para los inserts nuevos.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_lote_stats()
RETURNS trigger AS $$
BEGIN
  -- Todas las mediciones alimentan lote_stats, independiente de si tienen caja.
  INSERT INTO lote_stats (
    lote_id, servicio_id, dispositivo_id, calibre,
    count_in, count_out, first_ts, last_ts
  )
  SELECT
    r.lote_id,
    r.servicio_id,
    r.dispositivo_id,
    ROUND(r.perimeter::numeric, 1)::real,
    SUM(CASE WHEN r.direction = 0 THEN 1 ELSE 0 END)::int,
    SUM(CASE WHEN r.direction = 1 THEN 1 ELSE 0 END)::int,
    MIN(r.ts),
    MAX(r.ts)
  FROM new_rows r
  GROUP BY
    r.lote_id,
    r.servicio_id,
    r.dispositivo_id,
    ROUND(r.perimeter::numeric, 1)::real
  ON CONFLICT (lote_id, servicio_id, dispositivo_id, calibre) DO UPDATE SET
    count_in  = lote_stats.count_in  + excluded.count_in,
    count_out = lote_stats.count_out + excluded.count_out,
    first_ts  = LEAST(lote_stats.first_ts, excluded.first_ts),
    last_ts   = GREATEST(lote_stats.last_ts, excluded.last_ts);

  -- Solo las mediciones asociadas a una caja alimentan el desglose por caja.
  INSERT INTO caja_stats (
    caja_lote_session_id, dispositivo_id, calibre,
    count_in, count_out, first_ts, last_ts
  )
  SELECT
    r.caja_lote_session_id,
    r.dispositivo_id,
    ROUND(r.perimeter::numeric, 1)::real,
    SUM(CASE WHEN r.direction = 0 THEN 1 ELSE 0 END)::int,
    SUM(CASE WHEN r.direction = 1 THEN 1 ELSE 0 END)::int,
    MIN(r.ts),
    MAX(r.ts)
  FROM new_rows r
  WHERE r.caja_lote_session_id IS NOT NULL
  GROUP BY
    r.caja_lote_session_id,
    r.dispositivo_id,
    ROUND(r.perimeter::numeric, 1)::real
  ON CONFLICT (caja_lote_session_id, dispositivo_id, calibre) DO UPDATE SET
    count_in  = caja_stats.count_in  + excluded.count_in,
    count_out = caja_stats.count_out + excluded.count_out,
    first_ts  = LEAST(caja_stats.first_ts, excluded.first_ts),
    last_ts   = GREATEST(caja_stats.last_ts, excluded.last_ts);

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

DROP TRIGGER IF EXISTS conteo_stats_trigger ON "conteo";
--> statement-breakpoint

CREATE TRIGGER conteo_stats_trigger
  AFTER INSERT ON "conteo"
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT
  EXECUTE FUNCTION update_lote_stats();
