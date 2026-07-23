-- Permite registrar bins fraccionados, por ejemplo 12.5.
ALTER TABLE "public"."lote_cierre_calibre_bin"
  ALTER COLUMN "bins" TYPE numeric(10, 1)
  USING "bins"::numeric(10, 1);

ALTER TABLE "public"."lote_cierre_calibre_bin"
  DROP CONSTRAINT IF EXISTS "lote_cierre_calibre_bin_bins_check",
  ADD CONSTRAINT "lote_cierre_calibre_bin_bins_check"
    CHECK ("bins" > 0 AND "bins" * 10 = trunc("bins" * 10));
