import React from "react";
import {
  formatDateShort,
  formatNumber,
  relativeTimeEs,
  type LoteOption,
} from "./types";

export function LoteContextCard({ lote }: { lote: LoteOption }) {
  const code = lote.codigoLote?.trim() || "Sin código";
  const hasData = lote.totalBulbs > 0 || !!lote.lastTs;

  const parts: Array<{ key: string; node: React.ReactNode }> = [];
  if (lote.variedadNombre)
    parts.push({ key: "var", node: <span className="text-slate-300">{lote.variedadNombre}</span> });
  if (lote.productoNombre)
    parts.push({ key: "prod", node: lote.productoNombre });
  if (lote.etapaActual)
    parts.push({ key: "etapa", node: lote.etapaActual });
  if (hasData) {
    parts.push({ key: "bulbs", node: `${formatNumber(lote.totalBulbs)} bulbos` });
    parts.push({ key: "act", node: relativeTimeEs(lote.lastTs) });
  }
  if (lote.createdAt)
    parts.push({ key: "created", node: `creado ${formatDateShort(lote.createdAt)}` });

  return (
    <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
      <span className="font-mono text-sm font-semibold text-white">{code}</span>
      {lote.isActive && (
        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
          activo
        </span>
      )}
      {!hasData && (
        <span className="text-[10px] text-amber-300">sin datos</span>
      )}
      {parts.map((p, i) => (
        <React.Fragment key={p.key}>
          {i === 0 ? <span className="text-slate-700">·</span> : null}
          {p.node}
          {i < parts.length - 1 && <span className="text-slate-700">·</span>}
        </React.Fragment>
      ))}
    </div>
  );
}
