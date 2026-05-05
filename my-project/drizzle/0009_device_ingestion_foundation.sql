-- ═══════════════════════════════════════════════════════════════════════════
-- Migración 0009: Fundación para ingesta de dispositivos
--
-- Cambios:
--   1. api_key_hash en dispositivo     → autenticación de dispositivos físicos
--   2. Índice parcial en lote_session  → lookup O(1) de sesión activa por dispositivo
--   3. Trigger STATEMENT-level         → un solo UPSERT por batch en vez de N
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Columna api_key_hash ──────────────────────────────────────────────────
-- Nullable: dispositivos sin key no pueden sincronizar, pero existen en el sistema.
-- El hash es SHA-256 del secret raw (almacenamos solo el hash, nunca el plaintext).

ALTER TABLE "dispositivo" ADD COLUMN "api_key_hash" text;
--> statement-breakpoint

CREATE UNIQUE INDEX "idx_dispositivo_api_key"
  ON "dispositivo" ("api_key_hash")
  WHERE "api_key_hash" IS NOT NULL;
--> statement-breakpoint

-- ── 2. Índice parcial de sesión activa ──────────────────────────────────────
-- El endpoint de ingesta necesita resolver la sesión activa del dispositivo
-- con cada request. Sin este índice la query es seq-scan sobre lote_session.

CREATE INDEX "idx_lote_session_active"
  ON "lote_session" ("dispositivo_id")
  WHERE "end_time" IS NULL;
--> statement-breakpoint

-- ── 3. Trigger STATEMENT-level con tabla de transición ──────────────────────
-- El trigger FOR EACH ROW dispara N veces para un INSERT de N filas.
-- Con FOR EACH STATEMENT + REFERENCING NEW TABLE el motor hace UNA sola
-- pasada, agrupando todos los eventos del batch en dos UPSERTs.
-- Esto es crítico para soportar batches de miles de filas sin degradación.

CREATE OR REPLACE FUNCTION update_lote_stats()
RETURNS trigger AS $$
BEGIN
  -- ── Rama A: eventos con caja → caja_stats ───────────────────────────────
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

  -- ── Rama B: eventos sin caja → lote_stats ───────────────────────────────
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
  WHERE r.caja_lote_session_id IS NULL
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

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

-- Reemplazar el trigger FOR EACH ROW con la versión STATEMENT-level.
-- La cláusula REFERENCING NEW TABLE expone todos los registros insertados
-- como una relación virtual "new_rows" dentro de la función.

DROP TRIGGER IF EXISTS conteo_stats_trigger ON "conteo";
--> statement-breakpoint

CREATE TRIGGER conteo_stats_trigger
  AFTER INSERT ON "conteo"
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT
  EXECUTE FUNCTION update_lote_stats();
