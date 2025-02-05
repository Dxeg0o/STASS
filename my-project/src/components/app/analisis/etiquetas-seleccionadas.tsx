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

// Define an interface to represent the API response for a tag
interface TagData {
  _id: string;
  titulo: string;
  valores: string[];
}

export default function SelectedLabels({
  labels,
  onLabelChange,
}: SelectedLabelsProps) {
  const [availableLabels, setAvailableLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLabel, setExpandedLabel] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { data } = useContext(AuthenticationContext);

  useEffect(() => {
    async function fetchLabels() {
      try {
        // Use the empresaId from context as a query parameter if available
        const response = await fetch(`/api/tags?${data?.empresaId}`);
        if (!response.ok) throw new Error("Error fetching labels");

        // Cast the fetched JSON as an array of TagData objects
        const data2: TagData[] = await response.json();

        // Map the API data to the Label interface
        const mappedLabels: Label[] = data2.map((tag: TagData) => ({
          name: tag.titulo,
          subLabels: tag.valores,
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
    const exists = labels.find((l) => l.name === label.name);
    if (exists) {
      onLabelChange(labels.filter((l) => l.name !== label.name));
      setExpandedLabel(null);
    } else {
      onLabelChange([...labels, { ...label, subLabels: [] }]);
      setExpandedLabel(label.name);
    }
  };

  const toggleSubLabel = (parentLabel: Label, subLabel: string) => {
    const parentIndex = labels.findIndex((l) => l.name === parentLabel.name);
    const updatedLabels = [...labels];

    if (parentIndex > -1) {
      updatedLabels[parentIndex] = {
        ...updatedLabels[parentIndex],
        subLabels: updatedLabels[parentIndex].subLabels?.includes(subLabel)
          ? []
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

  // Filter the labels based on the search query (case-insensitive)
  const filteredLabels = availableLabels.filter((label) =>
    label.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <input
        type="text"
        placeholder="Buscar etiquetas..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded"
      />

      {/* Scrollable container */}
      <div className="max-h-80 overflow-y-auto space-y-4">
        {filteredLabels.map((label) => {
          const isSelected = labels.some((l) => l.name === label.name);
          const isExpanded = expandedLabel === label.name;

          return (
            <div key={label.name} className="space-y-2">
              <Button
                variant={isSelected ? "default" : "outline"}
                onClick={() => toggleLabel(label)}
                className="w-full flex justify-between items-center gap-3 transition-all"
                aria-expanded={isExpanded}
              >
                <div className="flex items-center gap-2">
                  {isSelected && <Check className="h-4 w-4" />}
                  {label.name}
                </div>
                {label.subLabels &&
                  (isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  ))}
              </Button>

              {label.subLabels && isSelected && (
                <div className="ml-6 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {label.subLabels.map((subLabel) => {
                    const isSubSelected = labels
                      .find((l) => l.name === label.name)
                      ?.subLabels?.includes(subLabel);

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
