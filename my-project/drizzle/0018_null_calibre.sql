-- ═══════════════════════════════════════════════════════════════════════════
-- Migración 0018: calibre nullable en lote_stats y caja_stats
--
-- Problema: el trigger insertaba calibre = ROUND(NULL) = NULL, pero ambas
-- tablas tenían calibre NOT NULL (parte de la primary key), lo que causaba
-- que la transacción se revirtiera y los conteos sin perímetro nunca se
-- guardaran. Los totales de servicios con perímetro apagado quedaban en 0.
--
-- Solución: eliminar la primary key implícita (que fuerza NOT NULL), hacer
-- calibre nullable, y agregar un índice único NULLS NOT DISTINCT para que
-- el ON CONFLICT del trigger trate dos NULL del mismo grupo como conflicto.
-- ═══════════════════════════════════════════════════════════════════════════

-- lote_stats
ALTER TABLE "lote_stats" DROP CONSTRAINT "lote_stats_lote_id_servicio_id_dispositivo_id_calibre_pk";
ALTER TABLE "lote_stats" ALTER COLUMN "calibre" DROP NOT NULL;
CREATE UNIQUE INDEX "lote_stats_unique_key"
  ON "lote_stats" ("lote_id", "servicio_id", "dispositivo_id", "calibre")
  NULLS NOT DISTINCT;

-- caja_stats
ALTER TABLE "caja_stats" DROP CONSTRAINT "caja_stats_caja_lote_session_id_dispositivo_id_calibre_pk";
ALTER TABLE "caja_stats" ALTER COLUMN "calibre" DROP NOT NULL;
CREATE UNIQUE INDEX "caja_stats_unique_key"
  ON "caja_stats" ("caja_lote_session_id", "dispositivo_id", "calibre")
  NULLS NOT DISTINCT;
