"use client";

import React from "react";
import clsx from "clsx";
import { Check, Play, Circle } from "lucide-react";

export interface LifecycleStep {
  servicioId: string;
  servicioNombre: string;
  servicioTipo: string;
  procesoId: string | null;
  procesoEstado: string | null;
  procesoTemporada: string | null;
  tipoProcesoNombre: string | null;
  asignadoAt: string;
  totalIn: number;
  totalOut: number;
  firstTs: string | null;
  lastTs: string | null;
}

interface LoteLifecycleTimelineProps {
  steps: LifecycleStep[];
  activeStepIndex?: number;
  selectedStepIndex?: number | null;
  onStepClick?: (index: number) => void;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function formatNumber(n: number): string {
  return n.toLocaleString("es-CL");
}

export function LoteLifecycleTimeline({
  steps,
  activeStepIndex,
  selectedStepIndex,
  onStepClick,
}: LoteLifecycleTimelineProps) {
  if (steps.length === 0) {
    return (
      <div className="text-sm text-slate-500 py-4 text-center">
        Este lote aun no ha sido asignado a ningun servicio.
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex items-start gap-0 min-w-max px-2">
        {steps.map((step, idx) => {
          const isActive = idx === activeStepIndex;
          const isCompleted =
            activeStepIndex !== undefined ? idx < activeStepIndex : step.totalIn + step.totalOut > 0;
          const isSelected = idx === selectedStepIndex;
          const hasData = step.totalIn + step.totalOut > 0;

          return (
            <div key={step.servicioId} className="flex items-start">
              {/* Step */}
              <button
                onClick={() => onStepClick?.(idx)}
                className={clsx(
                  "flex flex-col items-center gap-2 px-4 py-3 rounded-xl transition-all duration-200 min-w-[140px] cursor-pointer",
                  isSelected
                    ? "bg-cyan-950/40 border border-cyan-500/30"
                    : "hover:bg-white/[0.03] border border-transparent"
                )}
              >
                {/* Node */}
                <div
                  className={clsx(
                    "flex items-center justify-center w-9 h-9 rounded-full border-2 transition-all",
                    isActive
                      ? "border-emerald-500 bg-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                      : isCompleted
                      ? "border-cyan-500 bg-cyan-500/20"
                      : "border-slate-700 bg-slate-800/60"
                  )}
                >
                  {isActive ? (
                    <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                  ) : isCompleted ? (
                    <Check className="w-4 h-4 text-cyan-400" />
                  ) : (
                    <Circle className="w-3 h-3 text-slate-600" />
                  )}
                </div>

                {/* Label */}
                <div className="text-center space-y-0.5">
                  <p
                    className={clsx(
                      "text-xs font-semibold leading-tight",
                      isActive
                        ? "text-emerald-400"
                        : isCompleted
                        ? "text-cyan-400"
                        : "text-slate-500"
                    )}
                  >
                    {step.tipoProcesoNombre ?? "Sin proceso"}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate max-w-[120px]">
                    {step.servicioNombre}
                  </p>
                  {step.asignadoAt && (
                    <p className="text-[10px] text-slate-600">
                      {formatDate(step.asignadoAt)}
                    </p>
                  )}
                  {hasData && (
                    <p
                      className={clsx(
                        "text-[10px] font-medium",
                        isActive ? "text-emerald-500/80" : "text-cyan-500/60"
                      )}
                    >
                      {formatNumber(step.totalIn + step.totalOut)} bulbos
                    </p>
                  )}
                </div>
              </button>

              {/* Connector line */}
              {idx < steps.length - 1 && (
                <div className="flex items-center self-center mt-1 pt-1">
                  <div
                    className={clsx(
                      "w-8 h-0.5 rounded-full",
                      isCompleted ? "bg-cyan-500/40" : "bg-slate-700/60"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
