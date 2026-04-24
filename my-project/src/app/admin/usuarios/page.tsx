"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Users, Plus, Search } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface UsuarioEmpresa {
  empresa: {
    id: string;
    nombre: string;
  };
  rol: string;
}

interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  isSuperAdmin: boolean;
  createdAt: string;
  empresaUsuarios: UsuarioEmpresa[];
}

export default function UsuariosPage() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      const res = await axios.get("/api/admin/usuarios");
      setUsuarios(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return usuarios;
    const q = search.toLowerCase();
    return usuarios.filter(
      (u) =>
        u.nombre.toLowerCase().includes(q) ||
        u.correo.toLowerCase().includes(q)
    );
  }, [usuarios, search]);

  const handleCreate = async () => {
    if (!nombre.trim() || !correo.trim() || !password.trim()) return;
    setCreating(true);
    try {
      await axios.post("/api/admin/usuarios", {
        nombre,
        correo,
        password,
        isSuperAdmin: true,
      });
      setNombre("");
      setCorreo("");
      setPassword("");
      setDialogOpen(false);
      setLoading(true);
      await fetchUsuarios();
      toast.success("Superadmin creado correctamente");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error("Error al crear el usuario");
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Usuarios
          </h1>
          <p className="text-slate-400 mt-1">
            Gestiona usuarios e identifica las cuentas con acceso de superadmin.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Superadmin
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Nueva Cuenta Superadmin</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-slate-400">
                Los usuarios operativos se incorporan solo por invitación. Desde aquí solo se crean cuentas superadmin.
              </p>
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">
                  Nombre
                </label>
                <Input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre completo"
                  className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">
                  Correo
                </label>
                <Input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">
                  Contrase&ntilde;a
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contrase&ntilde;a"
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
                disabled={
                  creating ||
                  !nombre.trim() ||
                  !correo.trim() ||
                  !password.trim()
                }
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
              >
                {creating ? "Creando..." : "Crear Superadmin"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o correo..."
          className="pl-10 bg-slate-900/60 border-white/10 text-white placeholder:text-slate-600"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-14 rounded-lg bg-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Users className="w-10 h-10 mx-auto mb-3 text-slate-700" />
          <p className="text-lg font-medium">No se encontraron usuarios</p>
          <p className="text-sm mt-1">
            {search
              ? "Intenta con otro t&eacute;rmino de b&uacute;squeda."
              : "Crea tu primer usuario para comenzar."}
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
                      Correo
                    </TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">
                      Empresas
                    </TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs text-center">
                      Super Admin
                    </TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">
                      Creado
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((usuario) => (
                    <TableRow
                      key={usuario.id}
                      className="border-white/5 hover:bg-white/[0.02] cursor-pointer transition-colors"
                      onClick={() =>
                        router.push(`/admin/usuarios/${usuario.id}`)
                      }
                    >
                      <TableCell className="text-white font-medium">
                        {usuario.nombre}
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {usuario.correo}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {usuario.empresaUsuarios.length === 0 ? (
                            <span className="text-slate-600 text-xs">
                              Sin empresas
                            </span>
                          ) : (
                            usuario.empresaUsuarios.map((ue) => (
                              <Badge
                                key={ue.empresa.id}
                                variant="outline"
                                className="border-white/10 text-slate-300 text-xs"
                              >
                                {ue.empresa.nombre}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {usuario.isSuperAdmin && (
                          <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Admin
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {new Date(usuario.createdAt).toLocaleDateString(
                          "es-CL"
                        )}
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
