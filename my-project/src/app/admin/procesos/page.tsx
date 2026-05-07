"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { motion } from "framer-motion";
import {
  Activity,
  Building2,
  CalendarClock,
  ClipboardList,
  Cpu,
  Layers,
  Package,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AdminProcesoListItem {
  id: string;
  empresaId: string;
  empresaNombre: string;
  tipoProcesoNombre: string;
  productoNombre: string | null;
  temporada: string | null;
  estado: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  servicioCount: number;
  serviciosPlanificados: number;
  serviciosEnCurso: number;
  serviciosCompletados: number;
  serviciosCancelados: number;
  loteCount: number;
  activeLoteCount: number;
  pendingDeviceCount: number;
  activeDeviceCount: number;
  totalCount: number;
  lastCountAt: string | null;
}

const ESTADO_CONFIG: Record<string, { label: string; className: string }> = {
  planificado: {
    label: "Planificado",
    className: "border-slate-500/30 bg-slate-950/30 text-slate-300",
  },
  en_curso: {
    label: "En curso",
    className: "border-emerald-500/30 bg-emerald-950/30 text-emerald-400",
  },
  completado: {
    label: "Completado",
    className: "border-cyan-500/30 bg-cyan-950/30 text-cyan-400",
  },
  cancelado: {
    label: "Cancelado",
    className: "border-red-500/30 bg-red-950/30 text-red-400",
  },
};

function formatNumber(value: number) {
  return value.toLocaleString("es-CL");
}

function formatDate(value: string | null | undefined, fallback = "-") {
  if (!value) return fallback;
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="bg-slate-900/60 border-white/10">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">
              {label}
            </p>
            <p className="mt-2 text-2xl font-bold text-white">{value}</p>
          </div>
          <div className="rounded-md border border-amber-500/20 bg-amber-500/10 p-2 text-amber-400">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminProcesosPage() {
  const router = useRouter();
  const [procesos, setProcesos] = useState<AdminProcesoListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    axios
      .get<AdminProcesoListItem[]>("/api/admin/procesos")
      .then((res) => setProcesos(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return procesos;
    return procesos.filter((p) =>
      [
        p.empresaNombre,
        p.tipoProcesoNombre,
        p.productoNombre,
        p.temporada,
        p.estado,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [procesos, search]);

  const totals = useMemo(
    () => ({
      activos: procesos.filter((p) => p.estado === "en_curso").length,
      servicios: procesos.reduce((sum, p) => sum + p.servicioCount, 0),
      lotesActivos: procesos.reduce((sum, p) => sum + p.activeLoteCount, 0),
      conteos: procesos.reduce((sum, p) => sum + p.totalCount, 0),
    }),
    [procesos]
  );

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Procesos
          </h1>
          <p className="mt-1 text-slate-400">
            Vista global de procesos, servicios, activos y actividad operacional.
          </p>
        </div>
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por empresa, tipo, producto..."
            className="pl-10 bg-slate-900/60 border-white/10 text-white placeholder:text-slate-600"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Activity className="h-5 w-5" />}
          label="Procesos activos"
          value={formatNumber(totals.activos)}
        />
        <StatCard
          icon={<ClipboardList className="h-5 w-5" />}
          label="Servicios"
          value={formatNumber(totals.servicios)}
        />
        <StatCard
          icon={<Layers className="h-5 w-5" />}
          label="Lotes activos"
          value={formatNumber(totals.lotesActivos)}
        />
        <StatCard
          icon={<Package className="h-5 w-5" />}
          label="Conteos"
          value={formatNumber(totals.conteos)}
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-16 rounded-md bg-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-md border border-white/10 bg-slate-900/60 py-16 text-center text-slate-500">
          <ClipboardList className="mx-auto mb-3 h-10 w-10 text-slate-700" />
          <p className="text-sm">No se encontraron procesos.</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="bg-slate-900/60 border-white/10">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-slate-400 uppercase text-xs">
                      Proceso
                    </TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">
                      Empresa
                    </TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">
                      Estado
                    </TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">
                      Servicios
                    </TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">
                      Activos
                    </TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs text-right">
                      Conteos
                    </TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">
                      Último mov.
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => {
                    const state = ESTADO_CONFIG[p.estado] ?? ESTADO_CONFIG.planificado;
                    return (
                      <TableRow
                        key={p.id}
                        onClick={() => router.push(`/admin/procesos/${p.id}`)}
                        className="border-white/5 hover:bg-white/[0.03] cursor-pointer"
                      >
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-white">
                              {p.tipoProcesoNombre}
                              {p.temporada && (
                                <span className="font-normal text-slate-400">
                                  {" "}
                                  · {p.temporada}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500">
                              {p.productoNombre ?? "Sin producto"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-slate-300">
                            <Building2 className="h-4 w-4 text-slate-500" />
                            {p.empresaNombre}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${state.className}`}>
                            {state.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {p.serviciosPlanificados > 0 && (
                              <Badge variant="outline" className="border-slate-500/30 text-slate-300">
                                {p.serviciosPlanificados} plan.
                              </Badge>
                            )}
                            {p.serviciosEnCurso > 0 && (
                              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                                {p.serviciosEnCurso} curso
                              </Badge>
                            )}
                            {p.serviciosCompletados > 0 && (
                              <Badge variant="outline" className="border-cyan-500/30 text-cyan-400">
                                {p.serviciosCompletados} comp.
                              </Badge>
                            )}
                            {p.servicioCount === 0 && (
                              <span className="text-xs text-slate-600">Sin servicios</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1 text-xs">
                            <Badge variant="outline" className="border-violet-500/30 text-violet-300">
                              {p.activeLoteCount}/{p.loteCount} lotes
                            </Badge>
                            <Badge variant="outline" className="border-amber-500/30 text-amber-400">
                              <Cpu className="mr-1 h-3 w-3" />
                              {p.activeDeviceCount}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-white">
                          {formatNumber(p.totalCount)}
                        </TableCell>
                        <TableCell className="text-xs text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <CalendarClock className="h-3.5 w-3.5 text-slate-600" />
                            {formatDate(p.lastCountAt, "Sin conteos")}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
