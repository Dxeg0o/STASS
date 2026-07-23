-- Transforma la captura manual de buckets de 1 cm a rangos operativos.
-- La migracion conserva los datos existentes: bucket N pasa a [N, N+1).

ALTER TABLE "public"."lote_cierre_calibre_bin"
  ADD COLUMN "calibre_from" integer,
  ADD COLUMN "calibre_to" integer;

UPDATE "public"."lote_cierre_calibre_bin"
SET
  "calibre_from" = "calibre_bucket",
  "calibre_to" = "calibre_bucket" + 1
WHERE "calibre_from" IS NULL OR "calibre_to" IS NULL;

ALTER TABLE "public"."lote_cierre_calibre_bin"
  ALTER COLUMN "calibre_from" SET NOT NULL,
  ALTER COLUMN "calibre_to" SET NOT NULL;

ALTER TABLE "public"."lote_cierre_calibre_bin"
  DROP CONSTRAINT "lote_cierre_calibre_bin_lote_id_servicio_id_calibre_bucket_pk";

ALTER TABLE "public"."lote_cierre_calibre_bin"
  DROP COLUMN "calibre_bucket";

ALTER TABLE "public"."lote_cierre_calibre_bin"
  ADD CONSTRAINT "lote_cierre_calibre_bin_lote_id_servicio_id_range_pk"
    PRIMARY KEY ("lote_id", "servicio_id", "calibre_from", "calibre_to"),
  ADD CONSTRAINT "lote_cierre_calibre_bin_range_check"
    CHECK ("calibre_from" >= 0 AND "calibre_to" > "calibre_from"),
  ADD CONSTRAINT "lote_cierre_calibre_bin_bins_check"
    CHECK ("bins" > 0);

CREATE INDEX IF NOT EXISTS "idx_lote_cierre_calibre_servicio_range"
  ON "public"."lote_cierre_calibre_bin"
    ("servicio_id", "calibre_from", "calibre_to");
