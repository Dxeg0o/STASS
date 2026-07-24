-- Calibre declarado por salida (calibrador de 4 salidas), con vigencia temporal.
-- Ver docs/plan_calibre_declarado_por_salida.md y
-- docs/plan_calibre_declarado_por_salida_ejecucion.md en qualiblick-app.
--
-- NOTA: esta migración ya fue aplicada directo en prod el 2026-07-24 (branching de
-- Supabase no disponible; se validó con pruebas transaccionales con ROLLBACK contra el
-- servicio TEST 2 APR). Este archivo documenta ese estado para que quede en control de
-- versiones — no se re-ejecuta contra la BD actual, solo aplica en un entorno nuevo.
--
-- Backup previo (aplicado en prod, no repetir si ya existe):
--   CREATE TABLE lote_cierre_calibre_bin_backup_20260724 AS
--     SELECT * FROM lote_cierre_calibre_bin;
--   ALTER TABLE lote_cierre_calibre_bin_backup_20260724 ENABLE ROW LEVEL SECURITY;

-- ─── Flag de modo por servicio ──────────────────────────────────────────────

ALTER TABLE servicio
  ADD COLUMN IF NOT EXISTS modo_calibre text NOT NULL DEFAULT 'medido'
  CHECK (modo_calibre IN ('medido', 'declarado'));

-- ─── Identidad de salida ────────────────────────────────────────────────────

ALTER TABLE dispositivo_servicio
  ADD COLUMN IF NOT EXISTS salida_orden  smallint,
  ADD COLUMN IF NOT EXISTS salida_nombre text;

CREATE UNIQUE INDEX IF NOT EXISTS dispositivo_servicio_salida_uq
  ON dispositivo_servicio (servicio_id, salida_orden)
  WHERE salida_orden IS NOT NULL AND fecha_termino IS NULL;

-- ─── Cierre por salida con vigencia temporal ───────────────────────────────

CREATE EXTENSION IF NOT EXISTS btree_gist SCHEMA extensions;

ALTER TABLE lote_cierre_calibre_bin
  ADD COLUMN IF NOT EXISTS id uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS dispositivo_id uuid REFERENCES dispositivo(id),
  ADD COLUMN IF NOT EXISTS vigente_desde timestamptz,
  ADD COLUMN IF NOT EXISTS vigente_hasta timestamptz;

ALTER TABLE lote_cierre_calibre_bin
  DROP CONSTRAINT IF EXISTS lote_cierre_calibre_bin_lote_id_servicio_id_range_pk;

ALTER TABLE lote_cierre_calibre_bin
  ADD CONSTRAINT lote_cierre_calibre_bin_pkey PRIMARY KEY (id);

ALTER TABLE lote_cierre_calibre_bin
  ALTER COLUMN calibre_from DROP NOT NULL,
  ALTER COLUMN calibre_to   DROP NOT NULL;

ALTER TABLE lote_cierre_calibre_bin
  DROP CONSTRAINT IF EXISTS lote_cierre_calibre_bin_range_check,
  ADD CONSTRAINT lote_cierre_calibre_bin_range_check CHECK (
        (calibre_from IS NOT NULL OR calibre_to IS NOT NULL)
    AND (calibre_from IS NULL OR calibre_from >= 0)
    AND (calibre_from IS NULL OR calibre_to IS NULL OR calibre_to > calibre_from)
  );

ALTER TABLE lote_cierre_calibre_bin
  DROP CONSTRAINT IF EXISTS lcc_vigencia_check;

ALTER TABLE lote_cierre_calibre_bin
  ADD CONSTRAINT lcc_vigencia_check CHECK (
    vigente_hasta IS NULL OR vigente_desde IS NULL OR vigente_hasta > vigente_desde
  );

-- legacy: declaración a nivel de lote (sin salida — lo que existía antes de esta migración)
CREATE UNIQUE INDEX IF NOT EXISTS lcc_legacy_uq
  ON lote_cierre_calibre_bin (lote_id, servicio_id, calibre_from, calibre_to)
  NULLS NOT DISTINCT
  WHERE dispositivo_id IS NULL;

-- tramos por salida: no pueden solaparse en el tiempo para la misma salida+lote
ALTER TABLE lote_cierre_calibre_bin
  DROP CONSTRAINT IF EXISTS lcc_sin_solape;

ALTER TABLE lote_cierre_calibre_bin
  ADD CONSTRAINT lcc_sin_solape
  EXCLUDE USING gist (
    lote_id WITH =,
    servicio_id WITH =,
    dispositivo_id WITH =,
    tstzrange(vigente_desde, vigente_hasta, '[)') WITH &&
  ) WHERE (dispositivo_id IS NOT NULL);

-- ─── Telemetría de versión de tablet (habilita F6: saber qué tablets ya
--     actualizaron antes de retirar el soporte del payload v1) ─────────────

ALTER TABLE tablet
  ADD COLUMN IF NOT EXISTS app_version text,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- ─── Vistas de resolución (única fuente de verdad para reportes) ───────────
-- Parten de `conteo` (nunca de la declaración) y hacen LEFT JOIN contra los tramos
-- declarados, para que un tramo sin conteos o un conteo sin tramo vigente nunca
-- desaparezca del reporte — cae en el bucket "Sin declarar".
-- unidades = count_in + count_out (conteo.direction: 0=in, 1=out), ver decisión
-- del 2026-07-24 en el plan.

CREATE OR REPLACE VIEW v_lote_calibre_declarado AS
WITH tramos AS (
  SELECT id, lote_id, servicio_id, dispositivo_id, calibre_from, calibre_to, bins,
         COALESCE(vigente_desde, '-infinity'::timestamptz) AS desde,
         COALESCE(vigente_hasta, 'infinity'::timestamptz) AS hasta
  FROM lote_cierre_calibre_bin
  WHERE dispositivo_id IS NOT NULL
),
conteo_matched AS (
  SELECT c.lote_id, c.servicio_id, c.dispositivo_id, t.id AS tramo_id,
         t.calibre_from, t.calibre_to
  FROM conteo c
  LEFT JOIN tramos t
    ON t.dispositivo_id = c.dispositivo_id
   AND t.lote_id = c.lote_id
   AND t.servicio_id = c.servicio_id
   AND c.ts >= t.desde AND c.ts < t.hasta
),
unidades AS (
  SELECT lote_id, servicio_id, calibre_from, calibre_to, COUNT(*) AS unidades
  FROM conteo_matched
  GROUP BY 1,2,3,4
),
bins_decl AS (
  SELECT lote_id, servicio_id, calibre_from, calibre_to,
         SUM(bins) AS bins,
         array_agg(DISTINCT dispositivo_id) AS salidas
  FROM tramos
  GROUP BY 1,2,3,4
)
SELECT
  COALESCE(u.lote_id, b.lote_id) AS lote_id,
  COALESCE(u.servicio_id, b.servicio_id) AS servicio_id,
  b.calibre_from,
  b.calibre_to,
  (b.calibre_from IS NULL AND b.calibre_to IS NULL) AS sin_declarar,
  COALESCE(b.bins, 0) AS bins,
  COALESCE(u.unidades, 0) AS unidades,
  b.salidas
FROM unidades u
FULL JOIN bins_decl b
  ON u.lote_id = b.lote_id AND u.servicio_id = b.servicio_id
 AND u.calibre_from IS NOT DISTINCT FROM b.calibre_from
 AND u.calibre_to IS NOT DISTINCT FROM b.calibre_to;

ALTER VIEW v_lote_calibre_declarado SET (security_invoker = true);

CREATE OR REPLACE VIEW v_caja_calibre_declarado AS
WITH tramos AS (
  SELECT id, lote_id, servicio_id, dispositivo_id, calibre_from, calibre_to, bins,
         COALESCE(vigente_desde, '-infinity'::timestamptz) AS desde,
         COALESCE(vigente_hasta, 'infinity'::timestamptz) AS hasta
  FROM lote_cierre_calibre_bin
  WHERE dispositivo_id IS NOT NULL
),
bins_decl AS (
  SELECT lote_id, servicio_id, calibre_from, calibre_to,
         SUM(bins) AS bins,
         array_agg(DISTINCT dispositivo_id) AS salidas
  FROM tramos
  GROUP BY 1,2,3,4
),
conteo_matched AS (
  SELECT c.caja_lote_session_id, c.lote_id, c.servicio_id, c.dispositivo_id,
         t.id AS tramo_id, t.calibre_from, t.calibre_to
  FROM conteo c
  LEFT JOIN tramos t
    ON t.dispositivo_id = c.dispositivo_id
   AND t.lote_id = c.lote_id
   AND t.servicio_id = c.servicio_id
   AND c.ts >= t.desde AND c.ts < t.hasta
  WHERE c.caja_lote_session_id IS NOT NULL
),
unidades AS (
  SELECT caja_lote_session_id, lote_id, servicio_id, calibre_from, calibre_to, COUNT(*) AS unidades
  FROM conteo_matched
  GROUP BY 1,2,3,4,5
)
SELECT
  u.caja_lote_session_id,
  u.lote_id,
  u.servicio_id,
  u.calibre_from,
  u.calibre_to,
  (u.calibre_from IS NULL AND u.calibre_to IS NULL) AS sin_declarar,
  u.unidades,
  b.bins,
  b.salidas
FROM unidades u
LEFT JOIN bins_decl b
  ON u.lote_id = b.lote_id AND u.servicio_id = b.servicio_id
 AND u.calibre_from IS NOT DISTINCT FROM b.calibre_from
 AND u.calibre_to IS NOT DISTINCT FROM b.calibre_to;

ALTER VIEW v_caja_calibre_declarado SET (security_invoker = true);

CREATE OR REPLACE VIEW v_lote_calibre_discrepancia AS
WITH tramos AS (
  SELECT id, lote_id, servicio_id, dispositivo_id, calibre_from, calibre_to,
         COALESCE(vigente_desde, '-infinity'::timestamptz) AS desde,
         COALESCE(vigente_hasta, 'infinity'::timestamptz) AS hasta
  FROM lote_cierre_calibre_bin
  WHERE dispositivo_id IS NOT NULL
),
matched AS (
  SELECT c.lote_id, c.servicio_id, c.dispositivo_id, t.id AS tramo_id,
         t.calibre_from, t.calibre_to, c.perimeter
  FROM conteo c
  JOIN tramos t
    ON t.dispositivo_id = c.dispositivo_id
   AND t.lote_id = c.lote_id
   AND t.servicio_id = c.servicio_id
   AND c.ts >= t.desde AND c.ts < t.hasta
  WHERE c.perimeter IS NOT NULL
)
SELECT
  lote_id, servicio_id, dispositivo_id, tramo_id, calibre_from, calibre_to,
  COUNT(*) AS total,
  COUNT(*) FILTER (
    WHERE (calibre_from IS NULL OR perimeter >= calibre_from)
      AND (calibre_to IS NULL OR perimeter < calibre_to)
  ) AS dentro_de_rango,
  COUNT(*) FILTER (WHERE calibre_from IS NOT NULL AND perimeter < calibre_from) AS bajo,
  COUNT(*) FILTER (WHERE calibre_to IS NOT NULL AND perimeter >= calibre_to) AS sobre
FROM matched
GROUP BY 1,2,3,4,5,6;

ALTER VIEW v_lote_calibre_discrepancia SET (security_invoker = true);
