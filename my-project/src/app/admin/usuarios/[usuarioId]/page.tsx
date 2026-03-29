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
import { ArrowLeft, User, Shield, Building2, Trash2, Plus, AlertTriangle } from "lucide-react";

interface UsuarioDetail {
  id: string;
  nombre: string;
  correo: string;
  isSuperAdmin: boolean;
  createdAt: string;
  empresaUsuarios: Array<{
    id: string;
    rol: string;
    empresa: { id: string; nombre: string };
  }>;
}

export default function UsuarioDetailPage() {
  const { usuarioId } = useParams<{ usuarioId: string }>();
  const router = useRouter();
  const [usuario, setUsuario] = useState<UsuarioDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [saving, setSaving] = useState(false);

  const [allEmpresas, setAllEmpresas] = useState<{ id: string; nombre: string }[]>([]);
  const [addEmpDialogOpen, setAddEmpDialogOpen] = useState(false);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState("");
  const [selectedRol, setSelectedRol] = useState("usuario");
  const [addingEmp, setAddingEmp] = useState(false);

  // Delete challenge state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteChallenge, setDeleteChallenge] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchUsuario();
    fetchAllEmpresas();
  }, [usuarioId]);

  const fetchUsuario = async () => {
    try {
      const res = await axios.get(`/api/admin/usuarios/${usuarioId}`);
      setUsuario(res.data);
      setNombre(res.data.nombre);
      setCorreo(res.data.correo);
      setIsSuperAdmin(res.data.isSuperAdmin);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllEmpresas = async () => {
    try {
      const res = await axios.get("/api/admin/empresas");
      setAllEmpresas(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`/api/admin/usuarios/${usuarioId}`, { nombre, correo, isSuperAdmin });
      setUsuario((prev) => prev ? { ...prev, nombre, correo, isSuperAdmin } : prev);
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddEmpresa = async () => {
    if (!selectedEmpresaId) return;
    setAddingEmp(true);
    try {
      await axios.post(`/api/admin/empresas/${selectedEmpresaId}/usuarios`, {
        usuarioId,
        rol: selectedRol,
      });
      setAddEmpDialogOpen(false);
      setSelectedEmpresaId("");
      setSelectedRol("usuario");
      await fetchUsuario();
    } catch (error) {
      console.error(error);
    } finally {
      setAddingEmp(false);
    }
  };

  const handleRemoveEmpresa = async (empresaId: string) => {
    try {
      await axios.delete(`/api/admin/empresas/${empresaId}/usuarios`, {
        data: { usuarioId },
      });
      await fetchUsuario();
    } catch (error) {
      console.error(error);
    }
  };

  const handleChangeRol = async (empresaId: string, newRol: string) => {
    try {
      await axios.put(`/api/admin/empresas/${empresaId}/usuarios`, {
        usuarioId,
        rol: newRol,
      });
      await fetchUsuario();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteUsuario = async () => {
    setDeleting(true);
    try {
      await axios.delete(`/api/admin/usuarios/${usuarioId}`);
      router.push("/admin/usuarios");
    } catch (error) {
      console.error(error);
      setDeleting(false);
    }
  };

  const expectedDeleteText = usuario
    ? `Deseo eliminar a ${usuario.nombre} y toda su información`
    : "";

  if (loading) {
    return (
      <div className="w-full max-w-3xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-slate-800 animate-pulse rounded" />
        <div className="h-64 bg-slate-800 animate-pulse rounded-lg" />
        <div className="h-64 bg-slate-800 animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!usuario) {
    return <div className="text-center py-20 text-slate-400">Usuario no encontrado.</div>;
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/admin/usuarios")}
          className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <User className="w-6 h-6 text-amber-400" />
            {usuario.nombre}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-slate-400 text-sm">{usuario.correo}</span>
            {usuario.isSuperAdmin && (
              <Badge className="bg-amber-500/20 text-amber-400 text-xs gap-1">
                <Shield className="w-3 h-3" /> Super Admin
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <Card className="bg-slate-900/60 border-white/10">
        <CardHeader>
          <CardTitle className="text-white text-lg">Información</CardTitle>
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
            <label className="text-sm text-slate-400 mb-1.5 block">Correo</label>
            <Input
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className="bg-slate-800/50 border-white/10 text-white max-w-sm"
              type="email"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-400">Super Administrador</label>
            <button
              onClick={() => setIsSuperAdmin(!isSuperAdmin)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                isSuperAdmin ? "bg-amber-500" : "bg-slate-700"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${
                  isSuperAdmin ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            {isSuperAdmin && (
              <span className="text-xs text-amber-400 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Acceso completo al panel admin
              </span>
            )}
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
          >
            {saving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </CardContent>
      </Card>

      {/* Empresas */}
      <Card className="bg-slate-900/60 border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-lg">Empresas</CardTitle>
            <Dialog open={addEmpDialogOpen} onOpenChange={setAddEmpDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Agregar
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle>Agregar a Empresa</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm text-slate-400 mb-1.5 block">Empresa</label>
                    <Select value={selectedEmpresaId} onValueChange={setSelectedEmpresaId}>
                      <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                        <SelectValue placeholder="Seleccionar empresa" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10">
                        {allEmpresas
                          .filter((e) => !usuario.empresaUsuarios.some((eu) => eu.empresa.id === e.id))
                          .map((e) => (
                            <SelectItem key={e.id} value={e.id} className="text-white hover:bg-slate-800">
                              {e.nombre}
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
                  <Button variant="outline" onClick={() => setAddEmpDialogOpen(false)} className="border-white/10 text-slate-400 hover:text-white">Cancelar</Button>
                  <Button onClick={handleAddEmpresa} disabled={addingEmp || !selectedEmpresaId} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">
                    {addingEmp ? "Agregando..." : "Agregar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {usuario.empresaUsuarios.length === 0 ? (
            <p className="text-slate-500 text-sm py-4 text-center">
              Este usuario no pertenece a ninguna empresa.
            </p>
          ) : (
            <div className="space-y-2">
              {usuario.empresaUsuarios.map((eu) => (
                <div
                  key={eu.id}
                  className="flex items-center justify-between p-3 bg-slate-800/40 rounded-lg border border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span className="text-white text-sm">{eu.empresa.nombre}</span>
                    <Select
                      value={eu.rol}
                      onValueChange={(newRol) => handleChangeRol(eu.empresa.id, newRol)}
                    >
                      <SelectTrigger className="w-[150px] h-7 bg-slate-800/50 border-white/10 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10">
                        <SelectItem value="usuario" className="text-white hover:bg-slate-800 text-xs">Usuario</SelectItem>
                        <SelectItem value="administrador" className="text-white hover:bg-slate-800 text-xs">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <button
                    onClick={() => handleRemoveEmpresa(eu.empresa.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete User */}
      <Card className="bg-red-950/20 border-red-500/20">
        <CardHeader>
          <CardTitle className="text-red-400 text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Zona Peligrosa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 text-sm mb-4">
            Eliminar este usuario borrará su cuenta y todas sus asignaciones permanentemente.
          </p>
          <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
            setDeleteDialogOpen(open);
            if (!open) setDeleteChallenge("");
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-950/30 hover:text-red-300">
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar Usuario
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-white/10 text-white">
              <DialogHeader>
                <DialogTitle className="text-red-400">Eliminar Usuario</DialogTitle>
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
                  onClick={handleDeleteUsuario}
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
    </div>
  );
}
