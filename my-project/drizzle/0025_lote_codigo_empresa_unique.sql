-- ═══════════════════════════════════════════════════════════════════════════
-- Migración 0025: codigo_lote único por empresa
--
-- Requiere que los duplicados ya estén fusionados (ver script de fusión FASE B
-- y tabla de auditoría lote_merge_map_20260722).
--
-- Índice único normalizado (lower+trim, igual que el dedup de la app) y parcial
-- (solo aplica cuando hay código y empresa). Excluye lotes sin código y lotes
-- huérfanos (sin empresa).
--
-- NOTA: este índice NO está declarado en src/db/schema.ts porque drizzle-kit no
-- expresa de forma confiable un índice único PARCIAL sobre una EXPRESIÓN. Vive
-- solo en SQL crudo; no ejecutar `drizzle-kit push` contra esta BD.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE UNIQUE INDEX IF NOT EXISTS "uq_lote_codigo_empresa"
  ON "lote" (lower(trim("codigo_lote")), "empresa_id")
  WHERE "codigo_lote" IS NOT NULL AND "empresa_id" IS NOT NULL;
