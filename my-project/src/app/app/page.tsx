"use client";

import React, { useContext, useEffect, useState } from "react";
import { AuthenticationContext } from "@/app/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { ScanLine, Sprout, ShieldCheck, Activity, Clock } from "lucide-react";

// ---------- Types ----------

interface ServiceTypeSummary {
  tipo: string;
  count: number;
  totalBulbs: number;
  lastActivity: string | null;
}

interface ActiveSession {
  loteNombre: string;
  servicioNombre: string;
  servicioId: string;
  dispositivoNombre: string;
  startTime: string;
}

interface RecentLote {
  loteId: string;
  loteNombre: string;
  servicioId: string;
  servicioNombre: string;
  totalCount: number;
  lastTs: string | null;
}

interface OverviewData {
  empresa: { nombre: string; pais: string };
  serviceTypeSummary: ServiceTypeSummary[];
  activeSessions: ActiveSession[];
  recentLotes: RecentLote[];
}

// ---------- Helpers ----------

const SERVICE_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  linea_conteo: { label: "Líneas de Conteo", icon: ScanLine },
  maquina_plantacion: { label: "Máquinas de Plantación", icon: Sprout },
  estacion_calidad: { label: "Estaciones de Calidad", icon: ShieldCheck },
};

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
  if (!isoString) return "—";
  return new Date(isoString).toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------- Sub-components ----------

function ServiceTypeCard({ summary }: { summary: ServiceTypeSummary }) {
  const meta = SERVICE_META[summary.tipo] ?? {
    label: summary.tipo,
    icon: Activity,
  };
  const Icon = meta.icon;

  return (
    <Link href={`/app/servicios?tipo=${summary.tipo}`}>
      <Card className="bg-slate-900/40 border-white/10 hover:border-cyan-500/40 hover:bg-slate-900/70 transition-all duration-200 cursor-pointer group">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/20 group-hover:bg-cyan-950/60 transition-colors">
              <Icon className="w-5 h-5 text-cyan-400" />
            </div>
            <span className="text-xs text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded-full border border-white/5">
              {summary.count} {summary.count === 1 ? "servicio" : "servicios"}
            </span>
          </div>

          <h3 className="text-sm font-medium text-slate-300 mb-3">
            {meta.label}
          </h3>

          <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 mb-1">
            {formatNumber(summary.totalBulbs)}
          </p>
          <p className="text-xs text-slate-500 mb-3">bulbos totales</p>

          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="w-3 h-3" />
            <span>{summary.lastActivity ? formatTimestamp(summary.lastActivity) : "Sin actividad"}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function ActiveSessionCard({ session }: { session: ActiveSession }) {
  const [elapsed, setElapsed] = useState(() => getRelativeTime(session.startTime));

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(getRelativeTime(session.startTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [session.startTime]);

  return (
    <Link href={`/app/servicios/${session.servicioId}/lotes`}>
      <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-900/40 border border-white/5 hover:border-cyan-500/20 hover:bg-slate-900/70 transition-all duration-200 cursor-pointer group">
        <div className="flex-shrink-0">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{session.loteNombre}</p>
          <p className="text-xs text-slate-400 truncate">{session.servicioNombre}</p>
          <p className="text-xs text-slate-500 truncate">{session.dispositivoNombre}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="text-xs font-mono text-cyan-400">{elapsed}</p>
          <p className="text-xs text-slate-600">transcurrido</p>
        </div>
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
          Cargando datos…
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-950/20 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {overview && (
        <>
          {/* Service Type Cards */}
          {overview.serviceTypeSummary.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-slate-200 mb-4">
                Tipos de Servicio
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {overview.serviceTypeSummary.map((s) => (
                  <ServiceTypeCard key={s.tipo} summary={s} />
                ))}
              </div>
            </section>
          )}

          {/* Active Sessions */}
          {overview.activeSessions.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-base font-semibold text-slate-200">
                  Sesiones Activas
                </h2>
                <span className="text-xs bg-emerald-950/60 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  {overview.activeSessions.length} activa
                  {overview.activeSessions.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-2">
                {overview.activeSessions.map((session, idx) => (
                  <ActiveSessionCard key={idx} session={session} />
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
                            Última actividad
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {overview.recentLotes.map((lote) => (
                          <tr
                            key={lote.loteId}
                            className="hover:bg-white/2 transition-colors"
                          >
                            <td className="px-5 py-3">
                              <Link
                                href={`/app/servicios/${lote.servicioId}/lotes/${lote.loteId}`}
                                className="text-slate-200 hover:text-cyan-400 transition-colors font-medium"
                              >
                                {lote.loteNombre}
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

          {overview.serviceTypeSummary.length === 0 &&
            overview.activeSessions.length === 0 &&
            overview.recentLotes.length === 0 && (
              <div className="text-center py-20 text-slate-500">
                <p className="text-lg">No hay datos disponibles aún.</p>
                <p className="text-sm mt-2">
                  Los datos aparecerán aquí cuando haya actividad registrada.
                </p>
              </div>
            )}
        </>
      )}
    </div>
  );
}
