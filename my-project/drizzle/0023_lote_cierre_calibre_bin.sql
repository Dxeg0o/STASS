CREATE TABLE IF NOT EXISTS "lote_cierre_calibre_bin" (
  "lote_id" uuid NOT NULL,
  "servicio_id" uuid NOT NULL,
  "calibre_bucket" integer NOT NULL,
  "bins" integer NOT NULL,
  "tablet_id" uuid REFERENCES "public"."tablet"("id"),
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "lote_cierre_calibre_bin_lote_id_servicio_id_calibre_bucket_pk"
    PRIMARY KEY ("lote_id", "servicio_id", "calibre_bucket"),
  CONSTRAINT "lote_cierre_calibre_bin_lote_servicio_fk"
    FOREIGN KEY ("lote_id", "servicio_id")
    REFERENCES "public"."lote_servicio" ("lote_id", "servicio_id")
    ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "idx_lote_cierre_calibre_servicio"
  ON "public"."lote_cierre_calibre_bin" ("servicio_id");

-- Si una versión anterior creó la tabla con FKs separadas, se reemplazan por
-- la relación compuesta lote_servicio elegida para este cierre.
DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.lote_cierre_calibre_bin'::regclass
      AND contype = 'f'
      AND confrelid IN ('public.lote'::regclass, 'public.servicio'::regclass)
  LOOP
    EXECUTE format(
      'ALTER TABLE public.lote_cierre_calibre_bin DROP CONSTRAINT %I',
      constraint_name
    );
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lote_cierre_calibre_bin_lote_servicio_fk'
      AND conrelid = 'public.lote_cierre_calibre_bin'::regclass
  ) THEN
    ALTER TABLE "public"."lote_cierre_calibre_bin"
      ADD CONSTRAINT "lote_cierre_calibre_bin_lote_servicio_fk"
      FOREIGN KEY ("lote_id", "servicio_id")
      REFERENCES "public"."lote_servicio" ("lote_id", "servicio_id")
      ON DELETE cascade;
  END IF;
END $$;
