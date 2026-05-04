-- ═══════════════════════════════════════════════════════════════════════════
-- Migración 0010: Infraestructura de archivado de conteo
--
-- Cambios:
--   1. Tabla conteo_archive_index  → registro auditable de cada CSV archivado
--   2. Bucket Storage privado      → almacenamiento de los CSV comprimidos
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Tabla de índice de archivos ───────────────────────────────────────────
-- Cada fila representa un día archivado con metadatos para auditoría y
-- para que el frontend pueda resolver qué archivo descargar al consultar histórico.

CREATE TABLE "conteo_archive_index" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "date"        date NOT NULL,
  "file_path"   text NOT NULL,
  "row_count"   integer NOT NULL,
  "checksum"    text,
  "archived_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "conteo_archive_index_date_unique" UNIQUE("date")
);
--> statement-breakpoint

CREATE INDEX "idx_archive_date" ON "conteo_archive_index" ("date" DESC);
--> statement-breakpoint

-- ── 2. Bucket de Storage privado ────────────────────────────────────────────
-- Acceso solo via service role o signed URLs generadas server-side.
-- El bucket usa la extensión de Storage de Supabase (schema storage).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'conteo-archive',
  'conteo-archive',
  false,
  104857600,         -- 100 MB por archivo máximo
  ARRAY['text/csv', 'application/gzip', 'application/octet-stream']
)
ON CONFLICT (id) DO NOTHING;
