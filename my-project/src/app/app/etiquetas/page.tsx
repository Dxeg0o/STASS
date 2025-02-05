"use client";

import { useState, useEffect, useRef, useContext } from "react";
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
import { AuthenticationContext } from "@/app/context/AuthContext";

// Definimos el tipo que usaremos en el cliente
type Etiqueta = {
  id: string;
  texto: string;
  // Para cada subetiqueta usamos el texto (ya que en el modelo se almacena como string)
  subetiquetas: { texto: string }[];
};
interface TagData {
  _id: string;
  titulo: string;
  valores: string[];
  fechaCreacion: Date;
}

export default function EtiquetasDashboard() {
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState("");
  const [etiquetasSeleccionadas, setEtiquetasSeleccionadas] = useState<
    string[]
  >([]);
  // Si se selecciona una etiqueta para agregarle una subetiqueta, guardamos su id (de tipo string)
  const [etiquetaPrincipalSeleccionada, setEtiquetaPrincipalSeleccionada] =
    useState<string | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { data } = useContext(AuthenticationContext);

  // Función para obtener las etiquetas desde el backend, filtrando por empresaId si está disponible
  const fetchEtiquetas = async () => {
    try {
      const empresaId = data?.empresaId;
      // Si empresaId está definido, lo agregamos como parámetro de consulta
      const url = empresaId ? `/api/tags?empresaId=${empresaId}` : "/api/tags";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Error al obtener las etiquetas");

      // Cast the fetched data to TagData[]
      const tagsData: TagData[] = await res.json();

      // Map the fetched data to your client-side type (Etiqueta)
      const etiquetasFormateadas: Etiqueta[] = tagsData.map((tag: TagData) => ({
        id: tag._id,
        texto: tag.titulo,
        subetiquetas: tag.valores.map((valor: string) => ({
          texto: valor,
        })),
      }));
      setEtiquetas(etiquetasFormateadas);
    } catch (error) {
      console.error(error);
    }
  };

  // Ejecutamos fetchEtiquetas cuando el empresaId esté disponible o cambie
  useEffect(() => {
    if (data?.empresaId) {
      fetchEtiquetas();
    }
  }, [data?.empresaId]);

  // Función para agregar una etiqueta o subetiqueta
  const agregarEtiqueta = async () => {
    setError("");
    const trimmedText = nuevaEtiqueta.trim();

    if (!trimmedText) {
      setError("Por favor ingrese un nombre válido");
      return;
    }

    // Verificamos que el nombre no exista ya en ninguna etiqueta o subetiqueta
    const exists = etiquetas.some(
      (e) =>
        e.texto === trimmedText ||
        e.subetiquetas.some((s) => s.texto === trimmedText)
    );
    if (exists) {
      setError("Este nombre ya existe");
      return;
    }

    if (etiquetaPrincipalSeleccionada === null) {
      // Agregar una nueva etiqueta principal
      const newEtiqueta = {
        empresaId: data?.empresaId, // Se utiliza el empresaId del contexto
        titulo: trimmedText,
        valores: [],
        fechaCreacion: new Date(),
      };

      try {
        const res = await fetch("/api/tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newEtiqueta),
        });
        if (!res.ok) throw new Error("Error al agregar la etiqueta");
        await fetchEtiquetas();
      } catch (err) {
        console.error(err);
      }
    } else {
      // Agregar una subetiqueta a la etiqueta seleccionada
      try {
        const res = await fetch(`/api/tags/${etiquetaPrincipalSeleccionada}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subetiqueta: trimmedText }),
        });
        if (!res.ok) throw new Error("Error al agregar la subetiqueta");
        await fetchEtiquetas();
      } catch (err) {
        console.error(err);
      }
    }

    setNuevaEtiqueta("");
    inputRef.current?.focus();
  };

  // Función para eliminar una etiqueta o una subetiqueta
  const eliminarEtiqueta = async (id: string, subTexto?: string) => {
    const confirmMessage = subTexto
      ? "¿Está seguro que desea eliminar esta subetiqueta?"
      : "Eliminar esta etiqueta también eliminará todas sus subetiquetas. ¿Está seguro?";
    if (!window.confirm(confirmMessage)) return;

    if (subTexto) {
      try {
        const res = await fetch(`/api/tags/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ removeSubetiqueta: subTexto }),
        });
        if (!res.ok) throw new Error("Error al eliminar la subetiqueta");
        await fetchEtiquetas();
      } catch (err) {
        console.error(err);
      }
    } else {
      try {
        const res = await fetch(`/api/tags/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Error al eliminar la etiqueta");
        await fetchEtiquetas();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Función para seleccionar o deseleccionar etiquetas (o subetiquetas) en la UI
  const toggleEtiqueta = (id: string, subTexto?: string) => {
    const etiquetaId = subTexto ? `${id}-${subTexto}` : id;
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
          {/* Formulario para agregar etiquetas o subetiquetas */}
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

          {/* Área de scroll para mostrar las etiquetas y subetiquetas */}
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
                          etiquetasSeleccionadas.includes(etiqueta.id)
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
                            key={sub.texto}
                            variant={
                              etiquetasSeleccionadas.includes(
                                `${etiqueta.id}-${sub.texto}`
                              )
                                ? "default"
                                : "outline"
                            }
                            className="cursor-pointer px-3 py-1 text-xs font-normal relative group"
                            onClick={() =>
                              toggleEtiqueta(etiqueta.id, sub.texto)
                            }
                          >
                            {sub.texto}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                eliminarEtiqueta(etiqueta.id, sub.texto);
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
