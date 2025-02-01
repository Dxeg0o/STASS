"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Subetiqueta = {
  id: number;
  texto: string;
};

type Etiqueta = {
  id: number;
  texto: string;
  subetiquetas: Subetiqueta[];
};

export default function EtiquetasDashboard() {
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState("");
  const [etiquetasSeleccionadas, setEtiquetasSeleccionadas] = useState<
    string[]
  >([]);
  const [etiquetaPrincipalSeleccionada, setEtiquetaPrincipalSeleccionada] =
    useState<number | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEtiquetas([
      {
        id: Date.now(),
        texto: "Proveedores",
        subetiquetas: [
          { id: Date.now() + 1, texto: "Proveedor A" },
          { id: Date.now() + 2, texto: "Proveedor B" },
          { id: Date.now() + 3, texto: "Proveedor C" },
        ],
      },
    ]);
  }, []);

  const agregarEtiqueta = () => {
    setError("");
    const trimmedText = nuevaEtiqueta.trim();

    if (!trimmedText) {
      setError("Por favor ingrese un nombre válido");
      return;
    }

    const exists = etiquetas.some(
      (e) =>
        e.texto === trimmedText ||
        (etiquetaPrincipalSeleccionada &&
          e.subetiquetas.some((s) => s.texto === trimmedText))
    );

    if (exists) {
      setError("Este nombre ya existe");
      return;
    }

    if (etiquetaPrincipalSeleccionada !== null) {
      setEtiquetas(
        etiquetas.map((e) =>
          e.id === etiquetaPrincipalSeleccionada
            ? {
                ...e,
                subetiquetas: [
                  ...e.subetiquetas,
                  { id: Date.now(), texto: trimmedText },
                ],
              }
            : e
        )
      );
    } else {
      setEtiquetas([
        ...etiquetas,
        { id: Date.now(), texto: trimmedText, subetiquetas: [] },
      ]);
    }

    setNuevaEtiqueta("");
    inputRef.current?.focus();
  };

  const eliminarEtiqueta = (id: number, subId?: number) => {
    const confirmMessage = subId
      ? "¿Está seguro que desea eliminar esta subetiqueta?"
      : "Eliminar esta etiqueta también eliminará todas sus subetiquetas. ¿Está seguro?";

    if (!window.confirm(confirmMessage)) return;

    setEtiquetas((prev) =>
      subId
        ? prev.map((e) =>
            e.id === id
              ? {
                  ...e,
                  subetiquetas: e.subetiquetas.filter((s) => s.id !== subId),
                }
              : e
          )
        : prev.filter((e) => e.id !== id)
    );
  };

  const toggleEtiqueta = (id: number, subId?: number) => {
    const etiquetaId = subId ? `${id}-${subId}` : `${id}`;
    setEtiquetasSeleccionadas((prev) =>
      prev.includes(etiquetaId)
        ? prev.filter((e) => e !== etiquetaId)
        : [...prev, etiquetaId]
    );
  };

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>Sistema de Gestión de Etiquetas</CardTitle>
        <CardDescription className="flex items-center gap-2">
          <Info className="h-4 w-4" />
          Cree etiquetas jerárquicas para un mejor control de calidad y
          trazabilidad
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder={
                etiquetaPrincipalSeleccionada
                  ? "Nueva subetiqueta..."
                  : "Nueva etiqueta principal..."
              }
              value={nuevaEtiqueta}
              onChange={(e) => {
                setNuevaEtiqueta(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && agregarEtiqueta()}
              className="flex-grow"
            />
            <Button onClick={agregarEtiqueta} disabled={!nuevaEtiqueta.trim()}>
              <Plus className="mr-2 h-4 w-4" /> Agregar
            </Button>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          {etiquetaPrincipalSeleccionada && (
            <div className="bg-blue-50 p-3 rounded-lg flex justify-between items-center">
              <span className="text-sm text-blue-800">
                Agregando a:{" "}
                <strong>
                  {
                    etiquetas.find(
                      (e) => e.id === etiquetaPrincipalSeleccionada
                    )?.texto
                  }
                </strong>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEtiquetaPrincipalSeleccionada(null)}
              >
                Cancelar
              </Button>
            </div>
          )}

          <ScrollArea className="h-[300px] rounded-md border">
            {etiquetas.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No hay etiquetas creadas aún. Comience agregando su primera
                etiqueta.
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {etiquetas.map((etiqueta) => (
                  <div key={etiqueta.id} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          etiquetasSeleccionadas.includes(`${etiqueta.id}`)
                            ? "default"
                            : "outline"
                        }
                        className="cursor-pointer px-4 py-2 text-sm font-medium transition-colors"
                        onClick={() => toggleEtiqueta(etiqueta.id)}
                      >
                        {etiqueta.texto}
                      </Badge>
                      <div className="flex gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setEtiquetaPrincipalSeleccionada(etiqueta.id)
                              }
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Agregar subetiqueta</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => eliminarEtiqueta(etiqueta.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Eliminar etiqueta</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    {etiqueta.subetiquetas.length > 0 && (
                      <div className="ml-6 flex flex-wrap gap-2">
                        {etiqueta.subetiquetas.map((sub) => (
                          <Badge
                            key={sub.id}
                            variant={
                              etiquetasSeleccionadas.includes(
                                `${etiqueta.id}-${sub.id}`
                              )
                                ? "default"
                                : "outline"
                            }
                            className="cursor-pointer px-3 py-1 text-xs font-normal relative group"
                            onClick={() => toggleEtiqueta(etiqueta.id, sub.id)}
                          >
                            {sub.texto}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                eliminarEtiqueta(etiqueta.id, sub.id);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
