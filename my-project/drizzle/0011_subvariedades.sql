-- ═══════════════════════════════════════════════════════════════════════════
-- Migración 0011: Subvariedades de variedades
--
-- Permite registrar múltiples subvariedades bajo cada variedad global.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE "subvariedad" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nombre" text NOT NULL,
  "variedad_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "subvariedad_nombre_variedad_id_unique" UNIQUE("nombre", "variedad_id")
);
--> statement-breakpoint

ALTER TABLE "subvariedad"
  ADD CONSTRAINT "subvariedad_variedad_id_variedad_id_fk"
  FOREIGN KEY ("variedad_id")
  REFERENCES "public"."variedad"("id")
  ON DELETE cascade
  ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX "idx_subvariedad_variedad_id" ON "subvariedad" ("variedad_id");
