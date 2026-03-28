"use client";

import { useContext, useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AuthenticationContext } from "@/app/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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

interface Lote {
  id: string;
  nombre: string;
  fechaCreacion: string;
  servicioId: string;
  variedadId?: string;
  variedadNombre?: string;
  productoNombre?: string;
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

export default function LotesPage() {
  const params = useParams();
  const servicioId = params.servicioId as string;

  const { data } = useContext(AuthenticationContext);
  const isAdmin = data?.rol_usuario === "administrador";

  const [lotes, setLotes] = useState<Lote[]>([]);
  const [activeLote, setActiveLote] = useState<Lote | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newNombre, setNewNombre] = useState("");
  const [selectedProductoId, setSelectedProductoId] = useState<string>("");
  const [selectedVariedadId, setSelectedVariedadId] = useState<string>("");
  const [creating, setCreating] = useState(false);

  // Session action state
  const [sessionLoading, setSessionLoading] = useState(false);

  useEffect(() => {
    if (!servicioId) return;
    setLoading(true);

    Promise.all([
      fetch(`/api/lotes?servicioId=${servicioId}`),
      fetch(`/api/lotes/activity/last?servicioId=${servicioId}`),
      fetch(`/api/productos`),
    ])
      .then(async ([lotesRes, activeRes, productosRes]) => {
        if (!lotesRes.ok || !activeRes.ok || !productosRes.ok) {
          throw new Error("Error al cargar datos");
        }
        const lotesData: Lote[] = await lotesRes.json();
        const activeData: Lote | null = await activeRes.json();
        const productosData: Producto[] = await productosRes.json();
        setLotes(lotesData);
        setActiveLote(activeData);
        setProductos(productosData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [servicioId]);

  const filteredLotes = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return lotes;
    return lotes.filter((l) => l.nombre.toLowerCase().includes(term));
  }, [lotes, search]);

  const variedadesForSelected = useMemo(() => {
    if (!selectedProductoId) return [];
    const producto = productos.find((p) => p.id === selectedProductoId);
    return producto?.variedades ?? [];
  }, [productos, selectedProductoId]);

  const handleProductoChange = (productoId: string) => {
    setSelectedProductoId(productoId);
    setSelectedVariedadId("");
  };

  const handleCreateLote = async () => {
    if (!newNombre.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/lotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: newNombre.trim(),
          servicioId,
          variedadId: selectedVariedadId || undefined,
        }),
      });
      if (res.ok) {
        const nuevo: Lote = await res.json();
        setLotes((prev) => [nuevo, ...prev]);
        setDialogOpen(false);
        setNewNombre("");
        setSelectedProductoId("");
        setSelectedVariedadId("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleOpenSession = async (loteId: string) => {
    setSessionLoading(true);
    try {
      await fetch("/api/lotes/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loteId }),
      });
      const lote = lotes.find((l) => l.id === loteId) ?? null;
      setActiveLote(lote);
    } catch (err) {
      console.error(err);
    } finally {
      setSessionLoading(false);
    }
  };

  const handleCloseSession = async () => {
    setSessionLoading(true);
    try {
      await fetch("/api/lotes/activity/close", { method: "POST" });
      setActiveLote(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSessionLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Gestión de Lotes</h1>
        {isAdmin && (
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold"
          >
            + Crear Lote
          </Button>
        )}
      </div>

      {/* Active lote indicator */}
      <Card
        className={`border ${
          activeLote
            ? "border-green-500/60 bg-green-950/20"
            : "border-white/10 bg-slate-900/40"
        }`}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-400">
            Lote activo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500">Cargando…</p>
          ) : activeLote ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-green-400 animate-pulse" />
                <span className="font-semibold text-white">{activeLote.nombre}</span>
                {activeLote.variedadNombre && (
                  <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/40 text-xs">
                    {activeLote.variedadNombre}
                  </Badge>
                )}
              </div>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={sessionLoading}
                  onClick={handleCloseSession}
                  className="border-red-500/40 text-red-400 hover:bg-red-950/30 hover:text-red-300"
                >
                  Cerrar sesión
                </Button>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Ningún lote activo</p>
          )}
        </CardContent>
      </Card>

      {/* Search & list */}
      <Card className="border-white/10 bg-slate-900/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white">Lotes del servicio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Buscar lote…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm bg-slate-800/60 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-cyan-500"
          />

          <ScrollArea className="h-[420px] pr-2">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 rounded-lg bg-slate-800/40 animate-pulse"
                  />
                ))}
              </div>
            ) : filteredLotes.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">
                No se encontraron lotes.
              </p>
            ) : (
              <div className="space-y-2">
                {filteredLotes.map((lote) => {
                  const isActive = activeLote?.id === lote.id;
                  return (
                    <div
                      key={lote.id}
                      className={`group flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
                        isActive
                          ? "border-green-500/50 bg-green-950/20"
                          : "border-white/10 bg-slate-800/30 hover:border-white/20 hover:bg-slate-800/50"
                      }`}
                    >
                      <Link
                        href={`/app/servicios/${servicioId}/lotes/${lote.id}`}
                        className="flex-1 min-w-0"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          {isActive && (
                            <span className="h-2 w-2 rounded-full bg-green-400" />
                          )}
                          <span className="font-medium text-white text-sm group-hover:text-cyan-300 transition-colors truncate">
                            {lote.nombre}
                          </span>
                          {lote.variedadNombre && (
                            <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/40 text-xs shrink-0">
                              {lote.variedadNombre}
                            </Badge>
                          )}
                          {lote.productoNombre && (
                            <Badge className="bg-slate-700/60 text-slate-300 border-slate-600/40 text-xs shrink-0">
                              {lote.productoNombre}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {new Date(lote.fechaCreacion).toLocaleDateString(
                            "es-CL",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </p>
                      </Link>

                      {isAdmin && !isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={sessionLoading}
                          onClick={() => handleOpenSession(lote.id)}
                          className="ml-3 shrink-0 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/30"
                        >
                          Abrir sesión
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Create Lote Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Crear nuevo lote</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm text-slate-400">Nombre</label>
              <Input
                placeholder="Nombre del lote"
                value={newNombre}
                onChange={(e) => setNewNombre(e.target.value)}
                className="bg-slate-800 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-cyan-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-slate-400">Producto</label>
              <Select
                value={selectedProductoId}
                onValueChange={handleProductoChange}
              >
                <SelectTrigger className="bg-slate-800 border-white/10 text-white focus:ring-cyan-500">
                  <SelectValue placeholder="Seleccionar producto…" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/10 text-white">
                  {productos.map((p) => (
                    <SelectItem
                      key={p.id}
                      value={p.id}
                      className="focus:bg-slate-700 focus:text-white"
                    >
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-slate-400">Variedad</label>
              <Select
                value={selectedVariedadId}
                onValueChange={setSelectedVariedadId}
                disabled={!selectedProductoId || variedadesForSelected.length === 0}
              >
                <SelectTrigger className="bg-slate-800 border-white/10 text-white focus:ring-cyan-500">
                  <SelectValue placeholder="Seleccionar variedad…" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/10 text-white">
                  {variedadesForSelected.map((v) => (
                    <SelectItem
                      key={v.id}
                      value={v.id}
                      className="focus:bg-slate-700 focus:text-white"
                    >
                      {v.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setDialogOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                disabled={!newNombre.trim() || creating}
                onClick={handleCreateLote}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold"
              >
                {creating ? "Creando…" : "Crear"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
