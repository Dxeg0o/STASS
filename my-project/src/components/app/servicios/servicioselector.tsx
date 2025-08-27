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

export interface Servicio {
  id: string;
  nombre: string;
}

interface ServicioSelectorProps {
  servicios: Servicio[];
  selectedServicio: Servicio | null;
  loading: boolean;
  onSelect: (servicio: Servicio) => void;
  onSelectNone: () => void;
}

export function ServicioSelector({
  servicios,
  selectedServicio,
  loading,
  onSelect,
  onSelectNone,
}: ServicioSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filtered = servicios.filter((s) =>
    s.nombre.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-24">
        Cargando servicios…
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Servicio</h2>
          <Button onClick={() => setOpen(true)}>Cambiar</Button>
        </div>
        <div className="bg-white rounded-lg border p-4 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Mostrando datos de:</p>
            <p className="text-xl font-medium">
              {selectedServicio?.nombre || "Todos"}
            </p>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Seleccionar Servicio</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Buscar servicios..."
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
                    selectedServicio === null
                      ? "bg-primary-50 text-primary-600"
                      : "hover:bg-gray-100"
                  }`}
                >
                  <div className="font-medium">Todos</div>
                  {selectedServicio === null && (
                    <Check className="h-4 w-4 text-primary-600" />
                  )}
                </button>

                {filtered.length > 0 ? (
                  filtered.map((servicio) => (
                    <button
                      key={servicio.id}
                      onClick={() => {
                        onSelect(servicio);
                        setOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-md text-left ${
                        selectedServicio?.id === servicio.id
                          ? "bg-primary-50 text-primary-600"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      <div className="font-medium">{servicio.nombre}</div>
                      {selectedServicio?.id === servicio.id && (
                        <Check className="h-4 w-4 text-primary-600" />
                      )}
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    No se encontraron servicios
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
