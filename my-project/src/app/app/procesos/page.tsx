"use client";

import React, { useContext, useEffect, useState, useMemo } from "react";
import { AuthenticationContext } from "@/app/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  ClipboardList,
  Calendar,
  Layers,
  ChevronDown,
} from "lucide-react";

// ---------- Types ----------

interface TipoProceso {
  id: string;
  nombre: string;
}

interface Producto {
  id: string;
  nombre: string;
}

interface Proceso {
  id: string;
  tipoProcesoId: string;
  empresaId: string;
  productoId: string | null;
  temporada: string | null;
  estado: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  notas: string | null;
  createdAt: string;
  tipoProceso: TipoProceso;
  producto: Producto | null;
}

// ---------- Helpers ----------

const ESTADO_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  planificado: {
    label: "Planificado",
    className: "border-slate-600 bg-slate-800/60 text-slate-400",
  },
  en_curso: {
    label: "En Curso",
    className: "border-cyan-500/40 bg-cyan-950/40 text-cyan-400",
  },
  completado: {
    label: "Completado",
    className: "border-emerald-500/40 bg-emerald-950/40 text-emerald-400",
  },
  cancelado: {
    label: "Cancelado",
    className: "border-red-500/40 bg-red-950/40 text-red-400",
  },
};

const ESTADO_TABS = [
  { value: "todos", label: "Todos" },
  { value: "planificado", label: "Planificado" },
  { value: "en_curso", label: "En Curso" },
  { value: "completado", label: "Completado" },
  { value: "cancelado", label: "Cancelado" },
];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ---------- Proceso Card ----------

function ProcesoCard({ proceso }: { proceso: Proceso }) {
  const estado = ESTADO_CONFIG[proceso.estado] ?? {
    label: proceso.estado,
    className: "border-slate-600 bg-slate-800/60 text-slate-400",
  };

  return (
    <Link href={`/app/procesos/${proceso.id}`}>
      <Card className="bg-slate-900/40 border-white/10 hover:border-cyan-500/40 hover:bg-slate-900/70 transition-all duration-200 cursor-pointer group h-full">
        <CardContent className="p-5 flex flex-col gap-3 h-full">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white group-hover:text-cyan-100 transition-colors truncate">
                {proceso.tipoProceso.nombre}
                {proceso.temporada && (
                  <span className="text-slate-400 font-normal">
                    {" "}· {proceso.temporada}
                  </span>
                )}
              </h3>
              {proceso.producto && (
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {proceso.producto.nombre}
                </p>
              )}
            </div>
            <Badge
              variant="outline"
              className={`shrink-0 text-xs ${estado.className}`}
            >
              {estado.label}
            </Badge>
          </div>

          {/* Dates */}
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(proceso.fechaInicio)}</span>
            </div>
            {proceso.fechaFin && (
              <>
                <span>→</span>
                <span>{formatDate(proceso.fechaFin)}</span>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="mt-auto pt-2 border-t border-white/5 flex items-center gap-1.5 text-xs text-slate-600">
            <Layers className="w-3 h-3" />
            <span>
              {proceso.notas ? proceso.notas.slice(0, 60) + (proceso.notas.length > 60 ? "…" : "") : "Sin notas"}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ---------- Main Page ----------

export default function ProcesosPage() {
  const { data, loading: authLoading } = useContext(AuthenticationContext);

  const [procesos, setProcesos] = useState<Proceso[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estadoFilter, setEstadoFilter] = useState("todos");
  const [temporadaFilter, setTemporadaFilter] = useState("todas");

  useEffect(() => {
    if (!data?.empresaId) return;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ empresaId: data.empresaId });
    if (estadoFilter !== "todos") params.set("estado", estadoFilter);

    fetch(`/api/procesos?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar los procesos");
        return res.json();
      })
      .then((arr: Proceso[]) => setProcesos(arr))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [data?.empresaId, estadoFilter]);

  // Derive unique temporadas from all loaded data
  const temporadas = useMemo(() => {
    const all = Array.from(
      new Set(procesos.map((p) => p.temporada).filter(Boolean) as string[])
    ).sort((a, b) => b.localeCompare(a));
    return all;
  }, [procesos]);

  const filtered = useMemo(() => {
    if (temporadaFilter === "todas") return procesos;
    return procesos.filter((p) => p.temporada === temporadaFilter);
  }, [procesos, temporadaFilter]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400 text-sm animate-pulse">Cargando…</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400 text-sm">No estás autenticado.</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Procesos
        </h1>
        <p className="text-slate-400 mt-1">{data.empresaNombre ?? ""}</p>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Estado tabs */}
        <div className="flex flex-wrap gap-2">
          {ESTADO_TABS.map(({ value, label }) => {
            const isActive = estadoFilter === value;
            return (
              <button
                key={value}
                onClick={() => setEstadoFilter(value)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border ${
                  isActive
                    ? "bg-cyan-950/60 text-cyan-400 border-cyan-500/40 shadow-[0_0_12px_rgba(34,211,238,0.15)]"
                    : "bg-slate-900/40 text-slate-400 border-white/10 hover:border-white/20 hover:text-slate-300"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Temporada selector */}
        {temporadas.length > 0 && (
          <div className="relative">
            <select
              value={temporadaFilter}
              onChange={(e) => setTemporadaFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-full text-sm font-medium bg-slate-900/40 text-slate-400 border border-white/10 hover:border-white/20 focus:outline-none focus:border-cyan-500/40 cursor-pointer"
            >
              <option value="todas">Todas las temporadas</option>
              {temporadas.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-red-950/20 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-44 rounded-xl bg-slate-900/40 border border-white/5 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Cards */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <ProcesoCard key={p.id} proceso={p} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && !error && (
        <div className="text-center py-20 text-slate-500">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 text-slate-700" />
          <p className="text-lg font-medium">No hay procesos</p>
          <p className="text-sm mt-1">
            {estadoFilter !== "todos"
              ? `No se encontraron procesos con estado "${ESTADO_CONFIG[estadoFilter]?.label ?? estadoFilter}".`
              : "No hay procesos registrados para esta empresa."}
          </p>
        </div>
      )}
    </div>
  );
}
