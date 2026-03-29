"use client";

import { useState, useEffect } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Smartphone, Plus, Trash2, Power, Link as LinkIcon, X } from "lucide-react";
import { motion } from "framer-motion";

interface ServicioRef {
  id: string;
  nombre: string;
  tipo: string;
  empresa?: { nombre: string } | null;
}

interface DispositivoServicioRef {
  dispositivoId: string;
  servicioId: string;
  maquina: string | null;
  servicio: ServicioRef;
}

interface Dispositivo {
  id: string;
  nombre: string;
  tipo: string;
  activo: boolean;
  dispositivoServicios?: DispositivoServicioRef[];
}

export default function DispositivosPage() {
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("");
  const [creating, setCreating] = useState(false);

  // Assign to service state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignDispositivoId, setAssignDispositivoId] = useState("");
  const [allServicios, setAllServicios] = useState<ServicioRef[]>([]);
  const [selectedServicioId, setSelectedServicioId] = useState("");
  const [assignMaquina, setAssignMaquina] = useState("");
  const [assigning, setAssigning] = useState(false);

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

  const fetchServicios = async () => {
    try {
      const res = await axios.get("/api/admin/servicios");
      setAllServicios(res.data);
    } catch (error) {
      console.error(error);
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

  const openAssignDialog = (dispositivoId: string) => {
    setAssignDispositivoId(dispositivoId);
    setSelectedServicioId("");
    setAssignMaquina("");
    setAssignDialogOpen(true);
    fetchServicios();
  };

  const handleAssignServicio = async () => {
    if (!selectedServicioId || !assignDispositivoId) return;
    setAssigning(true);
    try {
      await axios.post("/api/admin/dispositivo-servicio", {
        dispositivoId: assignDispositivoId,
        servicioId: selectedServicioId,
        maquina: assignMaquina || null,
      });
      setAssignDialogOpen(false);
      await fetchDispositivos();
    } catch (error) {
      console.error(error);
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassignServicio = async (dispositivoId: string, servicioId: string) => {
    try {
      await axios.delete("/api/admin/dispositivo-servicio", {
        data: { dispositivoId, servicioId },
      });
      await fetchDispositivos();
    } catch (error) {
      console.error(error);
    }
  };

  const getAssignedServiceIds = (dispositivoId: string): string[] => {
    const d = dispositivos.find((d) => d.id === dispositivoId);
    return d?.dispositivoServicios?.map((ds) => ds.servicioId) ?? [];
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Dispositivos
          </h1>
          <p className="text-slate-400 mt-1">
            Gestiona los dispositivos del sistema y sus asignaciones a servicios.
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

      {/* Assign to Service Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Asignar a Servicio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">Servicio</label>
              <Select value={selectedServicioId} onValueChange={setSelectedServicioId}>
                <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                  <SelectValue placeholder="Seleccionar servicio" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  {allServicios
                    .filter((s) => !getAssignedServiceIds(assignDispositivoId).includes(s.id))
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-white hover:bg-slate-800">
                        {s.nombre} {s.empresa ? `(${s.empresa.nombre})` : ""} - {s.tipo.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">Máquina (opcional)</label>
              <Input
                value={assignMaquina}
                onChange={(e) => setAssignMaquina(e.target.value)}
                placeholder="Identificador de máquina"
                className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-600"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)} className="border-white/10 text-slate-400 hover:text-white">
              Cancelar
            </Button>
            <Button
              onClick={handleAssignServicio}
              disabled={assigning || !selectedServicioId}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
            >
              {assigning ? "Asignando..." : "Asignar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-14 rounded-lg bg-slate-800 animate-pulse"
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="bg-slate-900/60 border-white/10">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-slate-400 uppercase text-xs">
                      Nombre
                    </TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">
                      Tipo
                    </TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">
                      Servicios Asignados
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
                  {dispositivos.map((dispositivo) => (
                    <TableRow
                      key={dispositivo.id}
                      className="border-white/5 hover:bg-white/[0.02] transition-colors"
                    >
                      <TableCell className="text-white font-medium">
                        {dispositivo.nombre}
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {dispositivo.tipo}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {dispositivo.dispositivoServicios && dispositivo.dispositivoServicios.length > 0 ? (
                            dispositivo.dispositivoServicios.map((ds) => (
                              <Badge
                                key={ds.servicioId}
                                variant="outline"
                                className="border-cyan-500/30 bg-cyan-950/20 text-cyan-400 text-xs gap-1"
                              >
                                {ds.servicio.nombre}
                                {ds.maquina && <span className="text-cyan-600">({ds.maquina})</span>}
                                <button
                                  onClick={() => handleUnassignServicio(dispositivo.id, ds.servicioId)}
                                  className="ml-0.5 hover:text-red-400 transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            ))
                          ) : (
                            <span className="text-slate-600 text-xs">Sin asignar</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
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
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-cyan-500/20 text-cyan-400 hover:bg-cyan-950/30"
                            onClick={() => openAssignDialog(dispositivo.id)}
                          >
                            <LinkIcon className="w-3 h-3 mr-1" />
                            Asignar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className={
                              dispositivo.activo
                                ? "border-amber-500/20 text-amber-400 hover:bg-amber-950/30"
                                : "border-emerald-500/20 text-emerald-400 hover:bg-emerald-950/30"
                            }
                            onClick={() => handleToggleActivo(dispositivo)}
                          >
                            <Power className="w-3 h-3 mr-1" />
                            {dispositivo.activo ? "Desactivar" : "Activar"}
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
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
