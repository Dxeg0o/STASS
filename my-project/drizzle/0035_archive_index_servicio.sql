-- ═══════════════════════════════════════════════════════════════════════════
-- Migración 0035: archivado de conteo acotado por servicio
--
-- `conteo_archive_index` nació asumiendo que se archiva un día completo de la
-- tabla `conteo` (el cron `archive-conteo-daily`), por eso `date` era UNIQUE.
-- El archivado por servicio necesita registrar el mismo día una vez por
-- servicio, así que la unicidad pasa a ser (date, servicio_id).
--
-- `NULLS NOT DISTINCT` mantiene la idempotencia del cron actual, que inserta
-- con servicio_id NULL (= día completo): dos filas con el mismo date y
-- servicio_id NULL siguen colisionando.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE "conteo_archive_index"
  ADD COLUMN IF NOT EXISTS "servicio_id" uuid REFERENCES "servicio"("id");
--> statement-breakpoint

ALTER TABLE "conteo_archive_index"
  DROP CONSTRAINT IF EXISTS "conteo_archive_index_date_unique";
--> statement-breakpoint

ALTER TABLE "conteo_archive_index"
  ADD CONSTRAINT "conteo_archive_index_date_servicio_unique"
  UNIQUE NULLS NOT DISTINCT ("date", "servicio_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_archive_servicio"
  ON "conteo_archive_index" ("servicio_id", "date" DESC);
