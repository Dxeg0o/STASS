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
import { Search, X } from "lucide-react";

interface Lote {
  id: string;
  codigoLote?: string | null;
  fechaCreacion: string;
  variedadId?: string;
  variedadNombre?: string;
  variedadTipo?: string | null;
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

type StatusFilter = "todos" | "activo" | "inactivo";

function displayLote(lote: Pick<Lote, "codigoLote">): string {
  return lote.codigoLote?.trim() || "Sin código";
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
  const [productoFilter, setProductoFilter] = useState("");
  const [variedadFilter, setVariedadFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProductoId, setSelectedProductoId] = useState<string>("");
  const [selectedVariedadId, setSelectedVariedadId] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [codigoLoteInput, setCodigoLoteInput] = useState("");

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

  const productoOptions = useMemo(() => {
    return Array.from(
      new Set(lotes.map((l) => l.productoNombre).filter(Boolean))
    ) as string[];
  }, [lotes]);

  const variedadOptions = useMemo(() => {
    return lotes
      .filter((lote) => !productoFilter || lote.productoNombre === productoFilter)
      .filter((lote) => lote.variedadId && lote.variedadNombre)
      .reduce<Array<{ id: string; nombre: string; tipo?: string | null }>>(
        (acc, lote) => {
          if (!lote.variedadId || !lote.variedadNombre) return acc;
          if (acc.some((item) => item.id === lote.variedadId)) return acc;
          acc.push({
            id: lote.variedadId,
            nombre: lote.variedadNombre,
            tipo: lote.variedadTipo,
          });
          return acc;
        },
        []
      );
  }, [lotes, productoFilter]);

  const filteredLotes = useMemo(() => {
    const term = search.toLowerCase().trim();
    return lotes.filter((l) => {
      const isActive = activeLote?.id === l.id;
      if (statusFilter === "activo" && !isActive) return false;
      if (statusFilter === "inactivo" && isActive) return false;
      if (productoFilter && l.productoNombre !== productoFilter) return false;
      if (variedadFilter && l.variedadId !== variedadFilter) return false;
      if (!term) return true;
      return [
        l.codigoLote,
        l.productoNombre,
        l.variedadNombre,
        l.variedadTipo,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [activeLote?.id, lotes, productoFilter, search, statusFilter, variedadFilter]);

  const variedadesForSelected = useMemo(() => {
    if (!selectedProductoId) return [];
    const producto = productos.find((p) => p.id === selectedProductoId);
    return producto?.variedades ?? [];
  }, [productos, selectedProductoId]);

  const handleProductoChange = (productoId: string) => {
    setSelectedProductoId(productoId);
    setSelectedVariedadId("");
  };

  const hasListFilters =
    search ||
    productoFilter ||
    variedadFilter ||
    statusFilter !== "todos";

  const clearListFilters = () => {
    setSearch("");
    setProductoFilter("");
    setVariedadFilter("");
    setStatusFilter("todos");
  };

  const handleCreateLote = async () => {
    if (!codigoLoteInput.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/lotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          servicioId,
          variedadId: selectedVariedadId || undefined,
          codigoLote: codigoLoteInput.trim() || undefined,
        }),
      });
      if (res.ok) {
        const nuevo: Lote = await res.json();
        setLotes((prev) => [nuevo, ...prev]);
        setDialogOpen(false);
        setSelectedProductoId("");
        setSelectedVariedadId("");
        setCodigoLoteInput("");
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
                <span className="font-semibold text-white font-mono">{displayLote(activeLote)}</span>
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
          <div className="space-y-3 rounded-lg border border-white/10 bg-slate-950/20 p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  placeholder="Buscar codigo, producto o variedad..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 bg-slate-800/60 pl-10 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-cyan-500"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
                {[
                  { key: "todos", label: "Todos", count: lotes.length },
                  { key: "activo", label: "Activo", count: activeLote ? 1 : 0 },
                  {
                    key: "inactivo",
                    label: "Inactivos",
                    count: Math.max(0, lotes.length - (activeLote ? 1 : 0)),
                  },
                ].map((item) => {
                  const active = statusFilter === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setStatusFilter(item.key as StatusFilter)}
                      className={`shrink-0 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                        active
                          ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-200"
                          : "border-white/10 bg-slate-900/40 text-slate-400 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      {item.label}
                      <span className="ml-2 text-slate-500">{item.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <Select
                value={productoFilter || "all"}
                onValueChange={(value) => {
                  setProductoFilter(value === "all" ? "" : value);
                  setVariedadFilter("");
                }}
              >
                <SelectTrigger className="border-white/10 bg-slate-800/60 text-white focus:ring-cyan-500">
                  <SelectValue placeholder="Producto" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/10 text-white">
                  <SelectItem value="all">Todos los productos</SelectItem>
                  {productoOptions.map((producto) => (
                    <SelectItem key={producto} value={producto}>
                      {producto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={variedadFilter || "all"}
                onValueChange={(value) =>
                  setVariedadFilter(value === "all" ? "" : value)
                }
              >
                <SelectTrigger className="border-white/10 bg-slate-800/60 text-white focus:ring-cyan-500">
                  <SelectValue placeholder="Variedad" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/10 text-white">
                  <SelectItem value="all">Todas las variedades</SelectItem>
                  {variedadOptions.map((variedad) => (
                    <SelectItem key={variedad.id} value={variedad.id}>
                      {variedad.tipo ? `${variedad.tipo} · ` : ""}
                      {variedad.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasListFilters && (
                <Button
                  variant="ghost"
                  onClick={clearListFilters}
                  className="text-slate-400 hover:bg-white/5 hover:text-white"
                >
                  <X className="h-4 w-4" />
                  Limpiar
                </Button>
              )}
            </div>
          </div>

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
                            {displayLote(lote)}
                          </span>
                          {lote.variedadTipo && (
                            <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/40 text-xs shrink-0">
                              {lote.variedadTipo}
                            </Badge>
                          )}
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
            <p className="text-sm text-slate-400">El lote se identificará en pantalla con el código que ingreses.</p>

            <div className="space-y-1.5">
              <label className="text-sm text-slate-400">Código de lote <span className="text-slate-600">(ej. 320.22C.S)</span></label>
              <input
                type="text"
                placeholder="320.22C.S"
                value={codigoLoteInput}
                onChange={(e) => setCodigoLoteInput(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-slate-800 border border-white/10 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
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
                disabled={creating || !codigoLoteInput.trim()}
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
