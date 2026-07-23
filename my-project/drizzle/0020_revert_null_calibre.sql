-- ═══════════════════════════════════════════════════════════════════════════
-- Migración 0020: revertir nullable calibre en lote_stats y caja_stats
--
-- La migración 0019 hizo calibre nullable con NULLS NOT DISTINCT, pero el
-- trigger ya resuelve el caso de perimeter=null con WHERE perimeter IS NOT NULL,
-- por lo que calibre en estas tablas nunca es NULL. Se restaura NOT NULL y
-- la primary key original para reflejar correctamente el diseño.
-- ═══════════════════════════════════════════════════════════════════════════

-- lote_stats
DROP INDEX IF EXISTS "lote_stats_unique_key";
ALTER TABLE "lote_stats" ALTER COLUMN "calibre" SET NOT NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lote_stats_lote_id_servicio_id_dispositivo_id_calibre_pk'
  ) THEN
    ALTER TABLE "lote_stats" ADD CONSTRAINT "lote_stats_lote_id_servicio_id_dispositivo_id_calibre_pk"
      PRIMARY KEY ("lote_id", "servicio_id", "dispositivo_id", "calibre");
  END IF;
END $$;

-- caja_stats
DROP INDEX IF EXISTS "caja_stats_unique_key";
ALTER TABLE "caja_stats" ALTER COLUMN "calibre" SET NOT NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'caja_stats_caja_lote_session_id_dispositivo_id_calibre_pk'
  ) THEN
    ALTER TABLE "caja_stats" ADD CONSTRAINT "caja_stats_caja_lote_session_id_dispositivo_id_calibre_pk"
      PRIMARY KEY ("caja_lote_session_id", "dispositivo_id", "calibre");
  END IF;
END $$;
