-- ═══════════════════════════════════════════════════════════════════════════
-- Migración 0012: Subvariedad asignada a lote
--
-- Permite registrar qué subvariedad corresponde a cada lote importado.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE "lote" ADD COLUMN "subvariedad_id" uuid;
--> statement-breakpoint

ALTER TABLE "lote"
  ADD CONSTRAINT "lote_subvariedad_id_subvariedad_id_fk"
  FOREIGN KEY ("subvariedad_id")
  REFERENCES "public"."subvariedad"("id")
  ON DELETE no action
  ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX "idx_lote_subvariedad_id" ON "lote" ("subvariedad_id");
