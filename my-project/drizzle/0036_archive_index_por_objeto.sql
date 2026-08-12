-- ═══════════════════════════════════════════════════════════════════════════
-- Migración 0036: la unicidad del índice de archivos es por objeto
--
-- La 0035 puso UNIQUE (date, servicio_id) asumiendo un archivo por día y
-- servicio. No se sostiene: un día de 1,4M filas se parte en varios .csv.gz
-- para no pasar el tope de 100 MB del bucket, y cada parte es una fila del
-- índice. Con la clave anterior, cualquier día multi-parte fallaba al segundo
-- INSERT.
--
-- La unicidad real es "este objeto está registrado una sola vez", así que
-- entra file_path en la clave. El día completo del cron `archive-conteo`
-- (servicio_id NULL, un único archivo) sigue cubierto igual.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE "conteo_archive_index"
  DROP CONSTRAINT IF EXISTS "conteo_archive_index_date_servicio_unique";
--> statement-breakpoint

ALTER TABLE "conteo_archive_index"
  ADD CONSTRAINT "conteo_archive_index_objeto_unique"
  UNIQUE NULLS NOT DISTINCT ("date", "servicio_id", "file_path");
