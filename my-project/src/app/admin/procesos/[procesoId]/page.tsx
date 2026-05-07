"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  CheckCircle2,
  Cpu,
  Layers,
  Package,
  PlayCircle,
  StopCircle,
  Workflow,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ProcesoDetailResponse {
  proceso: {
    id: string;
    empresaId: string;
    empresaNombre: string;
    tipoProcesoNombre: string;
    productoNombre: string | null;
    temporada: string | null;
    estado: string;
    fechaInicio: string | null;
    fechaFin: string | null;
    notas: string | null;
    createdAt: string | null;
  };
  summary: {
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
  };
  servicios: Array<{
    id: string;
    nombre: string;
    tipo: string;
    estado: string;
    usaCajas: boolean;
    fechaInicio: string | null;
    fechaFin: string | null;
    ubicacionNombre: string | null;
    ubicacionTipo: string | null;
    loteCount: number;
    activeLoteCount: number;
    pendingDeviceCount: number;
    activeDeviceCount: number;
    totalCount: number;
    lastCountAt: string | null;
  }>;
  lotes: Array<{
    loteId: string;
    codigoLote: string | null;
    servicioId: string;
    servicioNombre: string;
    asignadoAt: string | null;
    variedadNombre: string | null;
    subvariedadNombre: string | null;
    productoNombre: string | null;
    totalCount: number;
    lastCountAt: string | null;
    isActive: boolean;
  }>;
  activeSessions: Array<{
    sessionId: string;
    loteId: string;
    codigoLote: string | null;
    dispositivoId: string;
    dispositivoNombre: string;
    startTime: string | null;
  }>;
  deviceAssignments: Array<{
    id: string;
    servicioId: string;
    servicioNombre: string;
    dispositivoId: string;
    dispositivoNombre: string;
    dispositivoTipo: string;
    dispositivoActivo: boolean | null;
    maquina: string | null;
    asignadoAt: string | null;
    fechaInicio: string | null;
    fechaTermino: string | null;
  }>;
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

function getLoteLabel(lote: { loteId: string; codigoLote: string | null }) {
  return lote.codigoLote?.trim() || `Lote ${lote.loteId.slice(-8)}`;
}

function StatCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <Card className="bg-slate-900/60 border-white/10">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">
              {label}
            </p>
            <p className="mt-2 text-2xl font-bold text-white">{value}</p>
            {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
          </div>
          <div className="rounded-md border border-amber-500/20 bg-amber-500/10 p-2 text-amber-400">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminProcesoDetailPage() {
  const { procesoId } = useParams<{ procesoId: string }>();
  const router = useRouter();
  const [data, setData] = useState<ProcesoDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);

  const fetchDetail = async () => {
    try {
      const res = await axios.get<ProcesoDetailResponse>(
        `/api/admin/procesos/${procesoId}/detail`
      );
      setData(res.data);
    } catch (error) {
      console.error(error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [procesoId]);

  const handleEstado = async (estado: "en_curso" | "completado") => {
    setMutating(true);
    try {
      await axios.patch(`/api/procesos/${procesoId}`, {
        estado,
        ...(estado === "completado" ? { fechaFin: new Date().toISOString() } : {}),
      });
      await fetchDetail();
    } catch (error) {
      console.error(error);
    } finally {
      setMutating(false);
    }
  };

  const history = useMemo(() => {
    if (!data) return [];
    const events: Array<{ date: string | null; label: string; detail: string }> = [
      {
        date: data.proceso.createdAt,
        label: "Proceso creado",
        detail: data.proceso.tipoProcesoNombre,
      },
      {
        date: data.proceso.fechaInicio,
        label: "Proceso iniciado",
        detail: data.proceso.empresaNombre,
      },
      {
        date: data.proceso.fechaFin,
        label: "Proceso cerrado",
        detail: data.proceso.estado,
      },
    ];
    data.servicios.forEach((servicio) => {
      events.push({
        date: servicio.fechaInicio,
        label: "Servicio iniciado",
        detail: servicio.nombre,
      });
      events.push({
        date: servicio.fechaFin,
        label: "Servicio cerrado",
        detail: servicio.nombre,
      });
    });
    data.deviceAssignments.forEach((assignment) => {
      events.push({
        date: assignment.asignadoAt,
        label: "Dispositivo asignado",
        detail: `${assignment.dispositivoNombre} · ${assignment.servicioNombre}`,
      });
      events.push({
        date: assignment.fechaTermino,
        label: "Dispositivo desasignado",
        detail: `${assignment.dispositivoNombre} · ${assignment.servicioNombre}`,
      });
    });
    return events
      .filter((event) => event.date)
      .sort(
        (a, b) =>
          new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime()
      );
  }, [data]);

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <div className="h-10 w-56 rounded-md bg-slate-800 animate-pulse" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 rounded-md bg-slate-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <Button
          variant="outline"
          onClick={() => router.push("/admin/procesos")}
          className="border-white/10 text-slate-300 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a procesos
        </Button>
        <div className="rounded-md border border-white/10 bg-slate-900/60 p-10 text-center text-slate-500">
          Proceso no encontrado.
        </div>
      </div>
    );
  }

  const { proceso, summary } = data;
  const state = ESTADO_CONFIG[proceso.estado] ?? ESTADO_CONFIG.planificado;
  const canStart = proceso.estado === "planificado";
  const canComplete = proceso.estado === "en_curso";

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-4">
        <Button
          variant="outline"
          onClick={() => router.push("/admin/procesos")}
          className="w-fit border-white/10 text-slate-300 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a procesos
        </Button>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-white">
                {proceso.tipoProcesoNombre}
                {proceso.temporada && (
                  <span className="font-normal text-slate-400">
                    {" "}
                    · {proceso.temporada}
                  </span>
                )}
              </h1>
              <Badge variant="outline" className={state.className}>
                {state.label}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-400">
              <Link
                href={`/admin/empresas/${proceso.empresaId}`}
                className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300"
              >
                <Building2 className="h-4 w-4" />
                {proceso.empresaNombre}
              </Link>
              <span>{proceso.productoNombre ?? "Sin producto"}</span>
              <span>Inicio: {formatDate(proceso.fechaInicio, "Pendiente")}</span>
              <span>Fin: {formatDate(proceso.fechaFin, "Sin cierre")}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {canStart && (
              <Button
                onClick={() => handleEstado("en_curso")}
                disabled={mutating}
                className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Iniciar proceso
              </Button>
            )}
            {canComplete && (
              <Button
                onClick={() => handleEstado("completado")}
                disabled={mutating}
                className="bg-red-600 text-white hover:bg-red-500"
              >
                <StopCircle className="h-4 w-4 mr-2" />
                Completar proceso
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          icon={<Workflow className="h-5 w-5" />}
          label="Servicios"
          value={formatNumber(summary.servicioCount)}
          detail={`${summary.serviciosEnCurso} en curso`}
        />
        <StatCard
          icon={<Layers className="h-5 w-5" />}
          label="Lotes"
          value={formatNumber(summary.loteCount)}
          detail={`${summary.activeLoteCount} activos`}
        />
        <StatCard
          icon={<Cpu className="h-5 w-5" />}
          label="Dispositivos"
          value={formatNumber(summary.activeDeviceCount)}
          detail={`${summary.pendingDeviceCount} pendientes`}
        />
        <StatCard
          icon={<Package className="h-5 w-5" />}
          label="Conteos"
          value={formatNumber(summary.totalCount)}
        />
        <StatCard
          icon={<CalendarClock className="h-5 w-5" />}
          label="Último conteo"
          value={formatDate(summary.lastCountAt, "Sin datos")}
        />
      </div>

      <Tabs defaultValue="resumen">
        <TabsList className="bg-slate-800/50 border border-white/10">
          <TabsTrigger value="resumen" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
            Resumen
          </TabsTrigger>
          <TabsTrigger value="servicios" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
            Servicios
          </TabsTrigger>
          <TabsTrigger value="activos" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
            Lotes activos
          </TabsTrigger>
          <TabsTrigger value="conteos" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
            Conteos
          </TabsTrigger>
          <TabsTrigger value="historial" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="mt-4 space-y-4">
          <Card className="bg-slate-900/60 border-white/10">
            <CardHeader>
              <CardTitle className="text-lg text-white">Información del proceso</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="rounded-md border border-white/10 bg-slate-950/30 p-4">
                <p className="text-xs uppercase text-slate-500">Producto</p>
                <p className="mt-2 text-white">{proceso.productoNombre ?? "Sin producto"}</p>
              </div>
              <div className="rounded-md border border-white/10 bg-slate-950/30 p-4">
                <p className="text-xs uppercase text-slate-500">Notas</p>
                <p className="mt-2 text-sm text-slate-300">{proceso.notas ?? "Sin notas registradas"}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="servicios" className="mt-4">
          <Card className="bg-slate-900/60 border-white/10">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-slate-400 uppercase text-xs">Servicio</TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">Estado</TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">Lotes</TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">Dispositivos</TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs text-right">Conteos</TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.servicios.map((servicio) => {
                    const servicioState = ESTADO_CONFIG[servicio.estado] ?? ESTADO_CONFIG.planificado;
                    return (
                      <TableRow key={servicio.id} className="border-white/5 hover:bg-white/[0.02]">
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-white">{servicio.nombre}</div>
                            <div className="text-xs text-slate-500">
                              {TIPO_LABELS[servicio.tipo] ?? servicio.tipo}
                              {servicio.ubicacionNombre ? ` · ${servicio.ubicacionNombre}` : ""}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={servicioState.className}>
                            {servicioState.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {servicio.activeLoteCount}/{servicio.loteCount}
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {servicio.activeDeviceCount}
                          {servicio.pendingDeviceCount > 0 && (
                            <span className="text-slate-500"> · {servicio.pendingDeviceCount} pend.</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-white">
                          {formatNumber(servicio.totalCount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="border-white/10 text-slate-300 hover:text-white"
                          >
                            <Link href={`/admin/servicios/${servicio.id}`}>Ver</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activos" className="mt-4">
          <Card className="bg-slate-900/60 border-white/10">
            <CardContent className="p-0">
              {data.activeSessions.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  No hay lotes activos en este proceso.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-slate-400 uppercase text-xs">Lote</TableHead>
                      <TableHead className="text-slate-400 uppercase text-xs">Dispositivo</TableHead>
                      <TableHead className="text-slate-400 uppercase text-xs">Inicio sesión</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.activeSessions.map((session) => (
                      <TableRow key={session.sessionId} className="border-white/5 hover:bg-white/[0.02]">
                        <TableCell className="font-medium text-white">
                          {getLoteLabel(session)}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/admin/dispositivos/${session.dispositivoId}`}
                            className="text-amber-400 hover:text-amber-300"
                          >
                            {session.dispositivoNombre}
                          </Link>
                        </TableCell>
                        <TableCell className="text-slate-400">
                          {formatDate(session.startTime)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conteos" className="mt-4">
          <Card className="bg-slate-900/60 border-white/10">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-slate-400 uppercase text-xs">Servicio</TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">Último conteo</TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.servicios.map((servicio) => (
                    <TableRow key={servicio.id} className="border-white/5 hover:bg-white/[0.02]">
                      <TableCell className="font-medium text-white">{servicio.nombre}</TableCell>
                      <TableCell className="text-slate-400">{formatDate(servicio.lastCountAt, "Sin conteos")}</TableCell>
                      <TableCell className="text-right font-semibold text-white">{formatNumber(servicio.totalCount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historial" className="mt-4">
          <Card className="bg-slate-900/60 border-white/10">
            <CardContent className="p-0">
              {history.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  No hay eventos registrados.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-slate-400 uppercase text-xs">Evento</TableHead>
                      <TableHead className="text-slate-400 uppercase text-xs">Detalle</TableHead>
                      <TableHead className="text-slate-400 uppercase text-xs">Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((event, index) => (
                      <TableRow key={`${event.label}-${index}`} className="border-white/5 hover:bg-white/[0.02]">
                        <TableCell>
                          <div className="flex items-center gap-2 text-white">
                            <CheckCircle2 className="h-4 w-4 text-amber-400" />
                            {event.label}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-400">{event.detail}</TableCell>
                        <TableCell className="text-slate-400">{formatDate(event.date)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
