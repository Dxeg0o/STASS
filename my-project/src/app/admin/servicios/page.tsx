"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { motion } from "framer-motion";
import {
  Activity,
  Building2,
  CalendarClock,
  Cpu,
  Layers,
  Package,
  Search,
  Workflow,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

interface AdminServicioListItem {
  id: string;
  nombre: string;
  tipo: string;
  estado: string;
  usaCajas: boolean;
  fechaInicio: string | null;
  fechaFin: string | null;
  empresaId: string;
  empresaNombre: string;
  procesoId: string | null;
  procesoEstado: string | null;
  procesoTemporada: string | null;
  tipoProcesoNombre: string | null;
  productoNombre: string | null;
  ubicacionNombre: string | null;
  ubicacionTipo: string | null;
  loteCount: number;
  activeLoteCount: number;
  assignedDeviceCount: number;
  pendingDeviceCount: number;
  activeDeviceCount: number;
  activeCajaCount: number;
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

const TIPO_LABELS: Record<string, string> = {
  linea_conteo: "Línea de Conteo",
  maquina_plantacion: "Máquina de Plantación",
  estacion_calidad: "Estación de Calidad",
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

function getProcesoLabel(servicio: AdminServicioListItem) {
  const tipo = servicio.tipoProcesoNombre;
  const temporada = servicio.procesoTemporada;
  if (tipo && temporada) return `${tipo} ${temporada}`;
  return tipo ?? temporada ?? "Sin proceso";
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

export default function AdminServiciosPage() {
  const router = useRouter();
  const [servicios, setServicios] = useState<AdminServicioListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    axios
      .get<AdminServicioListItem[]>("/api/admin/servicios")
      .then((res) => setServicios(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return servicios;
    return servicios.filter((s) =>
      [
        s.nombre,
        s.empresaNombre,
        getProcesoLabel(s),
        TIPO_LABELS[s.tipo] ?? s.tipo,
        s.ubicacionNombre,
        s.estado,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [servicios, search]);

  const totals = useMemo(
    () => ({
      activos: servicios.filter((s) => s.estado === "en_curso").length,
      lotesActivos: servicios.reduce((sum, s) => sum + s.activeLoteCount, 0),
      dispositivos: servicios.reduce((sum, s) => sum + s.activeDeviceCount, 0),
      conteos: servicios.reduce((sum, s) => sum + s.totalCount, 0),
    }),
    [servicios]
  );

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Servicios
          </h1>
          <p className="mt-1 text-slate-400">
            Control global de servicios, lotes, dispositivos, cajas y conteos.
          </p>
        </div>
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar servicio, empresa, proceso..."
            className="pl-10 bg-slate-900/60 border-white/10 text-white placeholder:text-slate-600"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Activity className="h-5 w-5" />}
          label="Servicios activos"
          value={formatNumber(totals.activos)}
        />
        <StatCard
          icon={<Layers className="h-5 w-5" />}
          label="Lotes activos"
          value={formatNumber(totals.lotesActivos)}
        />
        <StatCard
          icon={<Cpu className="h-5 w-5" />}
          label="Dispositivos activos"
          value={formatNumber(totals.dispositivos)}
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
          <Workflow className="mx-auto mb-3 h-10 w-10 text-slate-700" />
          <p className="text-sm">No se encontraron servicios.</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="bg-slate-900/60 border-white/10">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-slate-400 uppercase text-xs">
                      Servicio
                    </TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">
                      Empresa / Proceso
                    </TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">
                      Estado
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
                    <TableHead className="text-slate-400 uppercase text-xs text-right">
                      Acceso
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => {
                    const state = ESTADO_CONFIG[s.estado] ?? ESTADO_CONFIG.planificado;
                    return (
                      <TableRow
                        key={s.id}
                        onClick={() => router.push(`/admin/servicios/${s.id}`)}
                        className="border-white/5 hover:bg-white/[0.03] cursor-pointer"
                      >
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-white">{s.nombre}</div>
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="outline" className="border-white/10 text-slate-300">
                                {TIPO_LABELS[s.tipo] ?? s.tipo}
                              </Badge>
                              {s.usaCajas && (
                                <Badge variant="outline" className="border-violet-500/30 text-violet-300">
                                  Cajas
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-slate-300">
                              <Building2 className="h-4 w-4 text-slate-500" />
                              {s.empresaNombre}
                            </div>
                            <div className="text-xs text-slate-500">
                              {getProcesoLabel(s)}
                            </div>
                            {s.ubicacionNombre && (
                              <div className="text-xs text-slate-600">
                                {s.ubicacionNombre}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${state.className}`}>
                            {state.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline" className="border-violet-500/30 text-violet-300">
                              {s.activeLoteCount}/{s.loteCount} lotes
                            </Badge>
                            <Badge variant="outline" className="border-amber-500/30 text-amber-400">
                              <Cpu className="mr-1 h-3 w-3" />
                              {s.activeDeviceCount}/{s.assignedDeviceCount}
                            </Badge>
                            {s.activeCajaCount > 0 && (
                              <Badge variant="outline" className="border-cyan-500/30 text-cyan-400">
                                {s.activeCajaCount} cajas
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-white">
                          {formatNumber(s.totalCount)}
                        </TableCell>
                        <TableCell className="text-xs text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <CalendarClock className="h-3.5 w-3.5 text-slate-600" />
                            {formatDate(s.lastCountAt, "Sin conteos")}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div
                            className="flex justify-end gap-2"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="border-white/10 text-slate-300 hover:text-white"
                            >
                              <Link href={`/admin/servicios/${s.id}`}>Detalle</Link>
                            </Button>
                            <Button
                              asChild
                              size="sm"
                              className="bg-amber-500 text-slate-950 hover:bg-amber-400"
                            >
                              <Link href={`/admin/empresas/${s.empresaId}/servicios/${s.id}`}>
                                Gestionar
                              </Link>
                            </Button>
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
