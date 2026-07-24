-- Permite bins = 0 en tramos por salida (calibre declarado por salida) cuando el rango
-- es abierto (merma, ej. "<6" o ">10") — antes el CHECK exigía bins > 0 siempre, pero
-- una merma frecuentemente no lleva conteo de bins. Para declaraciones con rango
-- cerrado (calibre normal) se sigue exigiendo bins > 0, sin cambios.
--
-- Aplicado directo en prod el 2026-07-24 (mismo criterio que 0029: sin branching de
-- Supabase disponible, se verificó el nuevo CHECK antes de comprometerlo). Ver
-- docs/plan_calibre_declarado_por_salida.md en qualiblick-app.

ALTER TABLE lote_cierre_calibre_bin DROP CONSTRAINT lote_cierre_calibre_bin_bins_check;

ALTER TABLE lote_cierre_calibre_bin ADD CONSTRAINT lote_cierre_calibre_bin_bins_check
  CHECK (
    bins >= 0
    AND bins * 10 = trunc(bins * 10)
    AND (bins > 0 OR calibre_from IS NULL OR calibre_to IS NULL)
  );
