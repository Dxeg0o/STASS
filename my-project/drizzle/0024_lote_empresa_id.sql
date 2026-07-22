-- ═══════════════════════════════════════════════════════════════════════════
-- Migración 0024: lote.empresa_id (maestro de lotes por empresa)
--
-- Primer paso hacia "codigo_lote único por empresa". Agrega la columna
-- empresa_id al lote (denormalizada desde servicio vía lote_servicio) para
-- poder enforzar unicidad por empresa. NO crea el índice único todavía:
-- primero hay que fusionar los duplicados existentes (ver script de fusión y
-- migración 0025).
--
-- Un lote pasa a ser el "maestro" físico del código dentro de la empresa;
-- se referencia (no se copia) desde cada servicio/proceso vía lote_servicio.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE "lote" ADD COLUMN "empresa_id" uuid;
--> statement-breakpoint

ALTER TABLE "lote"
  ADD CONSTRAINT "lote_empresa_id_empresa_id_fk"
  FOREIGN KEY ("empresa_id")
  REFERENCES "public"."empresa"("id")
  ON DELETE set null
  ON UPDATE no action;
--> statement-breakpoint

-- Backfill: cada lote enlazado hereda la empresa de su servicio.
-- Hoy cada lote tiene exactamente 1 servicio, así que es determinístico.
-- Los lotes huérfanos (sin lote_servicio) quedan con empresa_id NULL.
UPDATE "lote" l
SET "empresa_id" = s."empresa_id"
FROM "lote_servicio" ls
JOIN "servicio" s ON s."id" = ls."servicio_id"
WHERE ls."lote_id" = l."id";
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_lote_empresa_id" ON "lote" ("empresa_id");
