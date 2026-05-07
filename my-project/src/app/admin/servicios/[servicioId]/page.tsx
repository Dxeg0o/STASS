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
  MapPin,
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

interface ServicioDetailResponse {
  servicio: {
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
    ubicacionId: string | null;
    ubicacionNombre: string | null;
    ubicacionTipo: string | null;
  };
  summary: {
    loteCount: number;
    activeLoteCount: number;
    totalCount: number;
    lastCountAt: string | null;
    assignedDeviceCount: number;
    pendingDeviceCount: number;
    activeDeviceCount: number;
    activeCajaCount: number;
  };
  lotes: Array<{
    loteId: string;
    codigoLote: string | null;
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
    dispositivoId: string;
    dispositivoNombre: string;
    dispositivoTipo: string;
    dispositivoActivo: boolean | null;
    maquina: string | null;
    asignadoAt: string | null;
    fechaInicio: string | null;
    fechaTermino: string | null;
  }>;
  activeCajas: Array<{
    id: string;
    cajaId: string;
    codigo: string;
    loteSessionId: string;
    loteId: string;
    codigoLote: string | null;
    asignadoAt: string | null;
    totalCount: number;
    lastCountAt: string | null;
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

function getProcesoLabel(servicio: ServicioDetailResponse["servicio"]) {
  const tipo = servicio.tipoProcesoNombre;
  const temporada = servicio.procesoTemporada;
  if (tipo && temporada) return `${tipo} ${temporada}`;
  return tipo ?? temporada ?? "Sin proceso";
}

function getAssignmentState(assignment: ServicioDetailResponse["deviceAssignments"][number]) {
  if (assignment.fechaTermino) {
    return {
      label: "Cerrado",
      className: "border-slate-500/30 bg-slate-950/30 text-slate-300",
    };
  }
  if (assignment.fechaInicio) {
    return {
      label: "Activo",
      className: "border-emerald-500/30 bg-emerald-950/30 text-emerald-400",
    };
  }
  return {
    label: "Pendiente",
    className: "border-amber-500/30 bg-amber-950/30 text-amber-400",
  };
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

export default function AdminServicioDetailPage() {
  const { servicioId } = useParams<{ servicioId: string }>();
  const router = useRouter();
  const [data, setData] = useState<ServicioDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);

  const fetchDetail = async () => {
    try {
      const res = await axios.get<ServicioDetailResponse>(
        `/api/admin/servicios/${servicioId}/detail`
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
  }, [servicioId]);

  const handleEstado = async (estado: "en_curso" | "completado") => {
    setMutating(true);
    try {
      await axios.patch(`/api/admin/servicios/${servicioId}`, {
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
        date: data.servicio.fechaInicio,
        label: "Servicio iniciado",
        detail: data.servicio.nombre,
      },
      {
        date: data.servicio.fechaFin,
        label: "Servicio cerrado",
        detail: data.servicio.estado,
      },
    ];
    data.lotes.forEach((lote) => {
      events.push({
        date: lote.asignadoAt,
        label: "Lote asignado",
        detail: getLoteLabel(lote),
      });
    });
    data.deviceAssignments.forEach((assignment) => {
      events.push({
        date: assignment.asignadoAt,
        label: "Dispositivo asignado",
        detail: assignment.dispositivoNombre,
      });
      events.push({
        date: assignment.fechaTermino,
        label: "Dispositivo desasignado",
        detail: assignment.dispositivoNombre,
      });
    });
    data.activeCajas.forEach((caja) => {
      events.push({
        date: caja.asignadoAt,
        label: "Caja activa asignada",
        detail: `${caja.codigo} · ${getLoteLabel(caja)}`,
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
          onClick={() => router.push("/admin/servicios")}
          className="border-white/10 text-slate-300 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a servicios
        </Button>
        <div className="rounded-md border border-white/10 bg-slate-900/60 p-10 text-center text-slate-500">
          Servicio no encontrado.
        </div>
      </div>
    );
  }

  const { servicio, summary } = data;
  const state = ESTADO_CONFIG[servicio.estado] ?? ESTADO_CONFIG.planificado;
  const canStart = servicio.estado === "planificado";
  const canComplete = servicio.estado === "en_curso";

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-4">
        <Button
          variant="outline"
          onClick={() => router.push("/admin/servicios")}
          className="w-fit border-white/10 text-slate-300 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a servicios
        </Button>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-white">
                {servicio.nombre}
              </h1>
              <Badge variant="outline" className={state.className}>
                {state.label}
              </Badge>
              <Badge variant="outline" className="border-white/10 text-slate-300">
                {TIPO_LABELS[servicio.tipo] ?? servicio.tipo}
              </Badge>
              {servicio.usaCajas && (
                <Badge variant="outline" className="border-violet-500/30 text-violet-300">
                  Usa cajas
                </Badge>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-400">
              <Link
                href={`/admin/empresas/${servicio.empresaId}`}
                className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300"
              >
                <Building2 className="h-4 w-4" />
                {servicio.empresaNombre}
              </Link>
              {servicio.procesoId && (
                <Link
                  href={`/admin/procesos/${servicio.procesoId}`}
                  className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300"
                >
                  <Workflow className="h-4 w-4" />
                  {getProcesoLabel(servicio)}
                </Link>
              )}
              {servicio.ubicacionNombre && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-slate-500" />
                  {servicio.ubicacionNombre}
                </span>
              )}
              <span>Inicio: {formatDate(servicio.fechaInicio, "Pendiente")}</span>
              <span>Fin: {formatDate(servicio.fechaFin, "Sin cierre")}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              asChild
              className="bg-amber-500 text-slate-950 hover:bg-amber-400"
            >
              <Link href={`/admin/empresas/${servicio.empresaId}/servicios/${servicio.id}`}>
                Gestionar lotes y asignaciones
              </Link>
            </Button>
            {canStart && (
              <Button
                onClick={() => handleEstado("en_curso")}
                disabled={mutating}
                className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Iniciar servicio
              </Button>
            )}
            {canComplete && (
              <Button
                onClick={() => handleEstado("completado")}
                disabled={mutating}
                className="bg-red-600 text-white hover:bg-red-500"
              >
                <StopCircle className="h-4 w-4 mr-2" />
                Completar servicio
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          icon={<Package className="h-5 w-5" />}
          label="Conteos"
          value={formatNumber(summary.totalCount)}
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
          detail={`${summary.assignedDeviceCount} asignados`}
        />
        <StatCard
          icon={<Package className="h-5 w-5" />}
          label="Cajas activas"
          value={formatNumber(summary.activeCajaCount)}
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
          <TabsTrigger value="lotes" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
            Lotes
          </TabsTrigger>
          <TabsTrigger value="dispositivos" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
            Dispositivos
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
              <CardTitle className="text-lg text-white">Contexto operativo</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="rounded-md border border-white/10 bg-slate-950/30 p-4">
                <p className="text-xs uppercase text-slate-500">Proceso</p>
                <p className="mt-2 text-white">{getProcesoLabel(servicio)}</p>
                <p className="mt-1 text-xs text-slate-500">{servicio.productoNombre ?? "Sin producto"}</p>
              </div>
              <div className="rounded-md border border-white/10 bg-slate-950/30 p-4">
                <p className="text-xs uppercase text-slate-500">Ubicación</p>
                <p className="mt-2 text-white">{servicio.ubicacionNombre ?? "Sin ubicación"}</p>
                {servicio.ubicacionTipo && (
                  <p className="mt-1 text-xs capitalize text-slate-500">{servicio.ubicacionTipo}</p>
                )}
              </div>
              <div className="rounded-md border border-white/10 bg-slate-950/30 p-4">
                <p className="text-xs uppercase text-slate-500">Actividad</p>
                <p className="mt-2 text-white">{formatNumber(summary.totalCount)} conteos</p>
                <p className="mt-1 text-xs text-slate-500">{formatDate(summary.lastCountAt, "Sin último conteo")}</p>
              </div>
            </CardContent>
          </Card>

          {servicio.usaCajas && (
            <Card className="bg-slate-900/60 border-white/10">
              <CardHeader>
                <CardTitle className="text-lg text-white">Cajas activas</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {data.activeCajas.length === 0 ? (
                  <div className="px-6 pb-6 text-sm text-slate-500">
                    No hay cajas activas para este servicio.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead className="text-slate-400 uppercase text-xs">Caja</TableHead>
                        <TableHead className="text-slate-400 uppercase text-xs">Lote</TableHead>
                        <TableHead className="text-slate-400 uppercase text-xs text-right">Conteos</TableHead>
                        <TableHead className="text-slate-400 uppercase text-xs">Asignada</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.activeCajas.map((caja) => (
                        <TableRow key={caja.id} className="border-white/5 hover:bg-white/[0.02]">
                          <TableCell className="font-medium text-white">{caja.codigo}</TableCell>
                          <TableCell className="text-slate-400">{getLoteLabel(caja)}</TableCell>
                          <TableCell className="text-right font-semibold text-white">{formatNumber(caja.totalCount)}</TableCell>
                          <TableCell className="text-slate-400">{formatDate(caja.asignadoAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="lotes" className="mt-4">
          <Card className="bg-slate-900/60 border-white/10">
            <CardContent className="p-0">
              {data.lotes.length === 0 ? (
                <div className="p-12 text-center text-slate-500">No hay lotes asignados.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-slate-400 uppercase text-xs">Lote</TableHead>
                      <TableHead className="text-slate-400 uppercase text-xs">Producto / Variedad</TableHead>
                      <TableHead className="text-slate-400 uppercase text-xs">Estado</TableHead>
                      <TableHead className="text-slate-400 uppercase text-xs text-right">Conteos</TableHead>
                      <TableHead className="text-slate-400 uppercase text-xs">Último conteo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.lotes.map((lote) => (
                      <TableRow key={lote.loteId} className="border-white/5 hover:bg-white/[0.02]">
                        <TableCell className="font-medium text-white">{getLoteLabel(lote)}</TableCell>
                        <TableCell className="text-slate-400">
                          {[lote.productoNombre, lote.variedadNombre, lote.subvariedadNombre].filter(Boolean).join(" · ") || "Sin variedad"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              lote.isActive
                                ? "border-emerald-500/30 bg-emerald-950/30 text-emerald-400"
                                : "border-slate-500/30 bg-slate-950/30 text-slate-300"
                            }
                          >
                            {lote.isActive ? "Activo" : "Sin sesión activa"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-white">
                          {formatNumber(lote.totalCount)}
                        </TableCell>
                        <TableCell className="text-slate-400">{formatDate(lote.lastCountAt, "Sin conteos")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dispositivos" className="mt-4">
          <Card className="bg-slate-900/60 border-white/10">
            <CardContent className="p-0">
              {data.deviceAssignments.length === 0 ? (
                <div className="p-12 text-center text-slate-500">No hay dispositivos asignados.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-slate-400 uppercase text-xs">Dispositivo</TableHead>
                      <TableHead className="text-slate-400 uppercase text-xs">Asignación</TableHead>
                      <TableHead className="text-slate-400 uppercase text-xs">Máquina</TableHead>
                      <TableHead className="text-slate-400 uppercase text-xs">Inicio</TableHead>
                      <TableHead className="text-slate-400 uppercase text-xs">Término</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.deviceAssignments.map((assignment) => {
                      const assignmentState = getAssignmentState(assignment);
                      return (
                        <TableRow key={assignment.id} className="border-white/5 hover:bg-white/[0.02]">
                          <TableCell>
                            <Link
                              href={`/admin/dispositivos/${assignment.dispositivoId}`}
                              className="font-medium text-amber-400 hover:text-amber-300"
                            >
                              {assignment.dispositivoNombre}
                            </Link>
                            <div className="text-xs text-slate-500">{assignment.dispositivoTipo}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={assignmentState.className}>
                              {assignmentState.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-400">{assignment.maquina ?? "Sin máquina"}</TableCell>
                          <TableCell className="text-slate-400">{formatDate(assignment.fechaInicio, "Pendiente")}</TableCell>
                          <TableCell className="text-slate-400">{formatDate(assignment.fechaTermino, "Vigente")}</TableCell>
                        </TableRow>
                      );
                    })}
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
                    <TableHead className="text-slate-400 uppercase text-xs">Lote</TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">Último conteo</TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.lotes.map((lote) => (
                    <TableRow key={lote.loteId} className="border-white/5 hover:bg-white/[0.02]">
                      <TableCell className="font-medium text-white">{getLoteLabel(lote)}</TableCell>
                      <TableCell className="text-slate-400">{formatDate(lote.lastCountAt, "Sin conteos")}</TableCell>
                      <TableCell className="text-right font-semibold text-white">{formatNumber(lote.totalCount)}</TableCell>
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
                <div className="p-12 text-center text-slate-500">No hay eventos registrados.</div>
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
