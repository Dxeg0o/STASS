interface Label {
  name: string;
  subLabels?: string[];
}

interface SelectedLabelsProps {
  labels: Label[];
  onLabelChange: (labels: Label[]) => void;
}

export default function SelectedLabels({
  labels,
  onLabelChange,
}: SelectedLabelsProps) {
  const availableLabels: Label[] = [
    {
      name: "Proveedores",
      subLabels: ["Proveedor A", "Proveedor B", "Proveedor C"],
    },
    {
      name: "Parte del flujo",
      subLabels: ["Inicio", "Medio", "Fin"],
    },
  ];

  const toggleLabel = (label: Label) => {
    const index = labels.findIndex((l) => l.name === label.name);
    if (index > -1) {
      onLabelChange(labels.filter((l) => l.name !== label.name));
    } else {
      // Al seleccionar "Proveedores", no se selecciona ninguna subetiqueta automáticamente
      onLabelChange([...labels, { ...label, subLabels: [] }]);
    }
  };

  const toggleSubLabel = (parentLabel: Label, subLabel: string) => {
    const parentIndex = labels.findIndex((l) => l.name === parentLabel.name);
    if (parentIndex > -1) {
      const updatedLabels = [...labels];
      const parent = { ...updatedLabels[parentIndex] };
      // Asegurarse de que solo una subetiqueta esté seleccionada
      parent.subLabels = [subLabel];
      updatedLabels[parentIndex] = parent;
      onLabelChange(updatedLabels);
    } else {
      onLabelChange([...labels, { ...parentLabel, subLabels: [subLabel] }]);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Etiquetas Seleccionadas</h2>
      <div className="space-y-4">
        {availableLabels.map((label) => (
          <div key={label.name} className="space-y-2">
            <button
              onClick={() => toggleLabel(label)}
              className={`px-4 py-2 rounded-full ${
                labels.some((l) => l.name === label.name)
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {label.name}
            </button>
            {label.subLabels && labels.some((l) => l.name === label.name) && (
              <div className="ml-4 space-x-2">
                {label.subLabels.map((subLabel) => (
                  <button
                    key={subLabel}
                    onClick={() => toggleSubLabel(label, subLabel)}
                    className={`px-3 py-1 text-sm rounded-full ${
                      labels
                        .find((l) => l.name === label.name)
                        ?.subLabels?.includes(subLabel)
                        ? "bg-green-500 text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {subLabel}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
