"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Building2,
  Clock3,
  History,
  PackageOpen,
  Plus,
  Power,
  Smartphone,
  Trash2,
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

interface Dispositivo {
  id: string;
  nombre: string;
  tipo: string;
  activo: boolean | null;
  servicioActual?: DispositivoServicioRef | null;
  loteActivo?: LoteActivoRef | null;
  historialServicios?: DispositivoServicioRef[];
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

function ServiceContext({ assignment }: { assignment: DispositivoServicioRef }) {
  const serviceState = getServiceState(assignment.servicio.estado);
  const assignmentState = getAssignmentState(assignment);
  const shouldShowAssignmentState = assignmentState.label !== "Activo";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-medium text-white">{assignment.servicio.nombre}</span>
        <Badge
          variant="outline"
          className={`text-xs ${serviceState.className}`}
        >
          {serviceState.label}
        </Badge>
        {shouldShowAssignmentState && (
          <Badge
            variant="outline"
            className={`text-xs ${assignmentState.className}`}
          >
            {assignmentState.label}
          </Badge>
        )}
      </div>
      <div className="text-xs text-slate-400">
        {getServiceTypeLabel(assignment.servicio.tipo)}
      </div>
    </div>
  );
}

function EmptyServiceState() {
  return (
    <div className="space-y-1">
      <span className="text-slate-500 text-sm">Sin servicio actual</span>
      <p className="text-xs text-slate-600">
        Puede tener historial, pero no una asignación vigente.
      </p>
    </div>
  );
}

function LoteActivoCell({ lote }: { lote?: LoteActivoRef | null }) {
  if (!lote) {
    return (
      <div className="space-y-1">
        <span className="text-slate-500 text-sm">Sin lote activo</span>
        <p className="text-xs text-slate-600">No hay sesión abierta.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Badge
        variant="outline"
        className="border-violet-500/30 bg-violet-950/20 text-violet-300"
      >
        {getLoteLabel(lote)}
      </Badge>
      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        <Clock3 className="h-3 w-3 text-slate-600" />
        Desde {formatDate(lote.startTime)}
      </div>
    </div>
  );
}

export default function DispositivosPage() {
  const router = useRouter();
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchDispositivos();
  }, []);

  const fetchDispositivos = async () => {
    try {
      const res = await axios.get("/api/admin/dispositivos");
      setDispositivos(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!nombre.trim() || !tipo.trim()) return;
    setCreating(true);
    try {
      await axios.post("/api/admin/dispositivos", { nombre, tipo });
      setNombre("");
      setTipo("");
      setDialogOpen(false);
      setLoading(true);
      await fetchDispositivos();
    } catch (error) {
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActivo = async (dispositivo: Dispositivo) => {
    try {
      await axios.put(`/api/admin/dispositivos/${dispositivo.id}`, {
        activo: !dispositivo.activo,
      });
      await fetchDispositivos();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este dispositivo?")) return;
    try {
      await axios.delete(`/api/admin/dispositivos/${id}`);
      setLoading(true);
      await fetchDispositivos();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Dispositivos
          </h1>
          <p className="text-slate-400 mt-1">
            Gestiona el inventario, servicio actual y lote activo de cada
            dispositivo.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Dispositivo
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Nuevo Dispositivo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">
                  Nombre
                </label>
                <Input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre del dispositivo"
                  className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">
                  Tipo
                </label>
                <Input
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  placeholder="Tipo de dispositivo"
                  className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-600"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="border-white/10 text-slate-400 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={creating || !nombre.trim() || !tipo.trim()}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
              >
                {creating ? "Creando..." : "Crear"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-lg bg-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : dispositivos.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Smartphone className="w-10 h-10 mx-auto mb-3 text-slate-700" />
          <p className="text-lg font-medium">No hay dispositivos</p>
          <p className="text-sm mt-1">
            Crea tu primer dispositivo para comenzar.
          </p>
        </div>
      ) : (
        <TooltipProvider delayDuration={150}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="bg-slate-900/60 border-white/10">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-slate-400 uppercase text-xs">
                        Dispositivo
                      </TableHead>
                      <TableHead className="text-slate-400 uppercase text-xs">
                        Servicio actual
                      </TableHead>
                      <TableHead className="text-slate-400 uppercase text-xs">
                        Lote activo
                      </TableHead>
                      <TableHead className="text-slate-400 uppercase text-xs">
                        Empresa / Proceso
                      </TableHead>
                      <TableHead className="text-slate-400 uppercase text-xs">
                        Máquina / Fechas
                      </TableHead>
                      <TableHead className="text-slate-400 uppercase text-xs text-center">
                        Estado
                      </TableHead>
                      <TableHead className="text-slate-400 uppercase text-xs text-right">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dispositivos.map((dispositivo) => {
                      const currentAssignment = dispositivo.servicioActual;
                      const historial = dispositivo.historialServicios ?? [];

                      return (
                        <TableRow
                          key={dispositivo.id}
                          className="border-white/5 hover:bg-white/[0.03] transition-colors cursor-pointer"
                          onClick={() =>
                            router.push(`/admin/dispositivos/${dispositivo.id}`)
                          }
                        >
                          <TableCell className="align-top">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-white font-medium">
                                <Smartphone className="h-4 w-4 text-slate-500" />
                                {dispositivo.nombre}
                              </div>
                              <div className="text-xs text-slate-500">
                                {dispositivo.tipo}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-slate-600">
                                <History className="h-3 w-3" />
                                {historial.length} registro
                                {historial.length === 1 ? "" : "s"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            {currentAssignment ? (
                              <ServiceContext assignment={currentAssignment} />
                            ) : (
                              <EmptyServiceState />
                            )}
                          </TableCell>
                          <TableCell className="align-top">
                            <LoteActivoCell lote={dispositivo.loteActivo} />
                          </TableCell>
                          <TableCell className="align-top">
                            {currentAssignment ? (
                              <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2 text-slate-300">
                                  <Building2 className="h-4 w-4 text-slate-500" />
                                  {currentAssignment.servicio.empresa?.nombre ??
                                    "Sin empresa"}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {getProcesoLabel(currentAssignment.servicio)}
                                </div>
                                {currentAssignment.servicio.ubicacion && (
                                  <div className="text-xs text-slate-600">
                                    {currentAssignment.servicio.ubicacion.nombre}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-600">
                                Sin contexto operativo vigente
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="align-top">
                            {currentAssignment ? (
                              <div className="space-y-1 text-xs text-slate-400">
                                <div className="text-sm text-slate-300">
                                  {currentAssignment.maquina || "Sin máquina"}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Clock3 className="h-3 w-3 text-slate-600" />
                                  Asignado:{" "}
                                  {formatDate(currentAssignment.asignadoAt)}
                                </div>
                                <div>
                                  Inicio efectivo:{" "}
                                  {formatDate(currentAssignment.fechaInicio)}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-600">
                                Sin fechas vigentes
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="align-top text-center">
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
                          </TableCell>
                          <TableCell className="align-top text-right">
                            <div
                              className="flex items-center justify-end gap-2"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className={
                                      dispositivo.activo
                                        ? "border-amber-500/20 text-amber-400 hover:bg-amber-950/30"
                                        : "border-emerald-500/20 text-emerald-400 hover:bg-emerald-950/30"
                                    }
                                    onClick={() =>
                                      handleToggleActivo(dispositivo)
                                    }
                                  >
                                    <Power className="w-3 h-3 mr-1" />
                                    {dispositivo.activo
                                      ? "Desactivar"
                                      : "Activar"}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="left"
                                  className="max-w-xs bg-slate-950 text-slate-100 border border-white/10"
                                >
                                  {dispositivo.activo
                                    ? "Impide que el dispositivo sincronice nuevas mediciones. No elimina el dispositivo ni borra su historial."
                                    : "Permite que el dispositivo vuelva a autenticarse y sincronizar mediciones."}
                                </TooltipContent>
                              </Tooltip>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-slate-500/20 text-slate-300 hover:text-white hover:bg-slate-800"
                                onClick={() =>
                                  router.push(
                                    `/admin/dispositivos/${dispositivo.id}`
                                  )
                                }
                              >
                                <PackageOpen className="w-3 h-3 mr-1" />
                                Ver
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-950/30"
                                onClick={() => handleDelete(dispositivo.id)}
                              >
                                <Trash2 className="w-3 h-3" />
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
        </TooltipProvider>
      )}
    </div>
  );
}
