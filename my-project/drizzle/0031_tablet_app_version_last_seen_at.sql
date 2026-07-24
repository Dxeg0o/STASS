-- Corrige un gap encontrado en revisión (2026-07-24): la migración 0029 documentaba
-- estas columnas como ya aplicadas en prod, pero el ALTER TABLE tablet nunca se había
-- ejecutado realmente contra la base — quedó solo en el archivo, no en la BD. El efecto
-- práctico era silencioso: `verifyAppKey` en src/lib/app-auth.ts actualiza
-- tablet.last_seen_at/app_version en cada request de forma fire-and-forget (con
-- .catch(() => {})), así que la falta de estas columnas nunca rompía ninguna request,
-- solo hacía que la telemetría de versión (precondición de F6) no se guardara nunca.
--
-- Aplicado directo en prod el 2026-07-24. Ver
-- docs/plan_calibre_declarado_por_salida_revision.md en qualiblick-app.

ALTER TABLE tablet
  ADD COLUMN IF NOT EXISTS app_version text,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
