-- Refresh acotado a un dia de lote_calibre_declarado_dia.
--
-- La funcion de 0032 recalcula el historico completo de un lote y solo se
-- invoca cuando un operador guarda tramos en la app. Los informes automaticos
-- no pueden depender de esa accion manual: si nadie guardo tramos ese dia, el
-- correo sale vacio aunque haya conteos. Esta variante recalcula un solo dia,
-- es sargable contra idx_conteo_servicio y la puede llamar el cron.
--
-- La funcion original se mantiene intacta: la sigue usando el flujo de cierre
-- de calibres.

CREATE OR REPLACE FUNCTION refresh_lote_calibre_declarado_dia_rango(
  p_lote_id uuid,
  p_servicio_id uuid,
  p_dia date
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_desde timestamptz := (p_dia)::timestamp AT TIME ZONE 'America/Santiago';
  v_hasta timestamptz := (p_dia + 1)::timestamp AT TIME ZONE 'America/Santiago';
BEGIN
  DELETE FROM lote_calibre_declarado_dia
  WHERE lote_id = p_lote_id AND servicio_id = p_servicio_id AND dia = p_dia;

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
    AND c.ts >= v_desde
    AND c.ts < v_hasta
  GROUP BY 1, 2, 3, 4, 5, 6, 7, 8;
END;
$$;
