"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Plus, Trash2, ArrowLeft, Building2, AlertTriangle, StopCircle, Layers, PlayCircle, Lock } from "lucide-react";

interface TipoProceso {
  id: string;
  nombre: string;
  empresaId: string;
  createdAt: string;
}

interface EmpresaDetail {
  id: string;
  nombre: string;
  pais: string | null;
  createdAt: string;
  empresaUsuarios: Array<{
    id: string;
    rol: string;
    usuario: { id: string; nombre: string; correo: string };
  }>;
  procesos: Array<{
    id: string;
    estado: string;
    temporada: string | null;
    fechaInicio: string | null;
    fechaFin: string | null;
    tipoProceso?: { nombre: string } | null;
    producto?: { nombre: string } | null;
  }>;
  servicios: Array<{
    id: string;
    nombre: string;
    tipo: string;
    estado: string;
    fechaInicio: string | null;
    fechaFin: string | null;
    proceso?: { id: string; estado: string; tipoProceso?: { nombre: string } | null } | null;
    ubicacion?: { id: string; nombre: string; tipo: string } | null;
    dispositivoServicios?: Array<{
      id: string;
      fechaInicio: string | null;
      fechaTermino: string | null;
    }>;
  }>;
  ubicaciones: Array<{
    id: string;
    nombre: string;
    tipo: string;
    lat: number | null;
    lng: number | null;
  }>;
}

const estadoConfig: Record<string, { label: string; class: string }> = {
  planificado: { label: "Planificado", class: "bg-slate-700/50 text-slate-300" },
  en_curso: { label: "En curso", class: "bg-emerald-500/20 text-emerald-400" },
  completado: { label: "Completado", class: "bg-blue-500/20 text-blue-400" },
  cancelado: { label: "Cancelado", class: "bg-red-500/20 text-red-400" },
};

const formatDateTime = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString("es-CL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Pendiente";

const getOpenDeviceSummary = (
  dispositivos: EmpresaDetail["servicios"][number]["dispositivoServicios"] = []
) => {
  const pendientes = dispositivos.filter((d) => !d.fechaInicio).length;
  const activos = dispositivos.filter((d) => d.fechaInicio && !d.fechaTermino).length;
  return { pendientes, activos, total: pendientes + activos };
};

export default function EmpresaDetailPage() {
  const { empresaId } = useParams<{ empresaId: string }>();
  const router = useRouter();
  const [empresa, setEmpresa] = useState<EmpresaDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // General tab state
  const [nombre, setNombre] = useState("");
  const [pais, setPais] = useState("");
  const [saving, setSaving] = useState(false);

  // Usuarios tab state
  const [allUsuarios, setAllUsuarios] = useState<{ id: string; nombre: string; correo: string }[]>([]);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [selectedUsuarioId, setSelectedUsuarioId] = useState("");
  const [selectedRol, setSelectedRol] = useState("usuario");
  const [addingUser, setAddingUser] = useState(false);

  // Tipos de proceso tab state
  const [tiposProceso, setTiposProceso] = useState<TipoProceso[]>([]);
  const [tipoDialogOpen, setTipoDialogOpen] = useState(false);
  const [tipoNombre, setTipoNombre] = useState("");
  const [creatingTipo, setCreatingTipo] = useState(false);

  // Procesos tab state
  const [productos, setProductos] = useState<{ id: string; nombre: string }[]>([]);
  const [addProcesoDialogOpen, setAddProcesoDialogOpen] = useState(false);
  const [procesoTipoId, setProcesoTipoId] = useState("");
  const [procesoProductoId, setProcesoProductoId] = useState("");
  const [procesoTemporada, setProcesoTemporada] = useState("");
  const [creatingProceso, setCreatingProceso] = useState(false);

  // Workflows tab state
  const [workflows, setWorkflows] = useState<Array<{
    id: string;
    nombre: string;
    pasos: Array<{ id: string; orden: number; tipoProceso: { nombre: string } }>;
  }>>([]);
  const [wfDialogOpen, setWfDialogOpen] = useState(false);
  const [wfNombre, setWfNombre] = useState("");
  const [creatingWf, setCreatingWf] = useState(false);

  // Servicios tab state
  const [addServicioDialogOpen, setAddServicioDialogOpen] = useState(false);
  const [servicioNombre, setServicioNombre] = useState("");
  const [servicioTipo, setServicioTipo] = useState("");
  const [servicioProcesoId, setServicioProcesoId] = useState("");
  const [servicioUbicacionId, setServicioUbicacionId] = useState("");
  const [servicioUsaCajas, setServicioUsaCajas] = useState(false);
  const [creatingServicio, setCreatingServicio] = useState(false);

  // Ubicaciones tab state
  const [addUbicacionDialogOpen, setAddUbicacionDialogOpen] = useState(false);
  const [ubicacionNombre, setUbicacionNombre] = useState("");
  const [ubicacionTipo, setUbicacionTipo] = useState("");
  const [ubicacionLat, setUbicacionLat] = useState("");
  const [ubicacionLng, setUbicacionLng] = useState("");
  const [creatingUbicacion, setCreatingUbicacion] = useState(false);

  // Terminar proceso state
  const [terminateProcesoId, setTerminateProcesoId] = useState<string | null>(null);
  const [terminatingProceso, setTerminatingProceso] = useState(false);
  const [startingProcesoId, setStartingProcesoId] = useState<string | null>(null);

  // Terminar servicio state
  const [terminateServicioId, setTerminateServicioId] = useState<string | null>(null);
  const [terminatingServicio, setTerminatingServicio] = useState(false);
  const [startingServicioId, setStartingServicioId] = useState<string | null>(null);

  // Delete challenge state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteChallenge, setDeleteChallenge] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchEmpresa();
    fetchAllUsuarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  const fetchEmpresa = async () => {
    try {
      const [empRes, wfRes, tiposRes] = await Promise.all([
        axios.get(`/api/admin/empresas/${empresaId}`),
        axios.get(`/api/admin/empresas/${empresaId}/workflows`),
        axios.get(`/api/admin/empresas/${empresaId}/tipos-proceso`),
      ]);
      setEmpresa(empRes.data);
      setNombre(empRes.data.nombre);
      setPais(empRes.data.pais ?? "");
      setWorkflows(wfRes.data);
      setTiposProceso(tiposRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsuarios = async () => {
    try {
      const res = await axios.get("/api/admin/usuarios");
      setAllUsuarios(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchTiposAndProductos = async () => {
    try {
      const [tiposRes, prodRes] = await Promise.all([
        axios.get(`/api/admin/empresas/${empresaId}/tipos-proceso`),
        axios.get("/api/admin/productos"),
      ]);
      setTiposProceso(tiposRes.data);
      setProductos(prodRes.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateTipo = async () => {
    const trimmedNombre = tipoNombre.trim();
    if (!trimmedNombre) return;

    setCreatingTipo(true);
    try {
      const res = await axios.post(
        `/api/admin/empresas/${empresaId}/tipos-proceso`,
        { nombre: trimmedNombre }
      );
      setTiposProceso((prev) => [...prev, res.data]);
      setTipoNombre("");
      setTipoDialogOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setCreatingTipo(false);
    }
  };

  const handleSaveGeneral = async () => {
    setSaving(true);
    try {
      await axios.put(`/api/admin/empresas/${empresaId}`, { nombre, pais });
      setEmpresa((prev) => prev ? { ...prev, nombre, pais } : prev);
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddUser = async () => {
    if (!selectedUsuarioId) return;
    setAddingUser(true);
    try {
      await axios.post(`/api/admin/empresas/${empresaId}/usuarios`, {
        usuarioId: selectedUsuarioId,
        rol: selectedRol,
      });
      setAddUserDialogOpen(false);
      setSelectedUsuarioId("");
      setSelectedRol("usuario");
      await fetchEmpresa();
    } catch (error) {
      console.error(error);
    } finally {
      setAddingUser(false);
    }
  };

  const handleRemoveUser = async (usuarioId: string) => {
    try {
      await axios.delete(`/api/admin/empresas/${empresaId}/usuarios`, {
        data: { usuarioId },
      });
      await fetchEmpresa();
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateProceso = async () => {
    if (!procesoTipoId) return;
    setCreatingProceso(true);
    try {
      await axios.post(`/api/admin/empresas/${empresaId}/procesos`, {
        tipoProcesoId: procesoTipoId,
        productoId: procesoProductoId || undefined,
        temporada: procesoTemporada || undefined,
      });
      setAddProcesoDialogOpen(false);
      setProcesoTipoId("");
      setProcesoProductoId("");
      setProcesoTemporada("");
      await fetchEmpresa();
    } catch (error) {
      console.error(error);
    } finally {
      setCreatingProceso(false);
    }
  };

  const handleCreateWorkflow = async () => {
    if (!wfNombre.trim()) return;
    setCreatingWf(true);
    try {
      await axios.post(`/api/admin/empresas/${empresaId}/workflows`, { nombre: wfNombre });
      setWfDialogOpen(false);
      setWfNombre("");
      const res = await axios.get(`/api/admin/empresas/${empresaId}/workflows`);
      setWorkflows(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setCreatingWf(false);
    }
  };

  const handleCreateServicio = async () => {
    if (!servicioNombre.trim() || !servicioTipo || !servicioProcesoId) return;
    setCreatingServicio(true);
    try {
      await axios.post(`/api/admin/empresas/${empresaId}/procesos/${servicioProcesoId}/servicios`, {
        nombre: servicioNombre,
        tipo: servicioTipo,
        usaCajas: servicioUsaCajas,
        ubicacionId: servicioUbicacionId || undefined,
      });
      setAddServicioDialogOpen(false);
      setServicioNombre("");
      setServicioTipo("");
      setServicioProcesoId("");
      setServicioUbicacionId("");
      setServicioUsaCajas(false);
      await fetchEmpresa();
    } catch (error) {
      console.error(error);
    } finally {
      setCreatingServicio(false);
    }
  };

  const handleCreateUbicacion = async () => {
    if (!ubicacionNombre.trim() || !ubicacionTipo) return;
    setCreatingUbicacion(true);
    try {
      await axios.post(`/api/admin/empresas/${empresaId}/ubicaciones`, {
        nombre: ubicacionNombre,
        tipo: ubicacionTipo,
        lat: ubicacionLat ? parseFloat(ubicacionLat) : undefined,
        lng: ubicacionLng ? parseFloat(ubicacionLng) : undefined,
      });
      setAddUbicacionDialogOpen(false);
      setUbicacionNombre("");
      setUbicacionTipo("");
      setUbicacionLat("");
      setUbicacionLng("");
      await fetchEmpresa();
    } catch (error) {
      console.error(error);
    } finally {
      setCreatingUbicacion(false);
    }
  };

  const handleDeleteUbicacion = async (ubicacionId: string) => {
    try {
      await axios.delete(`/api/admin/empresas/${empresaId}/ubicaciones/${ubicacionId}`);
      await fetchEmpresa();
    } catch (error) {
      console.error(error);
    }
  };

  const handleStartProceso = async (procesoId: string) => {
    setStartingProcesoId(procesoId);
    try {
      await axios.patch(`/api/procesos/${procesoId}`, {
        estado: "en_curso",
      });
      await fetchEmpresa();
    } catch (error) {
      console.error(error);
    } finally {
      setStartingProcesoId(null);
    }
  };

  const handleTerminarProceso = async () => {
    if (!terminateProcesoId) return;
    setTerminatingProceso(true);
    try {
      await axios.patch(`/api/procesos/${terminateProcesoId}`, {
        estado: "completado",
        fechaFin: new Date().toISOString(),
      });
      setTerminateProcesoId(null);
      await fetchEmpresa();
    } catch (error) {
      console.error(error);
    } finally {
      setTerminatingProceso(false);
    }
  };

  const handleTerminarServicio = async () => {
    if (!terminateServicioId) return;
    setTerminatingServicio(true);
    try {
      await axios.patch(`/api/admin/servicios/${terminateServicioId}`, {
        fechaFin: new Date().toISOString(),
      });
      setTerminateServicioId(null);
      await fetchEmpresa();
    } catch (error) {
      console.error(error);
    } finally {
      setTerminatingServicio(false);
    }
  };

  const handleStartServicio = async (servicioId: string) => {
    setStartingServicioId(servicioId);
    try {
      await axios.patch(`/api/admin/servicios/${servicioId}`, {
        estado: "en_curso",
      });
      await fetchEmpresa();
    } catch (error) {
      console.error(error);
    } finally {
      setStartingServicioId(null);
    }
  };

  const handleDeleteEmpresa = async () => {
    setDeleting(true);
    try {
      await axios.delete(`/api/admin/empresas/${empresaId}`);
      router.push("/admin/empresas");
    } catch (error) {
      console.error(error);
      setDeleting(false);
    }
  };

  const expectedDeleteText = empresa
    ? `Deseo eliminar a ${empresa.nombre} y toda su información`
    : "";

  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-slate-800 animate-pulse rounded" />
        <div className="h-96 bg-slate-800 animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!empresa) {
    return (
      <div className="text-center py-20 text-slate-400">
        Empresa no encontrada.
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/admin/empresas")}
          className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-amber-400" />
            {empresa.nombre}
          </h1>
          <p className="text-slate-400 text-sm">{empresa.pais}</p>
        </div>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="bg-slate-800/50 border border-white/10">
          <TabsTrigger value="general" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">General</TabsTrigger>
          <TabsTrigger value="usuarios" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
            Usuarios <Badge variant="outline" className="ml-1.5 border-white/10 text-slate-400 text-xs">{empresa.empresaUsuarios.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="tipos" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
            Tipos de Proceso <Badge variant="outline" className="ml-1.5 border-white/10 text-slate-400 text-xs">{tiposProceso.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="procesos" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
            Procesos <Badge variant="outline" className="ml-1.5 border-white/10 text-slate-400 text-xs">{empresa.procesos.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="workflows" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
            Workflows <Badge variant="outline" className="ml-1.5 border-white/10 text-slate-400 text-xs">{workflows.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="servicios" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
            Servicios <Badge variant="outline" className="ml-1.5 border-white/10 text-slate-400 text-xs">{empresa.servicios.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="ubicaciones" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
            Ubicaciones <Badge variant="outline" className="ml-1.5 border-white/10 text-slate-400 text-xs">{empresa.ubicaciones.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* GENERAL */}
        <TabsContent value="general" className="mt-4 space-y-4">
          <Card className="bg-slate-900/60 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg">Información General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">Nombre</label>
                <Input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="bg-slate-800/50 border-white/10 text-white max-w-sm"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">País</label>
                <Input
                  value={pais}
                  onChange={(e) => setPais(e.target.value)}
                  className="bg-slate-800/50 border-white/10 text-white max-w-sm"
                  placeholder="Chile"
                />
              </div>
              <Button
                onClick={handleSaveGeneral}
                disabled={saving}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
              >
                {saving ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </CardContent>
          </Card>

          {/* Delete Empresa */}
          <Card className="bg-red-950/20 border-red-500/20">
            <CardHeader>
              <CardTitle className="text-red-400 text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Zona Peligrosa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400 text-sm mb-4">
                Eliminar esta empresa borrará todos sus datos permanentemente: usuarios asignados, procesos, servicios, workflows y toda la información asociada.
              </p>
              <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
                setDeleteDialogOpen(open);
                if (!open) setDeleteChallenge("");
              }}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-950/30 hover:text-red-300">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar Empresa
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-white/10 text-white">
                  <DialogHeader>
                    <DialogTitle className="text-red-400">Eliminar Empresa</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <p className="text-slate-400 text-sm">
                      Para confirmar, escriba exactamente:
                    </p>
                    <p className="text-white text-sm font-mono bg-slate-800/60 p-3 rounded-lg border border-white/10">
                      {expectedDeleteText}
                    </p>
                    <Input
                      value={deleteChallenge}
                      onChange={(e) => setDeleteChallenge(e.target.value)}
                      placeholder="Escriba el texto de confirmación..."
                      className="bg-slate-800/50 border-white/10 text-white"
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="border-white/10 text-slate-400 hover:text-white">
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleDeleteEmpresa}
                      disabled={deleting || deleteChallenge !== expectedDeleteText}
                      className="bg-red-600 hover:bg-red-500 text-white font-semibold disabled:opacity-50"
                    >
                      {deleting ? "Eliminando..." : "Eliminar Permanentemente"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        {/* USUARIOS */}
        <TabsContent value="usuarios" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-slate-400 text-sm">{empresa.empresaUsuarios.length} usuario(s) en esta empresa</p>
            <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Usuario
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle>Agregar Usuario a Empresa</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm text-slate-400 mb-1.5 block">Usuario</label>
                    <Select value={selectedUsuarioId} onValueChange={setSelectedUsuarioId}>
                      <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                        <SelectValue placeholder="Seleccionar usuario" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10">
                        {allUsuarios
                          .filter((u) => !empresa.empresaUsuarios.some((eu) => eu.usuario.id === u.id))
                          .map((u) => (
                            <SelectItem key={u.id} value={u.id} className="text-white hover:bg-slate-800">
                              {u.nombre} ({u.correo})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1.5 block">Rol</label>
                    <Select value={selectedRol} onValueChange={setSelectedRol}>
                      <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10">
                        <SelectItem value="usuario" className="text-white hover:bg-slate-800">Usuario</SelectItem>
                        <SelectItem value="administrador" className="text-white hover:bg-slate-800">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddUserDialogOpen(false)} className="border-white/10 text-slate-400 hover:text-white">Cancelar</Button>
                  <Button onClick={handleAddUser} disabled={addingUser || !selectedUsuarioId} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">
                    {addingUser ? "Agregando..." : "Agregar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="bg-slate-900/60 border-white/10">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-slate-400 uppercase text-xs">Nombre</TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">Correo</TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">Rol</TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empresa.empresaUsuarios.map((eu) => (
                    <TableRow key={eu.id} className="border-white/5 hover:bg-white/[0.02]">
                      <TableCell className="text-white font-medium">{eu.usuario.nombre}</TableCell>
                      <TableCell className="text-slate-400">{eu.usuario.correo}</TableCell>
                      <TableCell>
                        <Badge className={eu.rol === "administrador" ? "bg-amber-500/20 text-amber-400" : "bg-slate-700/50 text-slate-300"}>
                          {eu.rol}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          onClick={() => handleRemoveUser(eu.usuario.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TIPOS DE PROCESO */}
        <TabsContent value="tipos" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-slate-400 text-sm">
              {tiposProceso.length} tipo(s) de proceso definidos
            </p>
            <Dialog
              open={tipoDialogOpen}
              onOpenChange={(open) => {
                setTipoDialogOpen(open);
                if (!open) setTipoNombre("");
              }}
            >
              <DialogTrigger asChild>
                <Button className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Tipo
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle>Nuevo Tipo de Proceso</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <label className="text-sm text-slate-400 mb-1.5 block">
                    Nombre
                  </label>
                  <Input
                    value={tipoNombre}
                    onChange={(e) => setTipoNombre(e.target.value)}
                    placeholder="Ej: Cosecha"
                    className="bg-slate-800/50 border-white/10 text-white"
                  />
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setTipoDialogOpen(false)}
                    className="border-white/10 text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateTipo}
                    disabled={creatingTipo || !tipoNombre.trim()}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
                  >
                    {creatingTipo ? "Creando..." : "Crear"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="bg-slate-900/60 border-white/10">
            <CardContent className="p-0">
              {tiposProceso.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  <p>No hay tipos de proceso creados para esta empresa.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-slate-400 uppercase text-xs">
                        Nombre
                      </TableHead>
                      <TableHead className="text-slate-400 uppercase text-xs">
                        Creado
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tiposProceso.map((tipo) => (
                      <TableRow
                        key={tipo.id}
                        className="border-white/5 hover:bg-white/[0.02]"
                      >
                        <TableCell className="text-white font-medium">
                          {tipo.nombre}
                        </TableCell>
                        <TableCell className="text-slate-400">
                          {new Date(tipo.createdAt).toLocaleDateString("es-CL")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROCESOS */}
        <TabsContent value="procesos" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-slate-400 text-sm">{empresa.procesos.length} proceso(s) creados</p>
            <Dialog
              open={addProcesoDialogOpen}
              onOpenChange={(open) => {
                setAddProcesoDialogOpen(open);
                if (open) fetchTiposAndProductos();
              }}
            >
              <DialogTrigger asChild>
                <Button className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Proceso
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle>Nuevo Proceso</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm text-slate-400 mb-1.5 block">Tipo de Proceso *</label>
                    <Select value={procesoTipoId} onValueChange={setProcesoTipoId}>
                      <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10">
                        {tiposProceso.map((t) => (
                          <SelectItem key={t.id} value={t.id} className="text-white hover:bg-slate-800">{t.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1.5 block">Producto</label>
                    <Select value={procesoProductoId} onValueChange={setProcesoProductoId}>
                      <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                        <SelectValue placeholder="Seleccionar producto (opcional)" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10">
                        {productos.map((p) => (
                          <SelectItem key={p.id} value={p.id} className="text-white hover:bg-slate-800">{p.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1.5 block">Temporada</label>
                    <Input
                      value={procesoTemporada}
                      onChange={(e) => setProcesoTemporada(e.target.value)}
                      placeholder="Ej: 2025-2026"
                      className="bg-slate-800/50 border-white/10 text-white"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddProcesoDialogOpen(false)} className="border-white/10 text-slate-400 hover:text-white">Cancelar</Button>
                  <Button onClick={handleCreateProceso} disabled={creatingProceso || !procesoTipoId} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">
                    {creatingProceso ? "Creando..." : "Crear"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="bg-slate-900/60 border-white/10">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-slate-400 uppercase text-xs">Tipo</TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">Producto</TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">Temporada</TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">Estado</TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">Servicios</TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">Dispositivos</TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">Inicio</TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">Fin</TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empresa.procesos.map((p) => {
                    const ec = estadoConfig[p.estado] ?? estadoConfig.planificado;
                    const serviciosProceso = empresa.servicios.filter((s) => s.proceso?.id === p.id);
                    const serviceCounts = serviciosProceso.reduce(
                      (acc, s) => {
                        acc[s.estado as keyof typeof acc] = (acc[s.estado as keyof typeof acc] ?? 0) + 1;
                        return acc;
                      },
                      { planificado: 0, en_curso: 0, completado: 0, cancelado: 0 }
                    );
                    const deviceSummary = serviciosProceso.reduce(
                      (acc, s) => {
                        const summary = getOpenDeviceSummary(s.dispositivoServicios);
                        acc.pendientes += summary.pendientes;
                        acc.activos += summary.activos;
                        return acc;
                      },
                      { pendientes: 0, activos: 0 }
                    );
                    const isClosed = p.estado === "completado" || p.estado === "cancelado";
                    return (
                      <TableRow key={p.id} className="border-white/5 hover:bg-white/[0.02]">
                        <TableCell className="text-white font-medium">{p.tipoProceso?.nombre ?? "-"}</TableCell>
                        <TableCell className="text-slate-400">{p.producto?.nombre ?? "-"}</TableCell>
                        <TableCell className="text-slate-400">{p.temporada ?? "-"}</TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ec.class}`}>{ec.label}</span>
                        </TableCell>
                        <TableCell className="text-slate-400">
                          <div className="flex flex-wrap gap-1">
                            {serviceCounts.planificado > 0 && <Badge variant="outline" className="border-slate-500/30 text-slate-300 text-xs">{serviceCounts.planificado} plan.</Badge>}
                            {serviceCounts.en_curso > 0 && <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs">{serviceCounts.en_curso} curso</Badge>}
                            {serviceCounts.completado > 0 && <Badge variant="outline" className="border-blue-500/30 text-blue-400 text-xs">{serviceCounts.completado} comp.</Badge>}
                            {serviciosProceso.length === 0 && <span className="text-slate-600 text-xs">Sin servicios</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-400">
                          <div className="flex flex-wrap gap-1">
                            {deviceSummary.pendientes > 0 && <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-xs">{deviceSummary.pendientes} pend.</Badge>}
                            {deviceSummary.activos > 0 && <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-xs">{deviceSummary.activos} act.</Badge>}
                            {deviceSummary.pendientes + deviceSummary.activos === 0 && <span className="text-slate-600 text-xs">Sin disp.</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-400">
                          {formatDateTime(p.fechaInicio)}
                        </TableCell>
                        <TableCell className="text-slate-400">
                          {p.fechaFin ? formatDateTime(p.fechaFin) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {p.estado === "planificado" && (
                              <button
                                onClick={() => handleStartProceso(p.id)}
                                disabled={startingProcesoId === p.id}
                                className="p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-emerald-400/10 rounded transition-all disabled:opacity-50"
                                title="Iniciar proceso y servicios"
                              >
                                <PlayCircle className="w-4 h-4" />
                              </button>
                            )}
                            {p.estado === "en_curso" && (
                              <button
                                onClick={() => setTerminateProcesoId(p.id)}
                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-all"
                                title="Completar proceso"
                              >
                                <StopCircle className="w-4 h-4" />
                              </button>
                            )}
                            {isClosed && (
                              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                <Lock className="w-3.5 h-3.5" />
                                {p.estado === "completado" ? "Completado, no editable" : "Cancelado"}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Diálogo confirmación terminar proceso */}
          <Dialog open={!!terminateProcesoId} onOpenChange={(open) => { if (!open) setTerminateProcesoId(null); }}>
            <DialogContent className="bg-slate-900 border-white/10 text-white">
              <DialogHeader>
                <DialogTitle className="text-red-400">Completar Proceso</DialogTitle>
              </DialogHeader>
              <p className="text-slate-400 text-sm py-2">
                Esta acción marcará el proceso como completado, completará todos sus servicios abiertos y cerrará las asignaciones activas de dispositivos. Después no se podrá volver a cambiar.
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTerminateProcesoId(null)} className="border-white/10 text-slate-400 hover:text-white">
                  Cancelar
                </Button>
                <Button
                  onClick={handleTerminarProceso}
                  disabled={terminatingProceso}
                  className="bg-red-600 hover:bg-red-500 text-white font-semibold"
                >
                  {terminatingProceso ? "Completando..." : "Completar Proceso"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* WORKFLOWS */}
        <TabsContent value="workflows" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-slate-400 text-sm">{workflows.length} workflow(s) definidos</p>
            <Dialog open={wfDialogOpen} onOpenChange={setWfDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Workflow
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle>Nuevo Workflow</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <label className="text-sm text-slate-400 mb-1.5 block">Nombre</label>
                  <Input
                    value={wfNombre}
                    onChange={(e) => setWfNombre(e.target.value)}
                    placeholder="Ej: Proceso Comercial"
                    className="bg-slate-800/50 border-white/10 text-white"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setWfDialogOpen(false)} className="border-white/10 text-slate-400 hover:text-white">Cancelar</Button>
                  <Button onClick={handleCreateWorkflow} disabled={creatingWf || !wfNombre.trim()} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">
                    {creatingWf ? "Creando..." : "Crear"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {workflows.map((wf) => (
              <Card key={wf.id} className="bg-slate-900/60 border-white/10">
                <CardContent className="p-5">
                  <h3 className="text-white font-semibold mb-3">{wf.nombre}</h3>
                  <div className="flex flex-wrap gap-2">
                    {wf.pasos.map((paso) => (
                      <div key={paso.id} className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500">{paso.orden}.</span>
                        <Badge variant="outline" className="border-amber-500/20 text-amber-400 text-xs">
                          {paso.tipoProceso.nombre}
                        </Badge>
                      </div>
                    ))}
                    {wf.pasos.length === 0 && (
                      <p className="text-slate-500 text-sm">Sin pasos definidos</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {workflows.length === 0 && (
              <div className="text-center py-10 text-slate-500">
                <p>No hay workflows creados para esta empresa.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* SERVICIOS */}
        <TabsContent value="servicios" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-slate-400 text-sm">{empresa.servicios.length} servicio(s) creados</p>
            <Dialog open={addServicioDialogOpen} onOpenChange={setAddServicioDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Servicio
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle>Nuevo Servicio</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm text-slate-400 mb-1.5 block">Proceso *</label>
                    <Select value={servicioProcesoId} onValueChange={setServicioProcesoId}>
                      <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                        <SelectValue placeholder="Seleccionar proceso" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10">
                        {empresa.procesos
                          .filter((p) => p.estado !== "completado" && p.estado !== "cancelado")
                          .map((p) => (
                          <SelectItem key={p.id} value={p.id} className="text-white hover:bg-slate-800">
                            {p.tipoProceso?.nombre ?? "Proceso"} {p.temporada ? `(${p.temporada})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1.5 block">Nombre *</label>
                    <Input
                      value={servicioNombre}
                      onChange={(e) => setServicioNombre(e.target.value)}
                      placeholder="Nombre del servicio"
                      className="bg-slate-800/50 border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1.5 block">Tipo *</label>
                    <Select value={servicioTipo} onValueChange={setServicioTipo}>
                      <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10">
                        <SelectItem value="linea_conteo" className="text-white hover:bg-slate-800">Linea de Conteo</SelectItem>
                        <SelectItem value="maquina_plantacion" className="text-white hover:bg-slate-800">Maquina de Plantacion</SelectItem>
                        <SelectItem value="estacion_calidad" className="text-white hover:bg-slate-800">Estacion de Calidad</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1.5 block">Ubicación</label>
                    <Select value={servicioUbicacionId} onValueChange={setServicioUbicacionId}>
                      <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                        <SelectValue placeholder="Sin ubicación (opcional)" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10">
                        {empresa.ubicaciones.map((u) => (
                          <SelectItem key={u.id} value={u.id} className="text-white hover:bg-slate-800">
                            {u.nombre} <span className="text-slate-500 capitalize ml-1">({u.tipo})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-slate-400">Usa Cajas</label>
                    <button
                      onClick={() => setServicioUsaCajas(!servicioUsaCajas)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        servicioUsaCajas ? "bg-amber-500" : "bg-slate-700"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${
                          servicioUsaCajas ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddServicioDialogOpen(false)} className="border-white/10 text-slate-400 hover:text-white">Cancelar</Button>
                  <Button
                    onClick={handleCreateServicio}
                    disabled={creatingServicio || !servicioNombre.trim() || !servicioTipo || !servicioProcesoId}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
                  >
                    {creatingServicio ? "Creando..." : "Crear"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="bg-slate-900/60 border-white/10">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-slate-400 uppercase text-xs">Nombre</TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">Tipo</TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">Estado</TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">Proceso</TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">Dispositivos</TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">Ubicación</TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">Inicio</TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">Fin</TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empresa.servicios.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-slate-500 py-8">
                        No hay servicios para esta empresa
                      </TableCell>
                    </TableRow>
                  ) : empresa.servicios.map((s) => (
                    <TableRow key={s.id} className="border-white/5 hover:bg-white/[0.02]">
                      <TableCell className="text-white font-medium">{s.nombre}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-white/10 text-slate-300 text-xs capitalize">
                          {s.tipo.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${(estadoConfig[s.estado] ?? estadoConfig.planificado).class}`}>
                          {(estadoConfig[s.estado] ?? estadoConfig.planificado).label}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {s.proceso?.tipoProceso?.nombre ?? "-"}
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {(() => {
                          const summary = getOpenDeviceSummary(s.dispositivoServicios);
                          return (
                            <div className="flex flex-wrap gap-1">
                              {summary.pendientes > 0 && <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-xs">{summary.pendientes} Pendiente</Badge>}
                              {summary.activos > 0 && <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-xs">{summary.activos} Activo</Badge>}
                              {summary.total === 0 && <span className="text-slate-600 text-xs">Sin dispositivos</span>}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {s.ubicacion ? (
                          <span className="capitalize">{s.ubicacion.nombre}</span>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {formatDateTime(s.fechaInicio)}
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {s.fechaFin ? formatDateTime(s.fechaFin) : <span className="text-slate-500 text-xs">Sin cierre</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => router.push(`/admin/empresas/${empresaId}/servicios/${s.id}`)}
                            className="p-1.5 text-slate-500 hover:text-amber-400 hover:bg-amber-400/10 rounded transition-all"
                            title="Gestionar Lotes"
                          >
                            <Layers className="w-4 h-4" />
                          </button>
                          {s.estado === "planificado" && (
                            <button
                              onClick={() => handleStartServicio(s.id)}
                              disabled={startingServicioId === s.id}
                              className="p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-emerald-400/10 rounded transition-all disabled:opacity-50"
                              title="Iniciar servicio"
                            >
                              <PlayCircle className="w-4 h-4" />
                            </button>
                          )}
                          {s.estado === "en_curso" && (
                            <button
                              onClick={() => setTerminateServicioId(s.id)}
                              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-all"
                              title="Completar servicio"
                            >
                              <StopCircle className="w-4 h-4" />
                            </button>
                          )}
                          {s.estado === "completado" && (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                              <Lock className="w-3.5 h-3.5" />
                              Completado, no editable
                            </span>
                          )}
                          {s.estado === "cancelado" && (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                              <Lock className="w-3.5 h-3.5" />
                              Cancelado
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Diálogo confirmación terminar servicio */}
          <Dialog open={!!terminateServicioId} onOpenChange={(open) => { if (!open) setTerminateServicioId(null); }}>
            <DialogContent className="bg-slate-900 border-white/10 text-white">
              <DialogHeader>
                <DialogTitle className="text-red-400">Completar Servicio</DialogTitle>
              </DialogHeader>
              <p className="text-slate-400 text-sm py-2">
                Esta acción registrará la fecha de cierre, cerrará las asignaciones abiertas de dispositivos y dejará el servicio como no editable.
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTerminateServicioId(null)} className="border-white/10 text-slate-400 hover:text-white">
                  Cancelar
                </Button>
                <Button
                  onClick={handleTerminarServicio}
                  disabled={terminatingServicio}
                  className="bg-red-600 hover:bg-red-500 text-white font-semibold"
                >
                  {terminatingServicio ? "Completando..." : "Completar Servicio"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* UBICACIONES */}
        <TabsContent value="ubicaciones" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-slate-400 text-sm">{empresa.ubicaciones.length} ubicación(es) registradas</p>
            <Dialog open={addUbicacionDialogOpen} onOpenChange={setAddUbicacionDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Ubicación
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle>Nueva Ubicación</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm text-slate-400 mb-1.5 block">Nombre *</label>
                    <Input
                      value={ubicacionNombre}
                      onChange={(e) => setUbicacionNombre(e.target.value)}
                      placeholder="Ej: Campo Norte"
                      className="bg-slate-800/50 border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1.5 block">Tipo *</label>
                    <Select value={ubicacionTipo} onValueChange={setUbicacionTipo}>
                      <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10">
                        <SelectItem value="campo" className="text-white hover:bg-slate-800">Campo</SelectItem>
                        <SelectItem value="bodega" className="text-white hover:bg-slate-800">Bodega</SelectItem>
                        <SelectItem value="planta" className="text-white hover:bg-slate-800">Planta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-slate-400 mb-1.5 block">Latitud</label>
                      <Input
                        value={ubicacionLat}
                        onChange={(e) => setUbicacionLat(e.target.value)}
                        placeholder="-33.4569"
                        type="number"
                        step="any"
                        className="bg-slate-800/50 border-white/10 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-400 mb-1.5 block">Longitud</label>
                      <Input
                        value={ubicacionLng}
                        onChange={(e) => setUbicacionLng(e.target.value)}
                        placeholder="-70.6483"
                        type="number"
                        step="any"
                        className="bg-slate-800/50 border-white/10 text-white"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddUbicacionDialogOpen(false)} className="border-white/10 text-slate-400 hover:text-white">Cancelar</Button>
                  <Button
                    onClick={handleCreateUbicacion}
                    disabled={creatingUbicacion || !ubicacionNombre.trim() || !ubicacionTipo}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
                  >
                    {creatingUbicacion ? "Creando..." : "Crear"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="bg-slate-900/60 border-white/10">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-slate-400 uppercase text-xs">Nombre</TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">Tipo</TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">Coordenadas</TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empresa.ubicaciones.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-500 py-8">
                        No hay ubicaciones registradas para esta empresa
                      </TableCell>
                    </TableRow>
                  ) : empresa.ubicaciones.map((u) => (
                    <TableRow key={u.id} className="border-white/5 hover:bg-white/[0.02]">
                      <TableCell className="text-white font-medium">{u.nombre}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-white/10 text-slate-300 text-xs capitalize">
                          {u.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        {u.lat != null && u.lng != null
                          ? `${u.lat.toFixed(4)}, ${u.lng.toFixed(4)}`
                          : <span className="text-slate-600">—</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          onClick={() => handleDeleteUbicacion(u.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-all"
                          title="Eliminar ubicación"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
