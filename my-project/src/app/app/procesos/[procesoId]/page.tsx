"use client";

import React, { useContext, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AuthenticationContext } from "@/app/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Link from "next/link";
import {
  ScanLine,
  Sprout,
  ShieldCheck,
  Activity,
  Calendar,
  ArrowLeft,
  ChevronDown,
  Package,
  Cpu,
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

interface ProcesoBasic {
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
  servicios: { id: string }[];
}

interface LoteInfo {
  loteId: string;
  variedadNombre: string | null;
  productoNombre: string | null;
  asignadoAt: string;
  createdAt: string;
  totalCount: number;
  lastTs: string | null;
  isActive: boolean;
}

interface ServicioDetail {
  id: string;
  nombre: string;
  tipo: string;
  usaCajas: boolean;
  estado: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  deviceCount: number;
  totalCount: number;
  loteCount: number;
  lotesEnProceso: LoteInfo[];
  lotesOtros: LoteInfo[];
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

const NEXT_ESTADOS: Record<string, string[]> = {
  planificado: ["planificado", "en_curso", "cancelado"],
  en_curso: ["en_curso", "completado", "cancelado"],
  completado: ["completado"],
  cancelado: ["cancelado"],
};

const SERVICIO_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  linea_conteo: { label: "Linea de Conteo", icon: ScanLine },
  maquina_plantacion: { label: "Maquina de Plantacion", icon: Sprout },
  estacion_calidad: { label: "Estacion de Calidad", icon: ShieldCheck },
};

function formatDate(iso: string | null): string {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatNumber(n: number): string {
  return n.toLocaleString("es-CL");
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------- Lote Row Component ----------

function LoteRow({ lote }: { lote: LoteInfo }) {
  return (
    <Link
      href={`/app/lotes/${lote.loteId}`}
      className="flex items-center justify-between gap-4 px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors group"
    >
      <div className="flex items-center gap-3 min-w-0">
        {lote.isActive && (
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm font-mono text-slate-200 group-hover:text-cyan-400 transition-colors">
            {lote.loteId.slice(-8)}
          </p>
          {lote.variedadNombre && (
            <p className="text-xs text-slate-500 truncate">
              {lote.variedadNombre}
              {lote.productoNombre && ` - ${lote.productoNombre}`}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <span className="text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
          {formatNumber(lote.totalCount)}
        </span>
        <span className="text-xs text-slate-600 hidden sm:block">
          {formatTimestamp(lote.lastTs)}
        </span>
      </div>
    </Link>
  );
}

// ---------- Main Page ----------

export default function ProcesoDetailPage() {
  const params = useParams();
  const procesoId = params.procesoId as string;

  const { data: authData } = useContext(AuthenticationContext);
  const isAdmin = authData?.rol_usuario === "administrador";

  const [proceso, setProceso] = useState<ProcesoBasic | null>(null);
  const [servicios, setServicios] = useState<ServicioDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviciosLoading, setServiciosLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingEstado, setSavingEstado] = useState(false);

  // Fetch proceso basic info
  useEffect(() => {
    if (!procesoId) return;
    setLoading(true);
    fetch(`/api/procesos/${procesoId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Proceso no encontrado");
        return res.json();
      })
      .then((d: ProcesoBasic) => setProceso(d))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [procesoId]);

  // Fetch servicios detail
  useEffect(() => {
    if (!procesoId) return;
    setServiciosLoading(true);
    fetch(`/api/procesos/${procesoId}/servicios-detail`)
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar servicios");
        return res.json();
      })
      .then((d: ServicioDetail[]) => setServicios(d))
      .catch(console.error)
      .finally(() => setServiciosLoading(false));
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
      const updated = await res.json();
      setProceso((prev) => (prev ? { ...prev, ...updated } : prev));
    } catch (err) {
      console.error(err);
    } finally {
      setSavingEstado(false);
    }
  };

  // Default open: servicios with active lotes
  const defaultOpenServiceIds = servicios
    .filter((s) => s.lotesEnProceso.length > 0)
    .map((s) => s.id);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400 text-sm animate-pulse">Cargando...</div>
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
                    {" "}
                    · {proceso.temporada}
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
                      disabled={savingEstado || proceso.estado === "completado" || proceso.estado === "cancelado"}
                      className="appearance-none pl-3 pr-7 py-1 rounded-md text-xs bg-slate-800/60 text-slate-400 border border-white/10 hover:border-white/20 focus:outline-none focus:border-cyan-500/40 cursor-pointer disabled:opacity-50"
                    >
                      {(NEXT_ESTADOS[proceso.estado] ?? ESTADOS).map((e) => (
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

      {/* Servicios accordion */}
      <div>
        <h2 className="text-base font-semibold text-white mb-3">
          Servicios
          <span className="ml-2 text-sm font-normal text-slate-500">
            ({servicios.length})
          </span>
        </h2>

        {serviciosLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-xl bg-slate-900/40 border border-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : servicios.length === 0 ? (
          <Card className="bg-slate-900/40 border-white/10">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-slate-500">
                No hay servicios vinculados a este proceso.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Accordion
            type="multiple"
            defaultValue={defaultOpenServiceIds}
            className="space-y-3"
          >
            {servicios.map((s) => {
              const meta = SERVICIO_META[s.tipo] ?? {
                label: s.tipo,
                icon: Activity,
              };
              const Icon = meta.icon;
              const hasActive = s.lotesEnProceso.length > 0;

              return (
                <AccordionItem
                  key={s.id}
                  value={s.id}
                  className="border border-white/10 rounded-xl bg-slate-900/30 overflow-hidden"
                >
                  <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-2 rounded-lg bg-cyan-950/40 border border-cyan-500/20 shrink-0">
                        <Icon className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-white truncate">
                            {s.nombre}
                          </h3>
                          {hasActive && (
                            <span className="relative flex h-2 w-2 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                            </span>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${ESTADO_CONFIG[s.estado]?.className ?? ESTADO_CONFIG.planificado.className}`}
                          >
                            {ESTADO_CONFIG[s.estado]?.label ?? s.estado}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500">{meta.label}</p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 text-right">
                        <div>
                          <p className="text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
                            {formatNumber(s.totalCount)}
                          </p>
                          <p className="text-xs text-slate-600">bulbos</p>
                        </div>
                        <div className="hidden sm:block">
                          <p className="text-sm text-slate-300">
                            {s.loteCount}
                          </p>
                          <p className="text-xs text-slate-600">lotes</p>
                        </div>
                        <div className="hidden sm:flex items-center gap-1 text-xs text-slate-500">
                          <Cpu className="w-3 h-3" />
                          {s.deviceCount}
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="px-5 pb-5">
                    <div className="space-y-4 pt-2">
                      {/* Lotes en proceso */}
                      {s.lotesEnProceso.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                            </span>
                            En proceso ({s.lotesEnProceso.length})
                          </h4>
                          <div className="space-y-1 bg-emerald-950/10 border border-emerald-500/10 rounded-lg p-1">
                            {s.lotesEnProceso.map((l) => (
                              <LoteRow key={l.loteId} lote={l} />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Otros lotes */}
                      {s.lotesOtros.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                            {s.lotesEnProceso.length > 0
                              ? "Completados / Pendientes"
                              : "Lotes"}{" "}
                            ({s.lotesOtros.length})
                          </h4>
                          <div className="space-y-1">
                            {s.lotesOtros.map((l) => (
                              <LoteRow key={l.loteId} lote={l} />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* No lotes */}
                      {s.loteCount === 0 && (
                        <p className="text-sm text-slate-500 py-2">
                          No hay lotes asignados a este servicio.
                        </p>
                      )}

                      {/* Cajas indicator */}
                      {s.usaCajas && (
                        <div className="pt-2 border-t border-white/5">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Package className="w-3 h-3" />
                            <span>
                              Este servicio utiliza cajas para el procesamiento
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>
    </div>
  );
}
