"use client";

import { Check, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import React from "react";

export interface Lote {
  id: string;
  nombre: string;
  fechaCreacion?: string;
}

interface ResumenLoteSelectorProps {
  lotes: Lote[];
  selectedLote: Lote | null;
  loading: boolean;
  onSelect: (lote: Lote) => void;
  onSelectNone: () => void;
}

export function ResumenLoteSelector({
  lotes,
  selectedLote,
  loading,
  onSelect,
  onSelectNone,
}: ResumenLoteSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filtered = lotes.filter((l) =>
    l.nombre.toLowerCase().includes(search.toLowerCase())
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
        <div className=" items-center justify-between">
          <h2 className="text-lg font-semibold">Lote seleccionado</h2>
          <h3 className="text-sm font-bold text-red-600">
            *Recuerda que acá solo estás viendo los datos, no cambiando el lote
            activo
          </h3>
        </div>
        <div className="bg-white rounded-lg border p-4 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Datos de:</p>
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
          <Button onClick={() => setOpen(true)}>Ver otro lote</Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Seleccionar Lote</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Buscar lotes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
                autoFocus
              />
            </div>
            <ScrollArea className="h-72 rounded-md border">
              <div className="p-2 space-y-1">
                <button
                  onClick={() => {
                    onSelectNone();
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-md text-left ${
                    selectedLote === null
                      ? "bg-primary-50 text-primary-600"
                      : "hover:bg-gray-100"
                  }`}
                >
                  <div className="font-medium">Ninguno</div>
                  {selectedLote === null && (
                    <Check className="h-4 w-4 text-primary-600" />
                  )}
                </button>

                {filtered.length > 0 ? (
                  filtered.map((lote) => (
                    <button
                      key={lote.id}
                      onClick={() => {
                        onSelect(lote);
                        setOpen(false);
                      }}
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
                            {new Date(lote.fechaCreacion).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      {selectedLote?.id === lote.id && (
                        <Check className="h-4 w-4 text-primary-600" />
                      )}
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    No se encontraron lotes
                  </div>
                )}
              </div>
            </ScrollArea>
            <div className="flex justify-end">
              <Button onClick={() => setOpen(false)}>Cerrar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
