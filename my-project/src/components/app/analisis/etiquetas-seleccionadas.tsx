import { useState, useEffect, useContext } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ChevronDown, ChevronUp, Check } from "lucide-react";
import { AuthenticationContext } from "@/app/context/AuthContext";

interface Label {
  name: string;
  subLabels?: string[];
}

interface SelectedLabelsProps {
  labels: Label[];
  onLabelChange: (labels: Label[]) => void;
}

// Interfaz que representa la respuesta de la API para una etiqueta
interface TagData {
  _id: string;
  titulo: string;
  subetiquetas: {
    _id: string;
    etiquetaId: string;
    valor: string;
    fechaCreacion: Date;
  }[];
  fechaCreacion: Date;
}

export default function SelectedLabels({
  labels,
  onLabelChange,
}: SelectedLabelsProps) {
  const [availableLabels, setAvailableLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Usamos un arreglo para permitir múltiples etiquetas expandidas
  const [expandedLabels, setExpandedLabels] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { data } = useContext(AuthenticationContext);

  useEffect(() => {
    async function fetchLabels() {
      try {
        // Se utiliza el empresaId del contexto como parámetro de consulta
        const response = await fetch(`/api/tags?empresaId=${data?.empresaId}`);
        if (!response.ok) throw new Error("Error fetching labels");

        // Se castea la respuesta a un arreglo de objetos TagData
        const data2: TagData[] = await response.json();

        // Se mapea la data para obtener el formato deseado en la UI
        const mappedLabels: Label[] = data2.map((tag: TagData) => ({
          name: tag.titulo,
          subLabels: tag.subetiquetas.map((sub) => sub.valor),
        }));

        setAvailableLabels(mappedLabels);
        setError(null);
      } catch (error) {
        setError("Failed to load quality criteria. Please try refreshing.");
        console.error("Failed to fetch labels:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchLabels();
  }, [data?.empresaId]);

  // toggleLabel ahora sólo expande o colapsa la lista de subetiquetas
  const toggleLabel = (label: Label) => {
    if (expandedLabels.includes(label.name)) {
      setExpandedLabels(expandedLabels.filter((l) => l !== label.name));
    } else {
      setExpandedLabels([...expandedLabels, label.name]);
    }
  };

  const toggleSubLabel = (parentLabel: Label, subLabel: string) => {
    const parentIndex = labels.findIndex((l) => l.name === parentLabel.name);
    const updatedLabels = [...labels];

    if (parentIndex > -1) {
      updatedLabels[parentIndex] = {
        ...updatedLabels[parentIndex],
        subLabels: updatedLabels[parentIndex].subLabels?.includes(subLabel)
          ? [] // Deselecciona si ya estaba seleccionado
          : [subLabel],
      };
    } else {
      updatedLabels.push({ ...parentLabel, subLabels: [subLabel] });
    }

    onLabelChange(updatedLabels);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Loading Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Filtra las etiquetas según la búsqueda (sin distinguir mayúsculas/minúsculas)
  const filteredLabels = availableLabels.filter((label) =>
    label.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Barra de búsqueda */}
      <input
        type="text"
        placeholder="Buscar etiquetas..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded"
      />

      {/* Contenedor scrollable */}
      <div className="max-h-80 overflow-y-auto space-y-4">
        {filteredLabels.map((label) => {
          const isExpanded = expandedLabels.includes(label.name);
          // Se obtiene el registro de subetiquetas seleccionadas para la etiqueta actual (si existe)
          const selectedParent = labels.find((l) => l.name === label.name);
          const hasSubSelected =
            selectedParent?.subLabels && selectedParent.subLabels.length > 0;

          return (
            <div key={label.name} className="space-y-2">
              <Button
                // Si hay una subetiqueta seleccionada, se usa un fondo negro
                variant={hasSubSelected ? "default" : "outline"}
                onClick={() => toggleLabel(label)}
                className={`w-full flex justify-between items-center gap-3 transition-all ${
                  hasSubSelected ? "bg-black text-white" : ""
                }`}
                aria-expanded={isExpanded}
              >
                <div className="flex items-center gap-2">{label.name}</div>
                {label.subLabels &&
                  (isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  ))}
              </Button>

              {label.subLabels && isExpanded && (
                <div className="ml-6 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {label.subLabels.map((subLabel) => {
                    const isSubSelected =
                      selectedParent?.subLabels?.includes(subLabel);
                    return (
                      <Button
                        key={subLabel}
                        variant={isSubSelected ? "secondary" : "ghost"}
                        onClick={() => toggleSubLabel(label, subLabel)}
                        className="flex items-center gap-2 justify-start h-9"
                      >
                        {isSubSelected && <Check className="h-4 w-4" />}
                        {subLabel}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
