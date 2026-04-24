"use client";

import React, { useContext, useEffect, useState } from "react";
import { AuthenticationContext } from "@/app/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings, Plus, ArrowRight, Trash2 } from "lucide-react";
import { EmpresaInvitationsPanel } from "@/components/app/EmpresaInvitationsPanel";

// ---------- Types ----------

interface TipoProceso {
  id: string;
  nombre: string;
  empresaId: string;
  createdAt: string;
}

interface WorkflowPaso {
  id: string;
  orden: number;
  tipoProcesoId: string;
  tipoProceso: TipoProceso;
}

interface Workflow {
  id: string;
  nombre: string;
  empresaId: string;
  createdAt: string;
  pasos: WorkflowPaso[];
}

// ---------- Main Page ----------

export default function ConfiguracionesPage() {
  const { data: authData, loading: authLoading } = useContext(AuthenticationContext);
  const isAdmin = authData?.rol_usuario === "administrador";
  const canManageInvitations = isAdmin || !!authData?.isSuperAdmin;

  const [tipos, setTipos] = useState<TipoProceso[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tipo dialog
  const [tipoDialogOpen, setTipoDialogOpen] = useState(false);
  const [newTipoNombre, setNewTipoNombre] = useState("");
  const [creatingTipo, setCreatingTipo] = useState(false);

  // Workflow dialog
  const [workflowDialogOpen, setWorkflowDialogOpen] = useState(false);
  const [newWorkflowNombre, setNewWorkflowNombre] = useState("");
  const [workflowPasos, setWorkflowPasos] = useState<
    { tipoProcesoId: string; orden: number }[]
  >([]);
  const [creatingWorkflow, setCreatingWorkflow] = useState(false);

  useEffect(() => {
    if (!authData?.empresaId) return;
    setLoading(true);
    setError(null);

    const eid = authData.empresaId;
    Promise.all([
      fetch(`/api/tipos-proceso?empresaId=${eid}`).then((r) => r.json()),
      fetch(`/api/workflows?empresaId=${eid}`).then((r) => r.json()),
    ])
      .then(([tiposData, workflowsData]: [TipoProceso[], Workflow[]]) => {
        setTipos(tiposData);
        setWorkflows(workflowsData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [authData?.empresaId]);

  // ── Tipo handlers ────────────────────────────────────────────────────────

  const handleCreateTipo = async () => {
    if (!newTipoNombre.trim() || !authData?.empresaId) return;
    setCreatingTipo(true);
    try {
      const res = await fetch("/api/tipos-proceso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaId: authData.empresaId,
          nombre: newTipoNombre.trim(),
        }),
      });
      if (!res.ok) throw new Error("Error al crear tipo de proceso");
      const created: TipoProceso = await res.json();
      setTipos((prev) => [...prev, created]);
      setNewTipoNombre("");
      setTipoDialogOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingTipo(false);
    }
  };

  // ── Workflow handlers ────────────────────────────────────────────────────

  const addPaso = () => {
    setWorkflowPasos((prev) => [
      ...prev,
      { tipoProcesoId: "", orden: prev.length + 1 },
    ]);
  };

  const removePaso = (idx: number) => {
    setWorkflowPasos((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((p, i) => ({ ...p, orden: i + 1 }))
    );
  };

  const updatePasoTipo = (idx: number, tipoProcesoId: string) => {
    setWorkflowPasos((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, tipoProcesoId } : p))
    );
  };

  const handleCreateWorkflow = async () => {
    if (!newWorkflowNombre.trim() || !authData?.empresaId) return;
    const validPasos = workflowPasos.filter((p) => p.tipoProcesoId);
    setCreatingWorkflow(true);
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaId: authData.empresaId,
          nombre: newWorkflowNombre.trim(),
          pasos: validPasos,
        }),
      });
      if (!res.ok) throw new Error("Error al crear workflow");
      const created: Workflow = await res.json();
      setWorkflows((prev) => [...prev, created]);
      setNewWorkflowNombre("");
      setWorkflowPasos([]);
      setWorkflowDialogOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingWorkflow(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400 text-sm animate-pulse">Cargando…</div>
      </div>
    );
  }

  if (!authData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400 text-sm">No estás autenticado.</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-slate-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Configuraciones</h1>
          <p className="text-slate-400 text-sm">{authData.empresaNombre ?? ""}</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-950/20 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <Tabs defaultValue="tipos">
        <TabsList className="bg-slate-800/60 border border-white/10">
          <TabsTrigger
            value="tipos"
            className="data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-950 text-slate-400"
          >
            Tipos de Proceso
          </TabsTrigger>
          <TabsTrigger
            value="workflows"
            className="data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-950 text-slate-400"
          >
            Flujos de Trabajo
          </TabsTrigger>
          {canManageInvitations && (
            <TabsTrigger
              value="invitaciones"
              className="data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-950 text-slate-400"
            >
              Invitaciones
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── Tipos de Proceso ─────────────────────────────────────────────── */}
        <TabsContent value="tipos" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Define los tipos de procesos productivos de tu empresa (ej. Plantación, Cosecha, Lavado).
            </p>
            {isAdmin && (
              <Button
                onClick={() => setTipoDialogOpen(true)}
                size="sm"
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold shrink-0"
              >
                <Plus className="w-4 h-4 mr-1" />
                Nuevo tipo
              </Button>
            )}
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-lg bg-slate-900/40 border border-white/5 animate-pulse" />
              ))}
            </div>
          ) : tipos.length === 0 ? (
            <Card className="bg-slate-900/40 border-white/10">
              <CardContent className="p-8 text-center text-slate-500">
                <p>No hay tipos de proceso definidos.</p>
                {isAdmin && (
                  <p className="text-sm mt-1">Crea el primero con el botón de arriba.</p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {tipos.map((tipo) => (
                <div
                  key={tipo.id}
                  className="flex items-center justify-between px-4 py-3 rounded-lg border border-white/5 bg-slate-900/40"
                >
                  <span className="text-sm font-medium text-white">{tipo.nombre}</span>
                  <span className="text-xs text-slate-600 font-mono">
                    {tipo.id.slice(-8)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Flujos de Trabajo ─────────────────────────────────────────────── */}
        <TabsContent value="workflows" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Define plantillas de flujo de trabajo ordenando tipos de proceso en secuencia.
            </p>
            {isAdmin && (
              <Button
                onClick={() => {
                  setNewWorkflowNombre("");
                  setWorkflowPasos([]);
                  setWorkflowDialogOpen(true);
                }}
                size="sm"
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold shrink-0"
                disabled={tipos.length === 0}
              >
                <Plus className="w-4 h-4 mr-1" />
                Nuevo flujo
              </Button>
            )}
          </div>

          {tipos.length === 0 && isAdmin && (
            <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/20 text-amber-400 text-xs">
              Primero debes crear al menos un tipo de proceso para definir flujos de trabajo.
            </div>
          )}

          {loading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 rounded-lg bg-slate-900/40 border border-white/5 animate-pulse" />
              ))}
            </div>
          ) : workflows.length === 0 ? (
            <Card className="bg-slate-900/40 border-white/10">
              <CardContent className="p-8 text-center text-slate-500">
                <p>No hay flujos de trabajo definidos.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {workflows.map((wf) => (
                <Card key={wf.id} className="bg-slate-900/40 border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-white">
                      {wf.nombre}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {wf.pasos.length === 0 ? (
                      <p className="text-xs text-slate-600">Sin pasos definidos.</p>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        {wf.pasos.map((paso, idx) => (
                          <React.Fragment key={paso.id}>
                            <Badge
                              variant="outline"
                              className="border-cyan-500/30 bg-cyan-950/20 text-cyan-300 text-xs"
                            >
                              {paso.orden}. {paso.tipoProceso.nombre}
                            </Badge>
                            {idx < wf.pasos.length - 1 && (
                              <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {canManageInvitations && authData.empresaId && (
          <TabsContent value="invitaciones" className="mt-4">
            <EmpresaInvitationsPanel
              empresaId={authData.empresaId}
              empresaNombre={authData.empresaNombre}
              canManage={canManageInvitations}
              isSuperAdmin={authData.isSuperAdmin}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* ── Dialog: Crear Tipo de Proceso ──────────────────────────────────── */}
      <Dialog open={tipoDialogOpen} onOpenChange={setTipoDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Nuevo tipo de proceso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm text-slate-400">Nombre</label>
              <Input
                placeholder="Ej. Plantación, Cosecha, Lavado…"
                value={newTipoNombre}
                onChange={(e) => setNewTipoNombre(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateTipo();
                }}
                className="bg-slate-800 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-cyan-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setTipoDialogOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                disabled={creatingTipo || !newTipoNombre.trim()}
                onClick={handleCreateTipo}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold"
              >
                {creatingTipo ? "Creando…" : "Crear"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Crear Workflow ──────────────────────────────────────────── */}
      <Dialog open={workflowDialogOpen} onOpenChange={setWorkflowDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Nuevo flujo de trabajo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm text-slate-400">Nombre del flujo</label>
              <Input
                placeholder="Ej. Engorde Bulbos, Proceso Comercial…"
                value={newWorkflowNombre}
                onChange={(e) => setNewWorkflowNombre(e.target.value)}
                className="bg-slate-800 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-cyan-500"
              />
            </div>

            {/* Pasos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-400">Pasos (en orden)</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addPaso}
                  className="text-cyan-400 hover:text-cyan-300 h-7 px-2 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Agregar paso
                </Button>
              </div>

              {workflowPasos.length === 0 ? (
                <p className="text-xs text-slate-600 py-2">
                  Sin pasos — el flujo puede crearse vacío.
                </p>
              ) : (
                <div className="space-y-2">
                  {workflowPasos.map((paso, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 w-5 shrink-0 text-right">
                        {idx + 1}.
                      </span>
                      <Select
                        value={paso.tipoProcesoId}
                        onValueChange={(v) => updatePasoTipo(idx, v)}
                      >
                        <SelectTrigger className="flex-1 bg-slate-800 border-white/10 text-white focus:ring-cyan-500 h-8 text-sm">
                          <SelectValue placeholder="Tipo de proceso…" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-white/10 text-white">
                          {tipos.map((t) => (
                            <SelectItem
                              key={t.id}
                              value={t.id}
                              className="focus:bg-slate-700 focus:text-white"
                            >
                              {t.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePaso(idx)}
                        className="h-8 w-8 p-0 text-slate-600 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setWorkflowDialogOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                disabled={creatingWorkflow || !newWorkflowNombre.trim()}
                onClick={handleCreateWorkflow}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold"
              >
                {creatingWorkflow ? "Creando…" : "Crear"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
