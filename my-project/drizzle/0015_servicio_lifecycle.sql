-- Servicio lifecycle and pending device assignments.

ALTER TABLE "servicio"
  ADD COLUMN IF NOT EXISTS "estado" text DEFAULT 'planificado' NOT NULL;
--> statement-breakpoint

UPDATE "servicio"
SET "estado" = CASE
  WHEN "fecha_fin" IS NOT NULL THEN 'completado'
  WHEN "fecha_inicio" IS NOT NULL THEN 'en_curso'
  ELSE 'planificado'
END;
--> statement-breakpoint

ALTER TABLE "servicio"
  ALTER COLUMN "fecha_inicio" DROP NOT NULL,
  ALTER COLUMN "fecha_inicio" DROP DEFAULT;
--> statement-breakpoint

ALTER TABLE "dispositivo_servicio"
  ALTER COLUMN "fecha_inicio" DROP NOT NULL,
  ALTER COLUMN "fecha_inicio" DROP DEFAULT;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_servicio_proceso_estado"
  ON "servicio" ("proceso_id", "estado");
--> statement-breakpoint
