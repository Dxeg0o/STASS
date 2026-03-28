"use client";

import React, { useContext, useEffect, useState } from "react";
import { AuthenticationContext } from "@/app/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Activity, Clock } from "lucide-react";

// ---------- Types ----------

interface ActiveSession {
  loteId: string;
  servicioNombre: string;
  dispositivoNombre: string;
  startTime: string;
  variedadNombre: string | null;
  productoNombre: string | null;
}

interface RecentLote {
  loteId: string;
  servicioId: string;
  servicioNombre: string;
  totalCount: number;
  lastTs: string | null;
}

interface OverviewData {
  empresa: { nombre: string; pais: string };
  serviceTypeSummary: {
    tipo: string;
    count: number;
    totalBulbs: number;
    lastActivity: string | null;
  }[];
  activeSessions: ActiveSession[];
  recentLotes: RecentLote[];
  procesosActivos: {
    id: string;
    temporada: string | null;
    tipoProcesoNombre: string | null;
    productoNombre: string | null;
    servicioCount: number;
  }[];
}

// ---------- Helpers ----------

function formatNumber(n: number): string {
  return n.toLocaleString("es-CL");
}

function getRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function formatTimestamp(isoString: string | null): string {
  if (!isoString) return "\u2014";
  return new Date(isoString).toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------- Active Lote Card ----------

function ActiveLoteCard({ session }: { session: ActiveSession }) {
  const [elapsed, setElapsed] = useState(() =>
    getRelativeTime(session.startTime)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(getRelativeTime(session.startTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [session.startTime]);

  return (
    <Link href={`/app/lotes/${session.loteId}`}>
      <div className="flex-shrink-0 w-[260px] p-4 rounded-xl bg-slate-900/40 border border-white/5 hover:border-emerald-500/30 hover:bg-slate-900/70 transition-all duration-200 cursor-pointer group">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-sm font-mono font-semibold text-white group-hover:text-emerald-100 transition-colors">
              {session.loteId.slice(-8)}
            </span>
          </div>
          <span className="text-xs font-mono text-emerald-400">{elapsed}</span>
        </div>
        {session.variedadNombre && (
          <p className="text-xs text-cyan-400 mb-1">{session.variedadNombre}</p>
        )}
        <p className="text-xs text-slate-400 truncate">
          {session.servicioNombre}
        </p>
        <p className="text-xs text-slate-600 truncate">
          {session.dispositivoNombre}
        </p>
      </div>
    </Link>
  );
}

// ---------- Main Page ----------

export default function OverviewPage() {
  const { data, loading: authLoading } = useContext(AuthenticationContext);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!data?.empresaId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/dashboard/overview?empresaId=${data.empresaId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar el resumen");
        return res.json();
      })
      .then((d: OverviewData) => setOverview(d))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [data?.empresaId]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400 text-sm animate-pulse">Cargando...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400 text-sm">No estas autenticado.</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Hola, {data.name}
        </h1>
        <p className="text-slate-400 mt-1">
          {overview?.empresa.nombre ?? data.empresaNombre ?? ""}
        </p>
      </div>

      {loading && (
        <div className="text-slate-500 text-sm animate-pulse py-4">
          Cargando datos...
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-950/20 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {overview && (
        <>
          {/* Active Lotes Strip */}
          {overview.activeSessions.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-base font-semibold text-slate-200">
                  Lotes Activos
                </h2>
                <span className="text-xs bg-emerald-950/60 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  {overview.activeSessions.length}
                </span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                {overview.activeSessions.map((session, idx) => (
                  <ActiveLoteCard key={idx} session={session} />
                ))}
              </div>
            </section>
          )}

          {/* Quick Stats Row */}
          {overview.serviceTypeSummary.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-slate-200 mb-4">
                Resumen
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Total bulbs */}
                <Card className="bg-slate-900/40 border-white/10">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500 mb-1">
                      Bulbos totales
                    </p>
                    <p className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
                      {formatNumber(
                        overview.serviceTypeSummary.reduce(
                          (sum, s) => sum + s.totalBulbs,
                          0
                        )
                      )}
                    </p>
                  </CardContent>
                </Card>
                {/* Active processes */}
                <Card className="bg-slate-900/40 border-white/10">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500 mb-1">
                      Procesos en curso
                    </p>
                    <p className="text-xl font-bold text-cyan-400">
                      {overview.procesosActivos.length}
                    </p>
                  </CardContent>
                </Card>
                {/* Services */}
                <Card className="bg-slate-900/40 border-white/10">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500 mb-1">Servicios</p>
                    <p className="text-xl font-bold text-slate-200">
                      {overview.serviceTypeSummary.reduce(
                        (sum, s) => sum + s.count,
                        0
                      )}
                    </p>
                  </CardContent>
                </Card>
                {/* Active sessions */}
                <Card className="bg-slate-900/40 border-white/10">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500 mb-1">
                      Sesiones activas
                    </p>
                    <p className="text-xl font-bold text-emerald-400">
                      {overview.activeSessions.length}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>
          )}

          {/* Procesos en Curso */}
          {overview.procesosActivos.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-slate-200 mb-4">
                Procesos en Curso
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {overview.procesosActivos.map((p) => (
                  <Link key={p.id} href={`/app/procesos/${p.id}`}>
                    <Card className="bg-slate-900/40 border-white/10 hover:border-cyan-500/40 hover:bg-slate-900/70 transition-all duration-200 cursor-pointer group">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-md bg-cyan-950/30 border border-cyan-500/20 group-hover:bg-cyan-950/50 transition-colors shrink-0">
                            <Activity className="w-4 h-4 text-cyan-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-white truncate group-hover:text-cyan-100 transition-colors">
                              {p.tipoProcesoNombre ?? "Proceso"}
                              {p.temporada && (
                                <span className="text-slate-400 font-normal">
                                  {" "}
                                  · {p.temporada}
                                </span>
                              )}
                            </p>
                            {p.productoNombre && (
                              <p className="text-xs text-slate-500 truncate">
                                {p.productoNombre}
                              </p>
                            )}
                            <p className="text-xs text-slate-600 mt-1">
                              {p.servicioCount}{" "}
                              {p.servicioCount === 1 ? "servicio" : "servicios"}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Recent Activity */}
          {overview.recentLotes.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-slate-200 mb-4">
                Actividad Reciente
              </h2>
              <Card className="bg-slate-900/40 border-white/10">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Lote
                          </th>
                          <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                            Servicio
                          </th>
                          <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Conteo
                          </th>
                          <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">
                            Ultima actividad
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {overview.recentLotes.map((lote) => (
                          <tr
                            key={lote.loteId}
                            className="hover:bg-white/[0.02] transition-colors"
                          >
                            <td className="px-5 py-3">
                              <Link
                                href={`/app/lotes/${lote.loteId}`}
                                className="text-slate-200 hover:text-cyan-400 transition-colors font-medium font-mono text-xs"
                              >
                                {lote.loteId.slice(-8)}
                              </Link>
                            </td>
                            <td className="px-5 py-3 text-slate-400 hidden sm:table-cell">
                              {lote.servicioNombre}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 font-semibold">
                                {formatNumber(lote.totalCount)}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right text-slate-500 hidden md:table-cell">
                              {formatTimestamp(lote.lastTs)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Empty state */}
          {overview.serviceTypeSummary.length === 0 &&
            overview.activeSessions.length === 0 &&
            overview.recentLotes.length === 0 && (
              <div className="text-center py-20 text-slate-500">
                <p className="text-lg">No hay datos disponibles aun.</p>
                <p className="text-sm mt-2">
                  Los datos apareceran aqui cuando haya actividad registrada.
                </p>
              </div>
            )}
        </>
      )}
    </div>
  );
}
