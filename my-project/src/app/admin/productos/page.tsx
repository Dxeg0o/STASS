"use client";

import { useState, useEffect, useRef, type ChangeEvent } from "react";
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
  Package,
  Plus,
  ChevronDown,
  ChevronRight,
  Trash2,
  Upload,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface Variedad {
  id: string;
  nombre: string;
  tipo: string | null;
  subvariedades: Subvariedad[];
}

interface Subvariedad {
  id: string;
  nombre: string;
}

interface Producto {
  id: string;
  nombre: string;
  variedades: Variedad[];
}

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New producto dialog
  const [productoDialogOpen, setProductoDialogOpen] = useState(false);
  const [newProductoNombre, setNewProductoNombre] = useState("");
  const [creatingProducto, setCreatingProducto] = useState(false);

  // New variedad dialog
  const [variedadDialogOpen, setVariedadDialogOpen] = useState(false);
  const [variedadProductoId, setVariedadProductoId] = useState("");
  const [newVariedadNombre, setNewVariedadNombre] = useState("");
  const [newVariedadTipo, setNewVariedadTipo] = useState("");
  const [creatingVariedad, setCreatingVariedad] = useState(false);

  // New subvariedad dialog
  const [subvariedadDialogOpen, setSubvariedadDialogOpen] = useState(false);
  const [subvariedadProductoId, setSubvariedadProductoId] = useState("");
  const [subvariedadVariedadId, setSubvariedadVariedadId] = useState("");
  const [subvariedadVariedadNombre, setSubvariedadVariedadNombre] =
    useState("");
  const [newSubvariedadNombre, setNewSubvariedadNombre] = useState("");
  const [creatingSubvariedad, setCreatingSubvariedad] = useState(false);

  const [importingProductos, setImportingProductos] = useState(false);

  useEffect(() => {
    fetchProductos();
  }, []);

  const fetchProductos = async () => {
    try {
      const res = await axios.get("/api/admin/productos");
      setProductos(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCreateProducto = async () => {
    if (!newProductoNombre.trim()) return;
    setCreatingProducto(true);
    try {
      await axios.post("/api/admin/productos", { nombre: newProductoNombre });
      setNewProductoNombre("");
      setProductoDialogOpen(false);
      setLoading(true);
      await fetchProductos();
      toast.success("Producto creado correctamente");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error("Error al crear el producto");
      }
    } finally {
      setCreatingProducto(false);
    }
  };

  const handleCreateVariedad = async () => {
    if (!newVariedadNombre.trim() || !variedadProductoId) return;
    setCreatingVariedad(true);
    try {
      await axios.post(
        `/api/admin/productos/${variedadProductoId}/variedades`,
        {
          nombre: newVariedadNombre,
          tipo: newVariedadTipo || null,
        }
      );
      setNewVariedadNombre("");
      setNewVariedadTipo("");
      setVariedadDialogOpen(false);
      setLoading(true);
      await fetchProductos();
      toast.success("Variedad agregada correctamente");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error("Error al agregar la variedad");
      }
    } finally {
      setCreatingVariedad(false);
    }
  };

  const handleCreateSubvariedad = async () => {
    if (
      !newSubvariedadNombre.trim() ||
      !subvariedadProductoId ||
      !subvariedadVariedadId
    ) {
      return;
    }

    setCreatingSubvariedad(true);
    try {
      await axios.post(
        `/api/admin/productos/${subvariedadProductoId}/variedades/${subvariedadVariedadId}/subvariedades`,
        { nombre: newSubvariedadNombre }
      );
      setNewSubvariedadNombre("");
      setSubvariedadDialogOpen(false);
      setLoading(true);
      await fetchProductos();
      toast.success("Subvariedad agregada correctamente");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error("Error al agregar la subvariedad");
      }
    } finally {
      setCreatingSubvariedad(false);
    }
  };

  const handleImportProductos = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportingProductos(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post("/api/admin/productos/import", formData);
      setLoading(true);
      await fetchProductos();
      toast.success(
        `Excel importado: ${res.data.productosCreados} productos, ${res.data.variedadesCreadas} variedades y ${res.data.subvariedadesCreadas} subvariedades nuevas`
      );
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error("Error al importar el Excel");
      }
    } finally {
      setImportingProductos(false);
      event.target.value = "";
    }
  };

  const handleDeleteProducto = async (productoId: string) => {
    if (!confirm("¿Estás seguro de eliminar este producto?")) return;
    try {
      await axios.delete(`/api/admin/productos/${productoId}`);
      setLoading(true);
      await fetchProductos();
      toast.success("Producto eliminado");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error("Error al eliminar el producto");
      }
    }
  };

  const handleDeleteVariedad = async (
    productoId: string,
    variedadId: string
  ) => {
    if (!confirm("¿Estás seguro de eliminar esta variedad?")) return;
    try {
      await axios.delete(
        `/api/admin/productos/${productoId}/variedades/${variedadId}`
      );
      setLoading(true);
      await fetchProductos();
      toast.success("Variedad eliminada");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error("Error al eliminar la variedad");
      }
    }
  };

  const handleDeleteSubvariedad = async (
    productoId: string,
    variedadId: string,
    subvariedadId: string
  ) => {
    if (!confirm("¿Estás seguro de eliminar esta subvariedad?")) return;
    try {
      await axios.delete(
        `/api/admin/productos/${productoId}/variedades/${variedadId}/subvariedades/${subvariedadId}`
      );
      setLoading(true);
      await fetchProductos();
      toast.success("Subvariedad eliminada");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error("Error al eliminar la subvariedad");
      }
    }
  };

  const openVariedadDialog = (productoId: string) => {
    setVariedadProductoId(productoId);
    setNewVariedadNombre("");
    setNewVariedadTipo("");
    setVariedadDialogOpen(true);
  };

  const openSubvariedadDialog = (
    productoId: string,
    variedadId: string,
    variedadNombre: string
  ) => {
    setSubvariedadProductoId(productoId);
    setSubvariedadVariedadId(variedadId);
    setSubvariedadVariedadNombre(variedadNombre);
    setNewSubvariedadNombre("");
    setSubvariedadDialogOpen(true);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Productos y Variedades
          </h1>
          <p className="text-slate-400 mt-1">
            Gestiona productos, variedades y subvariedades.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleImportProductos}
          />
          <Button
            variant="outline"
            disabled={importingProductos}
            className="border-white/10 text-slate-300 hover:text-white"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            {importingProductos ? "Importando..." : "Importar Excel"}
          </Button>

          <Dialog open={productoDialogOpen} onOpenChange={setProductoDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Producto
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-white/10 text-white">
              <DialogHeader>
                <DialogTitle>Nuevo Producto</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm text-slate-400 mb-1.5 block">
                    Nombre
                  </label>
                  <Input
                    value={newProductoNombre}
                    onChange={(e) => setNewProductoNombre(e.target.value)}
                    placeholder="Nombre del producto"
                    className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-600"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setProductoDialogOpen(false)}
                  className="border-white/10 text-slate-400 hover:text-white"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateProducto}
                  disabled={creatingProducto || !newProductoNombre.trim()}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
                >
                  {creatingProducto ? "Creando..." : "Crear"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Variedad Dialog */}
      <Dialog open={variedadDialogOpen} onOpenChange={setVariedadDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Agregar Variedad</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">
                Nombre
              </label>
              <Input
                value={newVariedadNombre}
                onChange={(e) => setNewVariedadNombre(e.target.value)}
                placeholder="Nombre de la variedad"
                className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-600"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">
                Tipo
              </label>
              <Input
                value={newVariedadTipo}
                onChange={(e) => setNewVariedadTipo(e.target.value)}
                placeholder="Tipo (opcional)"
                className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-600"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setVariedadDialogOpen(false)}
              className="border-white/10 text-slate-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateVariedad}
              disabled={creatingVariedad || !newVariedadNombre.trim()}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
            >
              {creatingVariedad ? "Agregando..." : "Agregar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subvariedad Dialog */}
      <Dialog
        open={subvariedadDialogOpen}
        onOpenChange={setSubvariedadDialogOpen}
      >
        <DialogContent className="bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Agregar Subvariedad</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">
                Variedad
              </label>
              <Input
                value={subvariedadVariedadNombre}
                disabled
                className="bg-slate-800/50 border-white/10 text-slate-400"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">
                Nombre
              </label>
              <Input
                value={newSubvariedadNombre}
                onChange={(e) => setNewSubvariedadNombre(e.target.value)}
                placeholder="Nombre de la subvariedad"
                className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-600"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSubvariedadDialogOpen(false)}
              className="border-white/10 text-slate-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateSubvariedad}
              disabled={creatingSubvariedad || !newSubvariedadNombre.trim()}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
            >
              {creatingSubvariedad ? "Agregando..." : "Agregar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Productos List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-xl bg-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : productos.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Package className="w-10 h-10 mx-auto mb-3 text-slate-700" />
          <p className="text-lg font-medium">No hay productos</p>
          <p className="text-sm mt-1">
            Crea tu primer producto para comenzar.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {productos.map((producto) => {
            const isExpanded = expandedIds.has(producto.id);
            const subvariedadesCount = producto.variedades.reduce(
              (total, variedad) =>
                total + (variedad.subvariedades?.length ?? 0),
              0
            );
            return (
              <motion.div
                key={producto.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="bg-slate-900/60 border-white/10">
                  <CardContent className="p-0">
                    {/* Producto Header */}
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                      onClick={() => toggleExpand(producto.id)}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-500" />
                        )}
                        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <Package className="w-4 h-4 text-amber-400" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-white">
                            {producto.nombre}
                          </h3>
                          <p className="text-xs text-slate-500">
                            {producto.variedades.length}{" "}
                            {producto.variedades.length === 1
                              ? "variedad"
                              : "variedades"}
                            {subvariedadesCount > 0 && (
                              <>
                                {" "}
                                · {subvariedadesCount}{" "}
                                {subvariedadesCount === 1
                                  ? "subvariedad"
                                  : "subvariedades"}
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/10 text-slate-400 hover:text-white text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            openVariedadDialog(producto.id);
                          }}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Variedad
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-950/30"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProducto(producto.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Variedades */}
                    <AnimatePresence>
                      {isExpanded && producto.variedades.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-white/5 px-4 pb-4">
                            <div className="space-y-2 pt-3 pl-11">
                              {producto.variedades.map((variedad) => (
                                <div
                                  key={variedad.id}
                                  className="flex flex-col gap-3 py-3 px-3 rounded-lg bg-slate-800/30 border border-white/5 sm:flex-row sm:items-start sm:justify-between"
                                >
                                  <div className="min-w-0 flex-1 space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-sm text-slate-300">
                                        {variedad.nombre}
                                      </span>
                                      {variedad.tipo && (
                                        <Badge
                                          variant="outline"
                                          className="border-white/10 text-slate-500 text-xs"
                                        >
                                          {variedad.tipo}
                                        </Badge>
                                      )}
                                      <Badge
                                        variant="outline"
                                        className="border-amber-500/20 text-amber-300/80 text-xs"
                                      >
                                        {variedad.subvariedades?.length ?? 0}{" "}
                                        {(variedad.subvariedades?.length ??
                                          0) === 1
                                          ? "subvariedad"
                                          : "subvariedades"}
                                      </Badge>
                                    </div>

                                    {variedad.subvariedades?.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5">
                                        {variedad.subvariedades.map(
                                          (subvariedad) => (
                                            <span
                                              key={subvariedad.id}
                                              className="inline-flex max-w-full items-center gap-1 rounded-md border border-white/10 bg-slate-900/70 px-2 py-1 text-xs text-slate-300"
                                            >
                                              <span className="truncate">
                                                {subvariedad.nombre}
                                              </span>
                                              <button
                                                type="button"
                                                className="text-slate-500 transition-colors hover:text-red-300"
                                                onClick={() =>
                                                  handleDeleteSubvariedad(
                                                    producto.id,
                                                    variedad.id,
                                                    subvariedad.id
                                                  )
                                                }
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </span>
                                          )
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 sm:pt-0.5">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-white/10 text-slate-400 hover:text-white text-xs"
                                      onClick={() =>
                                        openSubvariedadDialog(
                                          producto.id,
                                          variedad.id,
                                          variedad.nombre
                                        )
                                      }
                                    >
                                      <Plus className="w-3 h-3 mr-1" />
                                      Subvariedad
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-red-400 hover:text-red-300 hover:bg-red-950/30 h-7 w-7 p-0"
                                      onClick={() =>
                                        handleDeleteVariedad(
                                          producto.id,
                                          variedad.id
                                        )
                                      }
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {isExpanded && producto.variedades.length === 0 && (
                      <div className="border-t border-white/5 px-4 pb-4">
                        <p className="text-xs text-slate-600 pt-3 pl-11">
                          No hay variedades registradas.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
