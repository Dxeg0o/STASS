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
import { Building2, Plus, Search } from "lucide-react";
import { motion } from "framer-motion";

interface Empresa {
  id: string;
  nombre: string;
  pais: string;
  createdAt: string;
  usuarioCount: number;
  procesoCount: number;
  servicioCount: number;
}

export default function EmpresasPage() {
  const router = useRouter();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [pais, setPais] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchEmpresas();
  }, []);

  const fetchEmpresas = async () => {
    try {
      const res = await axios.get("/api/admin/empresas");
      setEmpresas(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return empresas;
    const q = search.toLowerCase();
    return empresas.filter((e) => e.nombre.toLowerCase().includes(q));
  }, [empresas, search]);

  const handleCreate = async () => {
    if (!nombre.trim()) return;
    setCreating(true);
    try {
      await axios.post("/api/admin/empresas", { nombre, pais });
      setNombre("");
      setPais("");
      setDialogOpen(false);
      setLoading(true);
      await fetchEmpresas();
    } catch (error) {
      console.error(error);
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
            Empresas
          </h1>
          <p className="text-slate-400 mt-1">
            Gestiona las empresas registradas en el sistema.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Empresa
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Nueva Empresa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">
                  Nombre
                </label>
                <Input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre de la empresa"
                  className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">
                  Pa&iacute;s
                </label>
                <Input
                  value={pais}
                  onChange={(e) => setPais(e.target.value)}
                  placeholder="Pa&iacute;s"
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
                disabled={creating || !nombre.trim()}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
              >
                {creating ? "Creando..." : "Crear"}
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
          placeholder="Buscar empresa..."
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
          <Building2 className="w-10 h-10 mx-auto mb-3 text-slate-700" />
          <p className="text-lg font-medium">No se encontraron empresas</p>
          <p className="text-sm mt-1">
            {search
              ? "Intenta con otro t&eacute;rmino de b&uacute;squeda."
              : "Crea tu primera empresa para comenzar."}
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Card className="bg-slate-900/60 border-white/10">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-slate-400 uppercase text-xs">
                      Nombre
                    </TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">
                      Pa&iacute;s
                    </TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs text-center">
                      Usuarios
                    </TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs text-center">
                      Procesos
                    </TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs text-center">
                      Servicios
                    </TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">
                      Creada
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((empresa) => (
                    <TableRow
                      key={empresa.id}
                      className="border-white/5 hover:bg-white/[0.02] cursor-pointer transition-colors"
                      onClick={() =>
                        router.push(`/admin/empresas/${empresa.id}`)
                      }
                    >
                      <TableCell className="text-white font-medium">
                        {empresa.nombre}
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {empresa.pais}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className="border-white/10 text-slate-300"
                        >
                          {empresa.usuarioCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className="border-white/10 text-slate-300"
                        >
                          {empresa.procesoCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className="border-white/10 text-slate-300"
                        >
                          {empresa.servicioCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {new Date(empresa.createdAt).toLocaleDateString(
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
