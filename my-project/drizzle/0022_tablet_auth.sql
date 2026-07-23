-- ═══════════════════════════════════════════════════════════════════════════
-- Migración 0022: Autenticación de tablets (app de operador)
--
-- Credencial por tablet, análogo a dispositivo.api_key_hash. Habilita que la
-- app hable con la API vía x-app-key y, más adelante, prender RLS cerrando el
-- acceso directo del anon key.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "tablet" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"api_key_hash" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "tablet_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "idx_tablet_api_key"
  ON "tablet" ("api_key_hash")
  WHERE "api_key_hash" IS NOT NULL;
