"use client";

import React, { useContext, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AuthenticationContext } from "@/app/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  ScanLine,
  Sprout,
  ShieldCheck,
  Activity,
  Calendar,
  ArrowLeft,
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

interface Lote {
  id: string;
  createdAt: string;
}

interface LoteServicio {
  loteId: string;
  servicioId: string;
  asignadoAt: string;
  lote: Lote;
}

interface Servicio {
  id: string;
  nombre: string;
  tipo: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  loteServicios: LoteServicio[];
}

interface ProcesoDetail {
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
  servicios: Servicio[];
}

// ---------- Helpers ----------

const ESTADO_CONFIG: Record<string, { label: string; className: string }> = {
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

const ESTADOS = ["planificado", "en_curso", "completado", "cancelado"];

const SERVICIO_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  linea_conteo: { label: "Línea de Conteo", icon: ScanLine },
  maquina_plantacion: { label: "Máquina de Plantación", icon: Sprout },
  estacion_calidad: { label: "Estación de Calidad", icon: ShieldCheck },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ---------- Main Page ----------

export default function ProcesoDetailPage() {
  const params = useParams();
  const procesoId = params.procesoId as string;

  const { data: authData } = useContext(AuthenticationContext);
  const isAdmin = authData?.rol_usuario === "administrador";

  const [proceso, setProceso] = useState<ProcesoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingEstado, setSavingEstado] = useState(false);

  useEffect(() => {
    if (!procesoId) return;
    setLoading(true);
    fetch(`/api/procesos/${procesoId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Proceso no encontrado");
        return res.json();
      })
      .then((d: ProcesoDetail) => setProceso(d))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [procesoId]);

  const handleEstadoChange = async (nuevoEstado: string) => {
    if (!proceso || nuevoEstado === proceso.estado) return;
    setSavingEstado(true);
    try {
      const res = await fetch(`/api/procesos/${procesoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (!res.ok) throw new Error("Error al actualizar estado");
      setProceso((prev) => prev ? { ...prev, estado: nuevoEstado } : prev);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingEstado(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400 text-sm animate-pulse">Cargando…</div>
      </div>
    );
  }

  if (error || !proceso) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-red-400 text-sm">{error ?? "No encontrado"}</div>
      </div>
    );
  }

  const estadoCfg = ESTADO_CONFIG[proceso.estado] ?? {
    label: proceso.estado,
    className: "border-slate-600 bg-slate-800/60 text-slate-400",
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      {/* Back */}
      <Link
        href="/app/procesos"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Procesos
      </Link>

      {/* Header card */}
      <Card className="bg-slate-900/40 border-white/10">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-white">
                {proceso.tipoProceso.nombre}
                {proceso.temporada && (
                  <span className="text-slate-400 font-normal">
                    {" "}· {proceso.temporada}
                  </span>
                )}
              </h1>
              {proceso.producto && (
                <p className="text-slate-400">{proceso.producto.nombre}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Badge
                  variant="outline"
                  className={`text-xs ${estadoCfg.className}`}
                >
                  {estadoCfg.label}
                </Badge>
                {isAdmin && (
                  <div className="relative">
                    <select
                      value={proceso.estado}
                      onChange={(e) => handleEstadoChange(e.target.value)}
                      disabled={savingEstado}
                      className="appearance-none pl-3 pr-7 py-1 rounded-md text-xs bg-slate-800/60 text-slate-400 border border-white/10 hover:border-white/20 focus:outline-none focus:border-cyan-500/40 cursor-pointer disabled:opacity-50"
                    >
                      {ESTADOS.map((e) => (
                        <option key={e} value={e}>
                          {ESTADO_CONFIG[e]?.label ?? e}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                  </div>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="flex flex-col gap-1 text-sm text-slate-500 shrink-0">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                <span>Inicio: {formatDate(proceso.fechaInicio)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                <span>Fin: {formatDate(proceso.fechaFin)}</span>
              </div>
            </div>
          </div>

          {proceso.notas && (
            <p className="mt-4 text-sm text-slate-400 border-t border-white/5 pt-4">
              {proceso.notas}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Servicios vinculados */}
      <Card className="bg-slate-900/40 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white">
            Servicios vinculados
            <span className="ml-2 text-sm font-normal text-slate-500">
              ({proceso.servicios.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {proceso.servicios.length === 0 ? (
            <p className="text-sm text-slate-500 py-2">
              No hay servicios vinculados a este proceso.
            </p>
          ) : (
            <div className="space-y-2">
              {proceso.servicios.map((s) => {
                const meta = SERVICIO_META[s.tipo] ?? {
                  label: s.tipo,
                  icon: Activity,
                };
                const Icon = meta.icon;
                const loteCount = s.loteServicios.length;

                return (
                  <Link
                    key={s.id}
                    href={`/app/servicios/${s.id}`}
                    className="flex items-center justify-between gap-4 p-4 rounded-lg border border-white/5 bg-slate-800/20 hover:border-white/10 hover:bg-slate-800/40 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0 p-2 rounded-md bg-cyan-950/30 border border-cyan-500/20">
                        <Icon className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate group-hover:text-cyan-100 transition-colors">
                          {s.nombre}
                        </p>
                        <p className="text-xs text-slate-500">{meta.label}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
                        {loteCount}
                      </p>
                      <p className="text-xs text-slate-600">
                        {loteCount === 1 ? "lote" : "lotes"}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
