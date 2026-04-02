"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { ArrowLeft, Plus, Trash2, CheckSquare, Square, Layers } from "lucide-react";

// ── Types ────────────────────────────────────────────────────

interface Lote {
  id: string;
  codigoLote?: string | null;
  fechaCreacion: string;
  variedadId?: string | null;
  variedadNombre?: string | null;
  variedadTipo?: string | null;
  productoNombre?: string | null;
}

interface Variedad {
  id: string;
  nombre: string;
}

interface Producto {
  id: string;
  nombre: string;
  variedades: Variedad[];
}

interface ServicioInfo {
  id: string;
  nombre: string;
  tipo: string;
  fechaInicio: string;
  fechaFin: string | null;
  proceso?: { tipoProceso?: { nombre: string } | null } | null;
  ubicacion?: { nombre: string; tipo: string } | null;
}

const TIPO_LABELS: Record<string, string> = {
  linea_conteo: "Línea de Conteo",
  maquina_plantacion: "Máquina de Plantación",
  estacion_calidad: "Estación de Calidad",
};

// ── Component ────────────────────────────────────────────────

export default function AdminServicioLotesPage() {
  const params = useParams<{ empresaId: string; servicioId: string }>();
  const router = useRouter();
  const { empresaId, servicioId } = params;

  // Data
  const [servicioInfo, setServicioInfo] = useState<ServicioInfo | null>(null);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);

  // Search
  const [search, setSearch] = useState("");

  // Create dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creationMode, setCreationMode] = useState<"individual" | "masivo">("individual");
  const [selectedProductoId, setSelectedProductoId] = useState("");
  const [selectedVariedadId, setSelectedVariedadId] = useState("");
  const [bulkQuantity, setBulkQuantity] = useState(10);
  const [creating, setCreating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<number | null>(null);
  const [codigoLoteInput, setCodigoLoteInput] = useState("");

  // Selection mode
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Fetch data ──────────────────────────────────────────────

  useEffect(() => {
    if (!servicioId || !empresaId) return;
    setLoading(true);

    Promise.all([
      axios.get(`/api/admin/empresas/${empresaId}`),
      axios.get(`/api/admin/servicios/${servicioId}/lotes`),
      axios.get("/api/admin/productos"),
    ])
      .then(([empresaRes, lotesRes, productosRes]) => {
        // Find the service in empresa data
        const srv = empresaRes.data.servicios?.find(
          (s: ServicioInfo) => s.id === servicioId
        );
        setServicioInfo(srv ?? null);
        setLotes(lotesRes.data);
        setProductos(productosRes.data);
      })
      .catch(() => toast.error("Error al cargar datos"))
      .finally(() => setLoading(false));
  }, [servicioId, empresaId]);

  // ── Filtered lotes ──────────────────────────────────────────

  const filteredLotes = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return lotes;
    return lotes.filter(
      (l) =>
        l.id.toLowerCase().includes(term) ||
        (l.codigoLote ?? "").toLowerCase().includes(term) ||
        (l.variedadTipo ?? "").toLowerCase().includes(term) ||
        l.variedadNombre?.toLowerCase().includes(term) ||
        l.productoNombre?.toLowerCase().includes(term)
    );
  }, [lotes, search]);

  // ── Varieties for selected product ──────────────────────────

  const variedadesForSelected = useMemo(() => {
    if (!selectedProductoId) return [];
    return productos.find((p) => p.id === selectedProductoId)?.variedades ?? [];
  }, [productos, selectedProductoId]);

  // ── Handlers ────────────────────────────────────────────────

  const handleProductoChange = (id: string) => {
    setSelectedProductoId(id);
    setSelectedVariedadId("");
  };

  const resetDialog = () => {
    setSelectedProductoId("");
    setSelectedVariedadId("");
    setBulkQuantity(10);
    setBulkProgress(null);
    setCreationMode("individual");
    setCodigoLoteInput("");
  };

  const handleCreate = async () => {
    const cantidad = creationMode === "masivo" ? bulkQuantity : 1;
    setCreating(true);
    if (creationMode === "masivo") setBulkProgress(10);

    try {
      const res = await axios.post(`/api/admin/servicios/${servicioId}/lotes`, {
        variedadId: selectedVariedadId || undefined,
        cantidad,
        codigoLote: creationMode === "individual" ? (codigoLoteInput.trim() || undefined) : undefined,
      });

      if (creationMode === "masivo") setBulkProgress(90);

      const { created, lotes: newLotes } = res.data;
      setLotes((prev) => [...newLotes, ...prev]);
      setDialogOpen(false);
      resetDialog();

      if (cantidad === 1) {
        toast.success("Lote creado correctamente");
      } else {
        toast.success(`Se crearon ${created} lotes correctamente`);
      }
    } catch {
      toast.error("Error al crear lotes");
    } finally {
      setCreating(false);
      setBulkProgress(null);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredLotes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLotes.map((l) => l.id)));
    }
  };

  const handleExitSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleDelete = async () => {
    const ids = Array.from(selectedIds);
    setDeleting(true);
    try {
      await axios.delete(`/api/admin/servicios/${servicioId}/lotes`, {
        data: { loteIds: ids },
      });
      setLotes((prev) => prev.filter((l) => !selectedIds.has(l.id)));
      setSelectedIds(new Set());
      setDeleteDialogOpen(false);
      setSelectionMode(false);
      toast.success(`Se eliminaron ${ids.length} lote(s)`);
    } catch (err: unknown) {
      const error = err as { response?: { status?: number; data?: { blockedLoteIds?: string[] } } };
      if (error.response?.status === 409) {
        const blocked = error.response.data?.blockedLoteIds ?? [];
        toast.error(
          `${blocked.length} lote(s) tienen sesiones activas y no pueden eliminarse`
        );
      } else {
        toast.error("Error al eliminar lotes");
      }
    } finally {
      setDeleting(false);
    }
  };

  // ── Loading / Error ─────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="h-8 w-64 bg-slate-800 animate-pulse rounded" />
        <div className="h-48 bg-slate-800/40 animate-pulse rounded-lg" />
        <div className="h-96 bg-slate-800/40 animate-pulse rounded-lg" />
      </div>
    );
  }

  const allSelected =
    filteredLotes.length > 0 && selectedIds.size === filteredLotes.length;

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push(`/admin/empresas/${empresaId}`)}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a empresa
      </button>

      {/* Service header */}
      {servicioInfo && (
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <Layers className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-bold text-white">{servicioInfo.nombre}</h1>
            <Badge
              variant="outline"
              className="border-amber-500/40 text-amber-400 text-xs"
            >
              {TIPO_LABELS[servicioInfo.tipo] ?? servicioInfo.tipo}
            </Badge>
            {!servicioInfo.fechaFin && (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-xs">
                Activo
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-400">
            {servicioInfo.proceso?.tipoProceso?.nombre && (
              <span>Proceso: {servicioInfo.proceso.tipoProceso.nombre}</span>
            )}
            {servicioInfo.ubicacion && (
              <span>
                Ubicación: {servicioInfo.ubicacion.nombre} ({servicioInfo.ubicacion.tipo})
              </span>
            )}
            <span>
              Desde {format(new Date(servicioInfo.fechaInicio), "dd/MM/yyyy")}
              {servicioInfo.fechaFin
                ? ` — Hasta ${format(new Date(servicioInfo.fechaFin), "dd/MM/yyyy")}`
                : ""}
            </span>
          </div>
        </div>
      )}

      {/* Lotes management */}
      <Card className="bg-slate-900/60 border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-lg text-white">
              Lotes del servicio
              <span className="text-slate-500 font-normal ml-2 text-sm">
                ({lotes.length})
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              {selectionMode ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExitSelection}
                    className="border-white/10 text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    disabled={selectedIds.size === 0}
                    onClick={() => setDeleteDialogOpen(true)}
                    className="bg-red-600 hover:bg-red-500 text-white font-semibold"
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    Eliminar ({selectedIds.size})
                  </Button>
                </>
              ) : (
                <>
                  {lotes.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectionMode(true)}
                      className="border-white/10 text-slate-400 hover:text-white"
                    >
                      Gestionar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => setDialogOpen(true)}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Crear Lotes
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <Input
            placeholder="Buscar por ID, variedad o producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500"
          />

          {/* Table */}
          {filteredLotes.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Layers className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium">No hay lotes</p>
              <p className="text-sm mt-1">
                Crea lotes de forma individual o masiva para comenzar
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    {selectionMode && (
                      <TableHead className="w-10">
                        <button
                          onClick={handleSelectAll}
                          className="text-slate-400 hover:text-amber-400 transition-colors"
                        >
                          {allSelected ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </TableHead>
                    )}
                    <TableHead className="text-slate-400 uppercase text-xs">
                      ID
                    </TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">
                      Producto
                    </TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">
                      Tipo
                    </TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">
                      Variedad
                    </TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">
                      Creado
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLotes.map((l) => {
                    const isSelected = selectedIds.has(l.id);
                    return (
                      <TableRow
                        key={l.id}
                        className={`border-white/5 transition-colors ${
                          isSelected
                            ? "bg-amber-500/10"
                            : "hover:bg-white/[0.02]"
                        }`}
                      >
                        {selectionMode && (
                          <TableCell>
                            <button
                              onClick={() => handleToggleSelect(l.id)}
                              className={`transition-colors ${
                                isSelected
                                  ? "text-amber-400"
                                  : "text-slate-500 hover:text-slate-300"
                              }`}
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </TableCell>
                        )}
                        <TableCell className="font-mono text-white text-sm">
                          {l.codigoLote ?? l.id.slice(-8)}
                        </TableCell>
                        <TableCell className="text-slate-400">
                          {l.productoNombre ?? (
                            <span className="italic text-slate-600">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {l.variedadTipo ? (
                            <Badge className="bg-violet-500/15 text-violet-300 border-violet-500/30 text-xs">
                              {l.variedadTipo}
                            </Badge>
                          ) : (
                            <span className="italic text-slate-600">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {l.variedadNombre ? (
                            <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-xs">
                              {l.variedadNombre}
                            </Badge>
                          ) : (
                            <span className="italic text-slate-600">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-400 text-sm">
                          {format(new Date(l.fechaCreacion), "dd/MM/yyyy HH:mm")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Create Dialog ──────────────────────────────────────── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetDialog();
        }}
      >
        <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Crear Lotes</DialogTitle>
          </DialogHeader>

          <Tabs
            value={creationMode}
            onValueChange={(v) => setCreationMode(v as "individual" | "masivo")}
            className="mt-2"
          >
            <TabsList className="bg-slate-800/60 border border-white/10 w-full">
              <TabsTrigger
                value="individual"
                className="flex-1 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"
              >
                Individual
              </TabsTrigger>
              <TabsTrigger
                value="masivo"
                className="flex-1 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"
              >
                Masivo
              </TabsTrigger>
            </TabsList>

            {/* Shared fields */}
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">
                  Producto
                </label>
                <Select
                  value={selectedProductoId}
                  onValueChange={handleProductoChange}
                >
                  <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                    <SelectValue placeholder="Seleccionar producto..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    {productos.map((p) => (
                      <SelectItem
                        key={p.id}
                        value={p.id}
                        className="text-white hover:bg-slate-800"
                      >
                        {p.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">
                  Variedad
                </label>
                <Select
                  value={selectedVariedadId}
                  onValueChange={setSelectedVariedadId}
                  disabled={
                    !selectedProductoId || variedadesForSelected.length === 0
                  }
                >
                  <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                    <SelectValue placeholder="Seleccionar variedad..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    {variedadesForSelected.map((v) => (
                      <SelectItem
                        key={v.id}
                        value={v.id}
                        className="text-white hover:bg-slate-800"
                      >
                        {v.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Masivo-specific fields */}
              <TabsContent value="masivo" className="mt-0 space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-1.5 block">
                    Cantidad de lotes
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    value={bulkQuantity}
                    onChange={(e) =>
                      setBulkQuantity(
                        Math.min(500, Math.max(1, Number(e.target.value) || 1))
                      )
                    }
                    className="bg-slate-800/50 border-white/10 text-white w-32"
                  />
                </div>

                {selectedVariedadId && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                    <p className="text-sm text-amber-300">
                      Se crearán{" "}
                      <span className="font-bold text-amber-400">
                        {bulkQuantity}
                      </span>{" "}
                      lotes de{" "}
                      <span className="font-semibold">
                        {variedadesForSelected.find(
                          (v) => v.id === selectedVariedadId
                        )?.nombre ?? ""}
                      </span>
                      {selectedProductoId && (
                        <>
                          {" "}
                          (
                          {productos.find((p) => p.id === selectedProductoId)
                            ?.nombre ?? ""}
                          )
                        </>
                      )}
                    </p>
                  </div>
                )}

                {bulkProgress !== null && (
                  <Progress
                    value={bulkProgress}
                    className="h-2 bg-slate-800"
                  />
                )}
              </TabsContent>

              {/* Individual-specific fields */}
              <TabsContent value="individual" className="mt-0 space-y-2">
                <div>
                  <label className="text-sm text-slate-400 mb-1.5 block">
                    Código de lote <span className="text-slate-600">(ej. 320.22C.S)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="320.22C.S"
                    value={codigoLoteInput}
                    onChange={(e) => setCodigoLoteInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-slate-800/50 border border-white/10 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-white/10 text-slate-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
            >
              {creating
                ? "Creando..."
                : creationMode === "masivo"
                ? `Crear ${bulkQuantity} lotes`
                : "Crear lote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ─────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-400">Eliminar Lotes</DialogTitle>
          </DialogHeader>
          <p className="text-slate-400 text-sm py-2">
            ¿Estás seguro de que deseas eliminar{" "}
            <span className="text-white font-semibold">
              {selectedIds.size} lote(s)
            </span>
            ? Esta acción no se puede deshacer. Se eliminarán también sus
            estadísticas y sesiones asociadas.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-white/10 text-slate-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-500 text-white font-semibold"
            >
              {deleting ? "Eliminando..." : `Eliminar ${selectedIds.size} lote(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
