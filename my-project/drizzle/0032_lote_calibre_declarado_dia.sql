-- Resumen persistente para reportería de calibre declarado.
-- Se recalcula al guardar tramos v2 y evita que los correos lean conteo.

CREATE TABLE lote_calibre_declarado_dia (
  dia date NOT NULL,
  lote_id uuid NOT NULL REFERENCES lote(id) ON DELETE CASCADE,
  servicio_id uuid NOT NULL REFERENCES servicio(id) ON DELETE CASCADE,
  dispositivo_id uuid NOT NULL REFERENCES dispositivo(id),
  calibre_key text NOT NULL,
  calibre_from integer,
  calibre_to integer,
  sin_declarar boolean NOT NULL DEFAULT false,
  unidades bigint NOT NULL CHECK (unidades >= 0),
  refreshed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dia, lote_id, servicio_id, dispositivo_id, calibre_key)
);

CREATE INDEX lote_calibre_declarado_dia_reporte_idx
  ON lote_calibre_declarado_dia (servicio_id, dia, lote_id);

ALTER TABLE lote_calibre_declarado_dia ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION refresh_lote_calibre_declarado_dia(
  p_lote_id uuid,
  p_servicio_id uuid
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM lote_calibre_declarado_dia
  WHERE lote_id = p_lote_id AND servicio_id = p_servicio_id;

  INSERT INTO lote_calibre_declarado_dia (
    dia, lote_id, servicio_id, dispositivo_id, calibre_key,
    calibre_from, calibre_to, sin_declarar, unidades, refreshed_at
  )
  SELECT
    (c.ts AT TIME ZONE 'America/Santiago')::date AS dia,
    c.lote_id,
    c.servicio_id,
    c.dispositivo_id,
    CASE
      WHEN t.id IS NULL THEN 'sin_declarar'
      ELSE COALESCE(t.calibre_from::text, '') || ':' || COALESCE(t.calibre_to::text, '')
    END AS calibre_key,
    t.calibre_from,
    t.calibre_to,
    t.id IS NULL AS sin_declarar,
    COUNT(*)::bigint AS unidades,
    now()
  FROM conteo c
  LEFT JOIN lote_cierre_calibre_bin t
    ON t.lote_id = c.lote_id
   AND t.servicio_id = c.servicio_id
   AND t.dispositivo_id = c.dispositivo_id
   AND c.ts >= COALESCE(t.vigente_desde, '-infinity'::timestamptz)
   AND c.ts < COALESCE(t.vigente_hasta, 'infinity'::timestamptz)
  WHERE c.lote_id = p_lote_id
    AND c.servicio_id = p_servicio_id
  GROUP BY 1, 2, 3, 4, 5, 6, 7, 8;
END;
$$;
