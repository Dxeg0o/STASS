"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  Cpu,
  History,
  PackageOpen,
  Smartphone,
} from "lucide-react";
import { motion } from "framer-motion";

interface EmpresaRef {
  nombre: string;
}

interface TipoProcesoRef {
  nombre: string;
}

interface ProcesoRef {
  temporada: string | null;
  tipoProceso?: TipoProcesoRef | null;
}

interface UbicacionRef {
  nombre: string;
  tipo: string;
}

interface ServicioRef {
  id: string;
  nombre: string;
  tipo: string;
  estado: string;
  empresa?: EmpresaRef | null;
  proceso?: ProcesoRef | null;
  ubicacion?: UbicacionRef | null;
}

interface DispositivoServicioRef {
  id: string;
  dispositivoId: string;
  servicioId: string;
  maquina: string | null;
  asignadoAt: string | null;
  fechaInicio: string | null;
  fechaTermino: string | null;
  servicio: ServicioRef;
}

interface LoteActivoRef {
  id: string;
  sessionId?: string;
  loteId: string;
  codigoLote: string | null;
  startTime: string | null;
}

interface HistorialLoteRef extends LoteActivoRef {
  endTime: string | null;
  variedadNombre: string | null;
  subvariedadNombre: string | null;
  productoNombre: string | null;
}

interface DispositivoDetail {
  id: string;
  nombre: string;
  tipo: string;
  activo: boolean | null;
  servicioActual?: DispositivoServicioRef | null;
  loteActivo?: LoteActivoRef | null;
  historialServicios?: DispositivoServicioRef[];
  historialLotes?: HistorialLoteRef[];
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  linea_conteo: "Línea de Conteo",
  maquina_plantacion: "Máquina de Plantación",
  estacion_calidad: "Estación de Calidad",
};

const SERVICE_STATE_LABELS: Record<string, { label: string; className: string }> = {
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

const ASSIGNMENT_STATE_LABELS: Record<
  "pendiente" | "activo" | "cerrado",
  { label: string; className: string }
> = {
  pendiente: {
    label: "Pendiente",
    className: "border-amber-500/30 bg-amber-950/30 text-amber-400",
  },
  activo: {
    label: "Activo",
    className: "border-emerald-500/30 bg-emerald-950/30 text-emerald-400",
  },
  cerrado: {
    label: "Cerrado",
    className: "border-slate-500/30 bg-slate-950/30 text-slate-300",
  },
};

function formatDate(value: string | null | undefined, fallback = "Sin dato") {
  if (!value) return fallback;

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getServiceTypeLabel(tipo: string) {
  return SERVICE_TYPE_LABELS[tipo] ?? tipo;
}

function getServiceState(estado: string) {
  return (
    SERVICE_STATE_LABELS[estado] ?? {
      label: estado,
      className: "border-slate-500/30 bg-slate-950/30 text-slate-300",
    }
  );
}

function getAssignmentState(assignment: DispositivoServicioRef) {
  if (assignment.fechaTermino) return ASSIGNMENT_STATE_LABELS.cerrado;
  if (assignment.fechaInicio) return ASSIGNMENT_STATE_LABELS.activo;
  return ASSIGNMENT_STATE_LABELS.pendiente;
}

function getProcesoLabel(servicio?: ServicioRef | null) {
  const tipoProceso = servicio?.proceso?.tipoProceso?.nombre;
  const temporada = servicio?.proceso?.temporada;
  if (tipoProceso && temporada) return `${tipoProceso} ${temporada}`;
  return tipoProceso ?? temporada ?? "Sin proceso";
}

function getLoteLabel(lote: Pick<LoteActivoRef, "loteId" | "codigoLote">) {
  return lote.codigoLote?.trim() || "Sin código";
}

function getLoteState(session: HistorialLoteRef) {
  return session.endTime
    ? {
        label: "Cerrado",
        className: "border-slate-500/30 bg-slate-950/30 text-slate-300",
      }
    : {
        label: "Activo",
        className: "border-violet-500/30 bg-violet-950/30 text-violet-300",
      };
}

function getLoteDetail(lote: HistorialLoteRef) {
  const parts = [
    lote.productoNombre,
    lote.variedadNombre,
    lote.subvariedadNombre,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : "Sin variedad asociada";
}

function SummaryItem({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-slate-900/50 p-4">
      <div className="flex items-center gap-2 text-xs uppercase text-slate-500">
        {icon}
        {label}
      </div>
      <div className="mt-3 text-sm font-medium text-white">{value}</div>
      {detail && <div className="mt-1 text-xs text-slate-500">{detail}</div>}
    </div>
  );
}

export default function DispositivoDetailPage() {
  const { dispositivoId } = useParams<{ dispositivoId: string }>();
  const router = useRouter();
  const [dispositivo, setDispositivo] = useState<DispositivoDetail | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDispositivo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispositivoId]);

  const fetchDispositivo = async () => {
    try {
      const res = await axios.get(`/api/admin/dispositivos/${dispositivoId}`);
      setDispositivo(res.data);
    } catch (error) {
      console.error(error);
      setDispositivo(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <div className="h-10 w-56 rounded-md bg-slate-800 animate-pulse" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 rounded-md bg-slate-800 animate-pulse"
            />
          ))}
        </div>
        <div className="h-80 rounded-md bg-slate-800 animate-pulse" />
      </div>
    );
  }

  if (!dispositivo) {
    return (
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <Button
          variant="outline"
          onClick={() => router.push("/admin/dispositivos")}
          className="border-white/10 text-slate-300 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a dispositivos
        </Button>
        <div className="rounded-md border border-white/10 bg-slate-900/60 p-10 text-center">
          <Smartphone className="w-10 h-10 mx-auto mb-3 text-slate-700" />
          <p className="text-lg font-medium text-white">
            Dispositivo no encontrado
          </p>
          <p className="text-sm text-slate-500 mt-1">
            No se pudo cargar la información del dispositivo.
          </p>
        </div>
      </div>
    );
  }

  const servicioActual = dispositivo.servicioActual;
  const loteActivo = dispositivo.loteActivo;
  const historial = dispositivo.historialServicios ?? [];
  const historialLotes = dispositivo.historialLotes ?? [];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-4">
        <Button
          variant="outline"
          onClick={() => router.push("/admin/dispositivos")}
          className="w-fit border-white/10 text-slate-300 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a dispositivos
        </Button>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-white">
                {dispositivo.nombre}
              </h1>
              <Badge
                variant="outline"
                className={
                  dispositivo.activo
                    ? "border-emerald-500/30 bg-emerald-950/30 text-emerald-400"
                    : "border-red-500/30 bg-red-950/30 text-red-400"
                }
              >
                {dispositivo.activo ? "Activo" : "Inactivo"}
              </Badge>
            </div>
            <p className="text-slate-400 mt-1">
              {dispositivo.tipo} · historial operativo y lote activo
            </p>
          </div>
          <Badge
            variant="outline"
            className="w-fit border-white/10 text-slate-400"
          >
            {historial.length} registro{historial.length === 1 ? "" : "s"} en
            historial
          </Badge>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        <SummaryItem
          icon={<Cpu className="h-3.5 w-3.5" />}
          label="Servicio actual"
          value={servicioActual?.servicio.nombre ?? "Sin servicio actual"}
          detail={
            servicioActual
              ? getServiceTypeLabel(servicioActual.servicio.tipo)
              : "No hay asignación vigente"
          }
        />
        <SummaryItem
          icon={<PackageOpen className="h-3.5 w-3.5" />}
          label="Lote activo"
          value={loteActivo ? getLoteLabel(loteActivo) : "Sin lote activo"}
          detail={
            loteActivo
              ? `Desde ${formatDate(loteActivo.startTime)}`
              : "No hay sesión abierta"
          }
        />
        <SummaryItem
          icon={<Building2 className="h-3.5 w-3.5" />}
          label="Empresa / Proceso"
          value={servicioActual?.servicio.empresa?.nombre ?? "Sin empresa"}
          detail={getProcesoLabel(servicioActual?.servicio)}
        />
        <SummaryItem
          icon={<CalendarClock className="h-3.5 w-3.5" />}
          label="Asignación"
          value={servicioActual?.maquina ?? "Sin máquina"}
          detail={
            servicioActual
              ? `Asignado ${formatDate(servicioActual.asignadoAt)}`
              : "Sin fechas vigentes"
          }
        />
      </motion.div>

      <Card className="bg-slate-900/60 border-white/10">
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <PackageOpen className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-white">
                  Historial de lotes
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Sesiones de lote abiertas por este dispositivo, con fecha de
                inicio y cierre.
              </p>
            </div>
            <Badge
              variant="outline"
              className="w-fit border-white/10 text-slate-400"
            >
              {historialLotes.length} sesión
              {historialLotes.length === 1 ? "" : "es"}
            </Badge>
          </div>

          {historialLotes.length === 0 ? (
            <div className="px-5 py-16 text-center text-slate-500">
              <PackageOpen className="w-10 h-10 mx-auto mb-3 text-slate-700" />
              <p className="text-sm">
                Este dispositivo aún no tiene historial de lotes.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-slate-400 uppercase text-xs">
                    Lote
                  </TableHead>
                  <TableHead className="text-slate-400 uppercase text-xs">
                    Producto / Variedad
                  </TableHead>
                  <TableHead className="text-slate-400 uppercase text-xs">
                    Inicio sesión
                  </TableHead>
                  <TableHead className="text-slate-400 uppercase text-xs">
                    Cierre sesión
                  </TableHead>
                  <TableHead className="text-slate-400 uppercase text-xs text-center">
                    Estado
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historialLotes.map((session) => {
                  const loteState = getLoteState(session);

                  return (
                    <TableRow
                      key={session.sessionId ?? session.id}
                      className="border-white/5 hover:bg-white/[0.02]"
                    >
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-white">
                            {getLoteLabel(session)}
                          </div>
                          {!session.codigoLote && (
                            <div className="text-xs text-slate-600">
                              Sin código de lote registrado
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {getLoteDetail(session)}
                      </TableCell>
                      <TableCell className="text-slate-400 text-xs">
                        {formatDate(session.startTime)}
                      </TableCell>
                      <TableCell className="text-slate-400 text-xs">
                        {formatDate(session.endTime, "Vigente")}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`text-xs ${loteState.className}`}
                        >
                          {loteState.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-900/60 border-white/10">
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-white">
                  Historial de servicios
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Servicios por los que ha pasado el dispositivo, con fechas de
                asignación, inicio y desasignación.
              </p>
            </div>
          </div>

          {historial.length === 0 ? (
            <div className="px-5 py-16 text-center text-slate-500">
              <History className="w-10 h-10 mx-auto mb-3 text-slate-700" />
              <p className="text-sm">Este dispositivo aún no tiene historial.</p>
            </div>
          ) : (
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
                    Máquina
                  </TableHead>
                  <TableHead className="text-slate-400 uppercase text-xs">
                    Asignación
                  </TableHead>
                  <TableHead className="text-slate-400 uppercase text-xs">
                    Inicio
                  </TableHead>
                  <TableHead className="text-slate-400 uppercase text-xs">
                    Desasignación
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historial.map((assignment) => {
                  const assignmentState = getAssignmentState(assignment);
                  const serviceState = getServiceState(assignment.servicio.estado);

                  return (
                    <TableRow
                      key={assignment.id}
                      className="border-white/5 hover:bg-white/[0.02]"
                    >
                      <TableCell>
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-medium text-white">
                              {assignment.servicio.nombre}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-xs ${assignmentState.className}`}
                            >
                              {assignmentState.label}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`text-xs ${serviceState.className}`}
                            >
                              {serviceState.label}
                            </Badge>
                          </div>
                          <div className="text-xs text-slate-500">
                            {getServiceTypeLabel(assignment.servicio.tipo)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-slate-300">
                            {assignment.servicio.empresa?.nombre ??
                              "Sin empresa"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {getProcesoLabel(assignment.servicio)}
                          </div>
                          {assignment.servicio.ubicacion && (
                            <div className="text-xs text-slate-600">
                              {assignment.servicio.ubicacion.nombre}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {assignment.maquina || (
                          <span className="italic text-slate-600">
                            Sin máquina
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-400 text-xs">
                        {formatDate(assignment.asignadoAt)}
                      </TableCell>
                      <TableCell className="text-slate-400 text-xs">
                        {formatDate(assignment.fechaInicio)}
                      </TableCell>
                      <TableCell className="text-slate-400 text-xs">
                        {formatDate(assignment.fechaTermino, "Vigente")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
