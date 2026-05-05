-- ═══════════════════════════════════════════════════════════════════════════
-- Migración 0014: vigencia temporal para dispositivo_servicio
--
-- Regla:
--   - dispositivo_servicio es historial de asignaciones dispositivo → servicio.
--   - Un dispositivo puede tener como máximo una asignación abierta.
--   - El sync resuelve servicio por ts de medición dentro de este intervalo.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE "dispositivo_servicio"
  ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid();
--> statement-breakpoint

UPDATE "dispositivo_servicio"
SET "id" = gen_random_uuid()
WHERE "id" IS NULL;
--> statement-breakpoint

ALTER TABLE "dispositivo_servicio"
  ALTER COLUMN "id" SET NOT NULL;
--> statement-breakpoint

ALTER TABLE "dispositivo_servicio"
  ADD COLUMN IF NOT EXISTS "fecha_inicio" timestamp with time zone;
--> statement-breakpoint

UPDATE "dispositivo_servicio"
SET "fecha_inicio" = COALESCE("asignado_at", now())
WHERE "fecha_inicio" IS NULL;
--> statement-breakpoint

ALTER TABLE "dispositivo_servicio"
  ALTER COLUMN "fecha_inicio" SET NOT NULL;
--> statement-breakpoint

ALTER TABLE "dispositivo_servicio"
  ADD COLUMN IF NOT EXISTS "fecha_termino" timestamp with time zone;
--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'dispositivo_servicio_dispositivo_id_servicio_id_pk'
  ) THEN
    ALTER TABLE "dispositivo_servicio"
      DROP CONSTRAINT "dispositivo_servicio_dispositivo_id_servicio_id_pk";
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'dispositivo_servicio_id_pk'
  ) THEN
    ALTER TABLE "dispositivo_servicio"
      ADD CONSTRAINT "dispositivo_servicio_id_pk" PRIMARY KEY ("id");
  END IF;
END $$;
--> statement-breakpoint

-- Si existen multiples asignaciones abiertas de un mismo dispositivo,
-- mantener abierta solo la mas reciente y cerrar las anteriores.
WITH ranked AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "dispositivo_id"
      ORDER BY "fecha_inicio" DESC, "id" DESC
    ) AS rn
  FROM "dispositivo_servicio"
  WHERE "fecha_termino" IS NULL
)
UPDATE "dispositivo_servicio" ds
SET "fecha_termino" = now()
FROM ranked r
WHERE r."id" = ds."id"
  AND r.rn > 1;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "idx_dispositivo_servicio_open_device"
  ON "dispositivo_servicio" ("dispositivo_id")
  WHERE "fecha_termino" IS NULL;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_dispositivo_servicio_device_interval"
  ON "dispositivo_servicio" ("dispositivo_id", "fecha_inicio", "fecha_termino");
