"use client";

import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Definimos el tipo para nuestras etiquetas
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

  useEffect(() => {
    // Agregar la etiqueta "Proveedores" con subetiquetas por defecto
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
    if (nuevaEtiqueta.trim() !== "") {
      if (etiquetaPrincipalSeleccionada !== null) {
        setEtiquetas(
          etiquetas.map((e) =>
            e.id === etiquetaPrincipalSeleccionada
              ? {
                  ...e,
                  subetiquetas: [
                    ...e.subetiquetas,
                    { id: Date.now(), texto: nuevaEtiqueta.trim() },
                  ],
                }
              : e
          )
        );
      } else {
        setEtiquetas([
          ...etiquetas,
          { id: Date.now(), texto: nuevaEtiqueta.trim(), subetiquetas: [] },
        ]);
      }
      setNuevaEtiqueta("");
      setEtiquetaPrincipalSeleccionada(null);
    }
  };

  const toggleEtiqueta = (id: number, subId?: number) => {
    const etiquetaId = subId ? `${id}-${subId}` : `${id}`;
    setEtiquetasSeleccionadas((prev) =>
      prev.includes(etiquetaId)
        ? prev.filter((eId) => eId !== etiquetaId)
        : [...prev, etiquetaId]
    );
  };

  const eliminarEtiqueta = (id: number, subId?: number) => {
    if (subId) {
      setEtiquetas(
        etiquetas.map((e) =>
          e.id === id
            ? {
                ...e,
                subetiquetas: e.subetiquetas.filter((sub) => sub.id !== subId),
              }
            : e
        )
      );
    } else {
      setEtiquetas(etiquetas.filter((e) => e.id !== id));
    }
    setEtiquetasSeleccionadas((prev) =>
      prev.filter((eId) => !eId.startsWith(`${id}`))
    );
  };

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>Creación de etiquetas y subetiquetas</CardTitle>
        <CardDescription>
          Crea etiquetas principales y subetiquetas para tus exportaciones para
          un mejor control de calidad, permitiendo tener trazabilidad de lo que
          necesites.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-2 mb-4">
          <Input
            type="text"
            placeholder={
              etiquetaPrincipalSeleccionada !== null
                ? "Nueva subetiqueta"
                : "Nueva etiqueta principal"
            }
            value={nuevaEtiqueta}
            onChange={(e) => setNuevaEtiqueta(e.target.value)}
            className="flex-grow"
          />
          <Button onClick={agregarEtiqueta}>
            <Plus className="mr-2 h-4 w-4" /> Agregar
          </Button>
        </div>
        {etiquetaPrincipalSeleccionada !== null && (
          <p className="text-sm text-muted-foreground mb-2">
            Agregando subetiqueta a:{" "}
            {
              etiquetas.find((e) => e.id === etiquetaPrincipalSeleccionada)
                ?.texto
            }
            <Button
              variant="ghost"
              size="sm"
              className="ml-2"
              onClick={() => setEtiquetaPrincipalSeleccionada(null)}
            >
              Cancelar
            </Button>
          </p>
        )}
        <ScrollArea className="h-[300px] w-full rounded-md border p-4">
          <div className="space-y-4">
            {etiquetas.map((etiqueta) => (
              <div key={etiqueta.id} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Badge
                    variant={
                      etiquetasSeleccionadas.includes(`${etiqueta.id}`)
                        ? "default"
                        : "outline"
                    }
                    className="cursor-pointer"
                    onClick={() => toggleEtiqueta(etiqueta.id)}
                  >
                    {etiqueta.texto}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() =>
                      setEtiquetaPrincipalSeleccionada(etiqueta.id)
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => eliminarEtiqueta(etiqueta.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="ml-4 flex flex-wrap gap-2">
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
                      className="cursor-pointer"
                      onClick={() => toggleEtiqueta(etiqueta.id, sub.id)}
                    >
                      {sub.texto}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-2"
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
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter></CardFooter>
    </Card>
  );
}
