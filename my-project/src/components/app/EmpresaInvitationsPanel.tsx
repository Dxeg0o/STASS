"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, Copy, Link2, Plus, Trash2 } from "lucide-react";

interface Invitation {
  id: string;
  token?: string;
  rol: string;
  correoInvitado: string | null;
  expiresAt: string | null;
  usedAt: string | null;
  createdAt: string;
}

interface EmpresaInvitationsPanelProps {
  empresaId: string;
  empresaNombre: string | null;
  canManage: boolean;
  isSuperAdmin: boolean;
}

export function EmpresaInvitationsPanel({
  empresaId,
  empresaNombre,
  canManage,
  isSuperAdmin,
}: EmpresaInvitationsPanelProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedRol, setSelectedRol] = useState("usuario");
  const [expiresAt, setExpiresAt] = useState("");
  const [correoInvitado, setCorreoInvitado] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/admin/invitations?empresaId=${empresaId}`);
      setInvitations(res.data);
    } catch (error) {
      console.error(error);
      toast.error("No se pudieron cargar las invitaciones");
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    void fetchInvitations();
  }, [fetchInvitations]);

  const handleCreate = async () => {
    if (!selectedRol) return;
    if (!isSuperAdmin && !correoInvitado.trim()) {
      toast.error("Debes ingresar el correo del invitado");
      return;
    }

    setCreating(true);
    try {
      await axios.post("/api/admin/invitations", {
        empresaId,
        rol: selectedRol,
        expiresAt: expiresAt || null,
        correoInvitado: correoInvitado.trim() || null,
      });

      setDialogOpen(false);
      setSelectedRol("usuario");
      setExpiresAt("");
      setCorreoInvitado("");
      await fetchInvitations();
      toast.success("Invitación creada correctamente");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error("Error al crear la invitación");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`/api/admin/invitations/${id}`);
      await fetchInvitations();
      toast.success("Invitación eliminada");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error("Error al eliminar la invitación");
      }
    }
  };

  const copyLink = (invitation: Invitation) => {
    if (!invitation.token) return;
    const link = `${window.location.origin}/registro-invitacion?token=${invitation.token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(invitation.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatus = (invitation: Invitation) => {
    if (invitation.usedAt) {
      return { label: "Utilizada", className: "bg-slate-700/50 text-slate-400" };
    }
    if (
      invitation.expiresAt &&
      new Date(invitation.expiresAt).getTime() < Date.now()
    ) {
      return { label: "Expirada", className: "bg-red-500/20 text-red-400" };
    }

    return { label: "Activa", className: "bg-emerald-500/20 text-emerald-400" };
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Invitaciones</h3>
          <p className="mt-1 text-sm text-slate-400">
            Gestiona el acceso a {empresaNombre ?? "esta empresa"} con enlaces de un solo uso.
          </p>
        </div>

        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-cyan-500 font-semibold text-slate-950 hover:bg-cyan-400">
                <Plus className="mr-2 h-4 w-4" />
                Nueva invitación
              </Button>
            </DialogTrigger>
            <DialogContent className="border-white/10 bg-slate-900 text-white">
              <DialogHeader>
                <DialogTitle>Nueva invitación</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="mb-1.5 block text-sm text-slate-400">Rol *</label>
                  <Select value={selectedRol} onValueChange={setSelectedRol}>
                    <SelectTrigger className="border-white/10 bg-slate-800/50 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-slate-900">
                      <SelectItem value="usuario" className="text-white hover:bg-slate-800">
                        Usuario
                      </SelectItem>
                      <SelectItem
                        value="administrador"
                        className="text-white hover:bg-slate-800"
                      >
                        Administrador
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-slate-400">
                    Correo del invitado {!isSuperAdmin ? "*" : "(opcional)"}
                  </label>
                  <Input
                    type="email"
                    value={correoInvitado}
                    onChange={(e) => setCorreoInvitado(e.target.value)}
                    placeholder="nombre@empresa.com"
                    className="border-white/10 bg-slate-800/50 text-white"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    {isSuperAdmin
                      ? "Si lo ingresas, enviaremos la invitación por correo. También podrás copiar el enlace manualmente."
                      : "Como administrador de empresa, la invitación debe enviarse por correo y el enlace no se mostrará en pantalla."}
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-slate-400">
                    Fecha de vencimiento (opcional)
                  </label>
                  <Input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="border-white/10 bg-slate-800/50 text-white"
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
                  disabled={creating || (!isSuperAdmin && !correoInvitado.trim())}
                  className="bg-cyan-500 font-semibold text-slate-950 hover:bg-cyan-400"
                >
                  {creating ? "Creando..." : "Crear invitación"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-14 animate-pulse rounded-lg border border-white/5 bg-slate-900/40"
            />
          ))}
        </div>
      ) : invitations.length === 0 ? (
        <Card className="border-white/10 bg-slate-900/40">
          <CardContent className="py-12 text-center">
            <Link2 className="mx-auto mb-3 h-10 w-10 text-slate-700" />
            <p className="text-lg font-medium text-slate-300">No hay invitaciones activas</p>
            <p className="mt-1 text-sm text-slate-500">
              Crea una invitación para incorporar nuevos usuarios a la empresa.
            </p>
          </CardContent>
        </Card>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="border-white/10 bg-slate-900/40">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-xs uppercase text-slate-400">Correo</TableHead>
                    <TableHead className="text-xs uppercase text-slate-400">Rol</TableHead>
                    <TableHead className="text-xs uppercase text-slate-400">Estado</TableHead>
                    <TableHead className="text-xs uppercase text-slate-400">Vencimiento</TableHead>
                    <TableHead className="text-xs uppercase text-slate-400">Creada</TableHead>
                    <TableHead className="text-right text-xs uppercase text-slate-400">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => {
                    const status = getStatus(invitation);

                    return (
                      <TableRow
                        key={invitation.id}
                        className="border-white/5 hover:bg-white/[0.02]"
                      >
                        <TableCell className="text-sm text-slate-300">
                          {invitation.correoInvitado || "Sin correo"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              invitation.rol === "administrador"
                                ? "bg-amber-500/20 text-amber-400 text-xs"
                                : "bg-slate-700/50 text-slate-300 text-xs"
                            }
                          >
                            {invitation.rol}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${status.className} text-xs`}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-400">
                          {invitation.expiresAt
                            ? new Date(invitation.expiresAt).toLocaleString("es-CL")
                            : "Sin vencimiento"}
                        </TableCell>
                        <TableCell className="text-sm text-slate-400">
                          {new Date(invitation.createdAt).toLocaleDateString("es-CL")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isSuperAdmin && invitation.token && !invitation.usedAt && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-cyan-500/20 text-cyan-400 hover:bg-cyan-950/30"
                                onClick={() => copyLink(invitation)}
                              >
                                {copiedId === invitation.id ? (
                                  <>
                                    <Check className="mr-1 h-3 w-3" />
                                    Copiado
                                  </>
                                ) : (
                                  <>
                                    <Copy className="mr-1 h-3 w-3" />
                                    Copiar link
                                  </>
                                )}
                              </Button>
                            )}
                            {canManage && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-500/20 text-red-400 hover:bg-red-950/30 hover:text-red-300"
                                onClick={() => handleDelete(invitation.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
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
        </motion.div>
      )}
    </div>
  );
}
