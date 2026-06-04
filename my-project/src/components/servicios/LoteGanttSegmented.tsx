"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";

export interface GanttSegment {
  start: number; // epoch ms
  end: number; // epoch ms
}

export interface GanttRow {
  id: string;
  nombre: string;
  totalCount: number;
  segments: GanttSegment[];
}

function fmtDur(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

interface Props {
  rows: GanttRow[];
  /** [min, max] del eje X en epoch ms */
  domain: [number, number];
  /** alto de cada fila en px */
  rowHeight?: number;
  labelWidth?: number;
}

const TICK_COUNT = 6;
const MIN_SEG_PX = 3;

export function LoteGanttSegmented({
  rows,
  domain,
  rowHeight = 34,
  labelWidth = 120,
}: Props) {
  const [hover, setHover] = useState<{
    x: number;
    y: number;
    seg: GanttSegment;
    nombre: string;
  } | null>(null);

  const [min, max] = domain;
  const span = Math.max(1, max - min);

  const ticks = useMemo(() => {
    if (max <= min) return [];
    return Array.from({ length: TICK_COUNT }, (_, i) => {
      const t = min + (span * i) / (TICK_COUNT - 1);
      return { t, pct: (i / (TICK_COUNT - 1)) * 100 };
    });
  }, [min, max, span]);

  const pct = (ms: number) => ((ms - min) / span) * 100;

  return (
    <div className="w-full text-xs">
      {/* Eje temporal */}
      <div className="flex">
        <div style={{ width: labelWidth }} className="shrink-0" />
        <div className="relative flex-1 h-5 border-b border-white/10">
          {ticks.map((tk, i) => (
            <div
              key={i}
              className="absolute top-0 -translate-x-1/2 text-[11px] text-slate-400 whitespace-nowrap"
              style={{ left: `${tk.pct}%` }}
            >
              {format(new Date(tk.t), "dd/MM HH:mm")}
            </div>
          ))}
        </div>
      </div>

      {/* Filas */}
      <div className="relative">
        {rows.map((row, idx) => (
          <div
            key={row.id}
            className="flex items-center"
            style={{ height: rowHeight }}
          >
            <div
              style={{ width: labelWidth }}
              className="shrink-0 pr-3 truncate text-slate-300 font-medium"
              title={row.nombre}
            >
              {row.nombre}
            </div>
            <div
              className={`relative flex-1 h-full ${
                idx % 2 === 0 ? "bg-white/[0.02]" : ""
              }`}
            >
              {/* Líneas de la grilla */}
              {ticks.map((tk, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 w-px bg-white/5"
                  style={{ left: `${tk.pct}%` }}
                />
              ))}

              {/* Segmentos de actividad real */}
              {row.segments.map((seg, i) => {
                const left = pct(seg.start);
                const rawW = pct(seg.end) - left;
                return (
                  <div
                    key={i}
                    className="absolute top-1/2 -translate-y-1/2 rounded-[3px] bg-cyan-400 hover:bg-cyan-300 transition-colors cursor-pointer"
                    style={{
                      left: `${left}%`,
                      width: `max(${MIN_SEG_PX}px, ${rawW}%)`,
                      height: rowHeight - 14,
                    }}
                    onMouseEnter={(e) =>
                      setHover({
                        x: e.clientX,
                        y: e.clientY,
                        seg,
                        nombre: row.nombre,
                      })
                    }
                    onMouseMove={(e) =>
                      setHover((h) =>
                        h ? { ...h, x: e.clientX, y: e.clientY } : h
                      )
                    }
                    onMouseLeave={() => setHover(null)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Tooltip flotante */}
      {hover && (
        <div
          className="fixed z-50 pointer-events-none rounded-md border border-white/10 bg-slate-900/95 px-3 py-2 text-[11px] text-slate-100 shadow-lg"
          style={{
            left: Math.min(hover.x + 12, window.innerWidth - 220),
            top: hover.y + 12,
          }}
        >
          <div className="font-semibold text-cyan-300">{hover.nombre}</div>
          <div className="text-slate-300">
            {format(new Date(hover.seg.start), "dd/MM/yyyy HH:mm")} →{" "}
            {format(new Date(hover.seg.end), "dd/MM/yyyy HH:mm")}
          </div>
          <div className="text-slate-400">
            Duración: {fmtDur(hover.seg.end - hover.seg.start)}
          </div>
        </div>
      )}
    </div>
  );
}
