"use client";

import CountUp from "./CountUp";
import { metrics } from "../../data/aplicaciones";

/** Devuelve el porcentaje real cuando la métrica es un porcentaje, para dibujar la barra. */
function percent(value: string) {
  if (!value.trim().endsWith("%")) return null;
  const numeric = Number(value.replace("%", "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(numeric) && numeric <= 100 ? numeric : null;
}

/**
 * Los resultados se presentan como una ficha de medición: misma estructura para
 * cada dato, cifras tabulares y una barra solo donde el valor es un porcentaje.
 */
export default function FichaMetrics() {
  return (
    <div className="ficha">
      <div className="ficha-grid">
        {metrics.map(({ value, label }) => {
          const bar = percent(value);
          return (
            <div className="ficha-cell" key={label}>
              <strong><CountUp value={value} /></strong>
              <span>{label}</span>
              {bar !== null && (
                <div className="ficha-bar" aria-hidden="true">
                  <i style={{ width: `${bar}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
