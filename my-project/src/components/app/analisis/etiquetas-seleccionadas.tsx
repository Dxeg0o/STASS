import { useState, useEffect, useContext } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ChevronDown, ChevronUp, Check } from "lucide-react";
import { AuthenticationContext } from "@/app/context/AuthContext";

interface SubLabel {
  id: string;
  value: string;
}

interface Label {
  name: string;
  subLabels?: SubLabel[];
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
  const [expandedLabels, setExpandedLabels] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { data } = useContext(AuthenticationContext);

  useEffect(() => {
    async function fetchLabels() {
      try {
        const response = await fetch(`/api/tags?empresaId=${data?.empresaId}`);
        if (!response.ok) throw new Error("Error fetching labels");

        const data2: TagData[] = await response.json();

        // Mapea la data para obtener el formato deseado, incluyendo el id de cada subetiqueta
        const mappedLabels: Label[] = data2.map((tag: TagData) => ({
          name: tag.titulo,
          subLabels: tag.subetiquetas
            .filter((sub) => sub) // Remove any null values
            .map((sub) => ({
              id: sub._id,
              value: sub.valor,
            })),
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

  const toggleLabel = (label: Label) => {
    if (expandedLabels.includes(label.name)) {
      setExpandedLabels(expandedLabels.filter((l) => l !== label.name));
    } else {
      setExpandedLabels([...expandedLabels, label.name]);
    }
  };

  const toggleSubLabel = (parentLabel: Label, subLabel: SubLabel) => {
    const parentIndex = labels.findIndex((l) => l.name === parentLabel.name);
    const updatedLabels = [...labels];

    if (parentIndex > -1) {
      // Verifica si la subetiqueta ya está seleccionada (comparando por id)
      const isSelected = updatedLabels[parentIndex].subLabels?.some(
        (s) => s.id === subLabel.id
      );
      updatedLabels[parentIndex] = {
        ...updatedLabels[parentIndex],
        subLabels: isSelected
          ? updatedLabels[parentIndex].subLabels?.filter(
              (s) => s.id !== subLabel.id
            )
          : [...(updatedLabels[parentIndex].subLabels || []), subLabel],
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

  const filteredLabels = availableLabels.filter((label) =>
    label.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Buscar etiquetas..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded"
      />

      <div className="max-h-80 overflow-y-auto space-y-4">
        {filteredLabels.map((label) => {
          const isExpanded = expandedLabels.includes(label.name);
          const selectedParent = labels.find((l) => l.name === label.name);
          const hasSubSelected =
            selectedParent?.subLabels && selectedParent.subLabels.length > 0;

          return (
            <div key={label.name} className="space-y-2">
              <Button
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
                    const isSubSelected = selectedParent?.subLabels?.some(
                      (s) => s.id === subLabel.id
                    );
                    return (
                      <Button
                        key={subLabel.id}
                        variant={isSubSelected ? "secondary" : "ghost"}
                        onClick={() => toggleSubLabel(label, subLabel)}
                        className="flex items-center gap-2 justify-start h-9"
                      >
                        {isSubSelected && <Check className="h-4 w-4" />}
                        {subLabel.value}
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
