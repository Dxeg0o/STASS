-- Congela el servicio operativo de cada lote_session. La tablet instalada no
-- manda servicio_id: el backend lo resuelve al abrir la sesión. El backfill
-- histórico sólo asigna cuando la vigencia del dispositivo identifica uno.

ALTER TABLE lote_session
  ADD COLUMN IF NOT EXISTS servicio_id uuid REFERENCES servicio(id);

CREATE INDEX IF NOT EXISTS lote_session_lote_servicio_idx
  ON lote_session (lote_id, servicio_id);

WITH candidates AS (
  SELECT
    ls.id,
    array_agg(DISTINCT ds.servicio_id) FILTER (WHERE ds.servicio_id IS NOT NULL) AS service_ids
  FROM lote_session ls
  LEFT JOIN dispositivo_servicio ds
    ON ds.dispositivo_id = ls.dispositivo_id
   AND ds.fecha_inicio IS NOT NULL
   AND ds.fecha_inicio <= ls.start_time
   AND (ds.fecha_termino IS NULL OR ds.fecha_termino > ls.start_time)
  WHERE ls.servicio_id IS NULL
  GROUP BY ls.id
)
UPDATE lote_session ls
SET servicio_id = candidates.service_ids[1]
FROM candidates
WHERE ls.id = candidates.id
  AND cardinality(candidates.service_ids) = 1;
