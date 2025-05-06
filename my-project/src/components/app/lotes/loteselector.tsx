"use client";

import { useState, useEffect } from "react";
import { Check, Plus, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Lote {
  id: string;
  nombre: string;
  fechaCreacion?: string;
}

interface LoteSelectorProps {
  empresaId: string;
}

export function LoteSelector({ empresaId }: LoteSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null);
  const [showNewLoteForm, setShowNewLoteForm] = useState(false);
  const [newLoteName, setNewLoteName] = useState("");
  const [loading, setLoading] = useState(true);

  // Dentro de LoteSelector.tsx

  useEffect(() => {
    if (!empresaId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    // Disparamos ambas peticiones en paralelo
    const lotesReq = fetch(`/api/lotes?empresaId=${empresaId}`);
    const activeReq = fetch(`/api/lotes/activity/last?empresaId=${empresaId}`);

    Promise.all([lotesReq, activeReq])
      .then(async ([lRes, aRes]) => {
        if (!lRes.ok) throw new Error("Error al cargar lotes");
        if (!aRes.ok) throw new Error("Error al cargar lote activo");

        const lotesData: Lote[] = await lRes.json();
        const activeData: Lote | null = await aRes.json();

        setLotes(lotesData);
        // Si hay lote activo, lo seleccionamos; si no, tomo el primero
        if (activeData) {
          setSelectedLote(activeData);
        } else {
          setSelectedLote(lotesData[0] ?? null);
        }
      })
      .catch((err) => {
        console.error(err);
        setLotes([]);
        setSelectedLote(null);
      })
      .finally(() => setLoading(false));
  }, [empresaId]);

  const handleSelectLote = async (lote: Lote) => {
    setSelectedLote(lote);
    setOpen(false);

    try {
      await fetch("/api/lotes/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loteId: lote.id }),
      });
    } catch (error) {
      console.error("Error al registrar actividad de lote:", error);
    }
  };

  const handleCreateNewLote = () => {
    if (!newLoteName.trim()) return;
    fetch("/api/lotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: newLoteName.trim(), empresaId }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("No se pudo crear lote");
        return res.json();
      })
      .then((lote: Lote) => {
        // Solo crear, sin seleccionar automáticamente
        setLotes((prev) => [lote, ...prev]);
        setNewLoteName("");
        setShowNewLoteForm(false);
        setOpen(false);
      })
      .catch((err) => console.error(err));
  };

  const filteredLotes = lotes.filter((l) =>
    l.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-24">
        Cargando lotes…
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Lote Activo</h2>
          <Button
            variant="outline"
            onClick={() => {
              setShowNewLoteForm(true);
              setOpen(true);
            }}
            className="px-4 py-2"
          >
            Crear Nuevo Lote
          </Button>
        </div>
        <div className="bg-white rounded-lg border p-4 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Trabajando en:</p>
            <p className="text-xl font-medium">
              {selectedLote?.nombre || "Ningún lote seleccionado"}
            </p>
            {selectedLote?.fechaCreacion && (
              <p className="text-xs text-gray-400">
                Creado:{" "}
                {new Date(selectedLote.fechaCreacion).toLocaleDateString()}
              </p>
            )}
          </div>
          <Button onClick={() => setOpen(true)}>Cambiar</Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Seleccionar Lote</DialogTitle>
          </DialogHeader>

          {showNewLoteForm ? (
            <div className="space-y-4 py-4">
              <h3 className="font-medium">Crear Nuevo Lote</h3>
              <Input
                placeholder="Nombre del nuevo lote"
                value={newLoteName}
                onChange={(e) => setNewLoteName(e.target.value)}
                className="w-full"
                autoFocus
              />
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowNewLoteForm(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleCreateNewLote}>Crear Lote</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Buscar lotes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <ScrollArea className="h-72 rounded-md border">
                <div className="p-2">
                  {filteredLotes.length > 0 ? (
                    <div className="space-y-1">
                      {filteredLotes.map((lote) => (
                        <button
                          key={lote.id}
                          onClick={() => handleSelectLote(lote)}
                          className={`w-full flex items-center justify-between p-2 rounded-md text-left ${
                            selectedLote?.id === lote.id
                              ? "bg-primary-50 text-primary-600"
                              : "hover:bg-gray-100"
                          }`}
                        >
                          <div>
                            <div className="font-medium">{lote.nombre}</div>
                            {lote.fechaCreacion && (
                              <div className="text-xs text-gray-500">
                                Creado:{" "}
                                {new Date(
                                  lote.fechaCreacion
                                ).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          {selectedLote?.id === lote.id && (
                            <Check className="h-4 w-4 text-primary-600" />
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      No se encontraron lotes con ese nombre
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setShowNewLoteForm(true)}
                  className="flex items-center"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Crear Nuevo Lote
                </Button>
                <Button onClick={() => setOpen(false)}>Cerrar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
