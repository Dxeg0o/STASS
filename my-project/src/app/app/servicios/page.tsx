"use client";

import React, { useContext, useEffect, useState, useMemo } from "react";
import { AuthenticationContext } from "@/app/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ScanLine,
  Sprout,
  ShieldCheck,
  Activity,
  Calendar,
  Cpu,
  Layers,
  Hash,
} from "lucide-react";

// ---------- Types ----------

interface ActiveLote {
  id: string;
}

interface ServicioSummary {
  id: string;
  nombre: string;
  tipo: string;
  estado: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  procesoId: string | null;
  tipoProcesoNombre: string | null;
  temporada: string | null;
  loteCount: number;
  totalCount: number;
  lastActivity: string | null;
  activeLote: ActiveLote | null;
  deviceCount: number;
}

// ---------- Helpers ----------

const SERVICE_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  linea_conteo: { label: "Línea de Conteo", icon: ScanLine },
  maquina_plantacion: { label: "Máquina de Plantación", icon: Sprout },
  estacion_calidad: { label: "Estación de Calidad", icon: ShieldCheck },
};

const TYPE_LABELS: Record<string, string> = {
  linea_conteo: "Línea de Conteo",
  maquina_plantacion: "Máquina de Plantación",
  estacion_calidad: "Estación de Calidad",
};

const ESTADO_LABELS: Record<string, { label: string; className: string }> = {
  planificado: {
    label: "Planificado",
    className: "border-slate-600 bg-slate-800/60 text-slate-400",
  },
  en_curso: {
    label: "En curso",
    className: "border-emerald-500/30 bg-emerald-950/20 text-emerald-400",
  },
  completado: {
    label: "Completado",
    className: "border-blue-500/30 bg-blue-950/20 text-blue-400",
  },
  cancelado: {
    label: "Cancelado",
    className: "border-red-500/30 bg-red-950/20 text-red-400",
  },
};

function formatNumber(n: number): string {
  return n.toLocaleString("es-CL");
}

function formatDate(isoString: string | null): string {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTimestamp(isoString: string | null): string {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------- Service Card ----------

function ServicioCard({ servicio }: { servicio: ServicioSummary }) {
  const meta = SERVICE_META[servicio.tipo] ?? {
    label: servicio.tipo,
    icon: Activity,
  };
  const Icon = meta.icon;

  return (
    <Link href={`/app/servicios/${servicio.id}`}>
      <Card className="bg-slate-900/40 border-white/10 hover:border-cyan-500/40 hover:bg-slate-900/70 transition-all duration-200 cursor-pointer group h-full">
        <CardContent className="p-5 flex flex-col gap-4 h-full">
          {/* Header: icon + name */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/20 group-hover:bg-cyan-950/60 transition-colors">
              <Icon className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white truncate group-hover:text-cyan-100 transition-colors">
                {servicio.nombre}
              </h3>
              <Badge
                className="mt-1 text-xs border-slate-700 bg-slate-800/60 text-slate-400 hover:bg-slate-800/60"
                variant="outline"
              >
                {TYPE_LABELS[servicio.tipo] ?? servicio.tipo}
              </Badge>
              <Badge
                className={`mt-1 ml-1 text-xs ${ESTADO_LABELS[servicio.estado]?.className ?? ESTADO_LABELS.planificado.className}`}
                variant="outline"
              >
                {ESTADO_LABELS[servicio.estado]?.label ?? servicio.estado}
              </Badge>
              {servicio.tipoProcesoNombre && (
                <Badge
                  className="mt-1 text-xs border-cyan-500/30 bg-cyan-950/20 text-cyan-500 hover:bg-cyan-950/20"
                  variant="outline"
                >
                  {servicio.tipoProcesoNombre}
                  {servicio.temporada && ` · ${servicio.temporada}`}
                </Badge>
              )}
            </div>
          </div>

          {/* Active lote indicator */}
          {servicio.activeLote ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-950/30 border border-emerald-500/20">
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs text-emerald-400 truncate font-medium">
                Lote {servicio.activeLote.id.slice(-8)}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/30 border border-white/5">
              <span className="h-2 w-2 rounded-full bg-slate-600 flex-shrink-0" />
              <span className="text-xs text-slate-600">Sin lote activo</span>
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Layers className="w-3 h-3" />
                <span className="text-xs">Lotes</span>
              </div>
              <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
                {servicio.loteCount}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Hash className="w-3 h-3" />
                <span className="text-xs">Conteo</span>
              </div>
              <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
                {formatNumber(servicio.totalCount)}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Cpu className="w-3 h-3" />
                <span className="text-xs">Dispositivos</span>
              </div>
              <span className="text-sm font-semibold text-slate-300">
                {servicio.deviceCount}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Calendar className="w-3 h-3" />
                <span className="text-xs">Inicio</span>
              </div>
              <span className="text-sm font-semibold text-slate-300">
                {formatDate(servicio.fechaInicio)}
              </span>
            </div>
          </div>

          {/* Date range footer */}
          <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs text-slate-600">
              {servicio.fechaFin
                ? `Finalizado: ${formatDate(servicio.fechaFin)}`
                : ESTADO_LABELS[servicio.estado]?.label ?? servicio.estado}
            </span>
            {servicio.lastActivity && (
              <span className="text-xs text-slate-600">
                {formatTimestamp(servicio.lastActivity)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ---------- Main Page ----------

export default function ServiciosPage() {
  const { data, loading: authLoading } = useContext(AuthenticationContext);
  const searchParams = useSearchParams();
  const tipoParam = searchParams.get("tipo") ?? "todos";

  const [servicios, setServicios] = useState<ServicioSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>(tipoParam);

  // Sync filter when URL param changes
  useEffect(() => {
    setActiveFilter(tipoParam);
  }, [tipoParam]);

  useEffect(() => {
    if (!data?.empresaId) return;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ empresaId: data.empresaId });
    if (activeFilter !== "todos") params.set("tipo", activeFilter);

    fetch(`/api/servicios/summary?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar los servicios");
        return res.json();
      })
      .then((arr: ServicioSummary[]) => setServicios(arr))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [data?.empresaId, activeFilter]);

  // Derive available types from all fetched data (accumulate across filter changes)
  const availableTypes = useMemo(() => {
    const types = Array.from(new Set(servicios.map((s) => s.tipo)));
    return types;
  }, [servicios]);

  const filterTabs = useMemo(() => {
    const all = ["todos"];
    // Include types present in current results, plus known META types if data has them
    const types = availableTypes.length > 0
      ? availableTypes
      : Object.keys(SERVICE_META);
    return [...all, ...types];
  }, [availableTypes]);

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
      {/* Page title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Servicios
        </h1>
        <p className="text-slate-400 mt-1">
          {data.empresaNombre ?? ""}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {filterTabs.map((tipo) => {
          const isActive = activeFilter === tipo;
          const label =
            tipo === "todos"
              ? "Todos"
              : (TYPE_LABELS[tipo] ?? tipo);

          return (
            <button
              key={tipo}
              onClick={() => setActiveFilter(tipo)}
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
              className="h-56 rounded-xl bg-slate-900/40 border border-white/5 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Service cards */}
      {!loading && servicios.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {servicios.map((servicio) => (
            <ServicioCard key={servicio.id} servicio={servicio} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && servicios.length === 0 && !error && (
        <div className="text-center py-20 text-slate-500">
          <Activity className="w-10 h-10 mx-auto mb-3 text-slate-700" />
          <p className="text-lg font-medium">No hay servicios</p>
          <p className="text-sm mt-1">
            {activeFilter !== "todos"
              ? `No se encontraron servicios de tipo "${TYPE_LABELS[activeFilter] ?? activeFilter}".`
              : "No hay servicios registrados para esta empresa."}
          </p>
        </div>
      )}
    </div>
  );
}
