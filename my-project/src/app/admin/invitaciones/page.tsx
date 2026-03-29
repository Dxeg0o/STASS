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
import { Plus, Trash2, Link2, Copy, Check } from "lucide-react";
import { motion } from "framer-motion";

interface Invitation {
  id: string;
  token: string;
  empresaId: string;
  rol: string;
  expiresAt: string | null;
  usedAt: string | null;
  createdAt: string;
  empresa: { id: string; nombre: string };
}

export default function InvitacionesPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [allEmpresas, setAllEmpresas] = useState<{ id: string; nombre: string }[]>([]);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState("");
  const [selectedRol, setSelectedRol] = useState("usuario");
  const [expiresAt, setExpiresAt] = useState("");

  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      const res = await axios.get("/api/admin/invitations");
      setInvitations(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmpresas = async () => {
    try {
      const res = await axios.get("/api/admin/empresas");
      setAllEmpresas(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreate = async () => {
    if (!selectedEmpresaId || !selectedRol) return;
    setCreating(true);
    try {
      await axios.post("/api/admin/invitations", {
        empresaId: selectedEmpresaId,
        rol: selectedRol,
        expiresAt: expiresAt || null,
      });
      setDialogOpen(false);
      setSelectedEmpresaId("");
      setSelectedRol("usuario");
      setExpiresAt("");
      await fetchInvitations();
    } catch (error) {
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`/api/admin/invitations/${id}`);
      await fetchInvitations();
    } catch (error) {
      console.error(error);
    }
  };

  const copyLink = (invitation: Invitation) => {
    const link = `${window.location.origin}/registro-invitacion?token=${invitation.token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(invitation.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatus = (inv: Invitation) => {
    if (inv.usedAt) return { label: "Utilizada", class: "bg-slate-700/50 text-slate-400" };
    if (inv.expiresAt && new Date(inv.expiresAt) < new Date()) return { label: "Expirada", class: "bg-red-500/20 text-red-400" };
    return { label: "Activa", class: "bg-emerald-500/20 text-emerald-400" };
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Invitaciones
          </h1>
          <p className="text-slate-400 mt-1">
            Crea links de invitación para que nuevos usuarios se registren con empresa y rol predefinidos.
          </p>
        </div>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (open) fetchEmpresas();
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Invitación
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Nueva Invitación</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">Empresa *</label>
                <Select value={selectedEmpresaId} onValueChange={setSelectedEmpresaId}>
                  <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                    <SelectValue placeholder="Seleccionar empresa" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    {allEmpresas.map((e) => (
                      <SelectItem key={e.id} value={e.id} className="text-white hover:bg-slate-800">
                        {e.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">Rol *</label>
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
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">Fecha de Vencimiento (opcional)</label>
                <Input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="bg-slate-800/50 border-white/10 text-white"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-white/10 text-slate-400 hover:text-white">
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={creating || !selectedEmpresaId}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
              >
                {creating ? "Creando..." : "Crear Invitación"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : invitations.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Link2 className="w-10 h-10 mx-auto mb-3 text-slate-700" />
          <p className="text-lg font-medium">No hay invitaciones</p>
          <p className="text-sm mt-1">
            Crea tu primera invitación para comenzar.
          </p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="bg-slate-900/60 border-white/10">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-slate-400 uppercase text-xs">Empresa</TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">Rol</TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">Estado</TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">Vencimiento</TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">Creada</TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((inv) => {
                    const status = getStatus(inv);
                    return (
                      <TableRow key={inv.id} className="border-white/5 hover:bg-white/[0.02]">
                        <TableCell className="text-white font-medium">{inv.empresa.nombre}</TableCell>
                        <TableCell>
                          <Badge className={inv.rol === "administrador" ? "bg-amber-500/20 text-amber-400 text-xs" : "bg-slate-700/50 text-slate-300 text-xs"}>
                            {inv.rol}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${status.class} text-xs`}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-400 text-sm">
                          {inv.expiresAt
                            ? new Date(inv.expiresAt).toLocaleString("es-CL")
                            : "Sin vencimiento"}
                        </TableCell>
                        <TableCell className="text-slate-400 text-sm">
                          {new Date(inv.createdAt).toLocaleDateString("es-CL")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!inv.usedAt && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-cyan-500/20 text-cyan-400 hover:bg-cyan-950/30"
                                onClick={() => copyLink(inv)}
                              >
                                {copiedId === inv.id ? (
                                  <><Check className="w-3 h-3 mr-1" /> Copiado</>
                                ) : (
                                  <><Copy className="w-3 h-3 mr-1" /> Copiar Link</>
                                )}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-950/30"
                              onClick={() => handleDelete(inv.id)}
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
      )}
    </div>
  );
}
