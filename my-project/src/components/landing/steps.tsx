"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Camera, Database, Settings, Award } from "lucide-react";

export default function Steps() {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  const pasos = [
    {
      titulo: "Instalar cámara",
      descripcion:
        "Instale nuestra cámara de alta resolución en su línea de producción.",
      icono: Camera,
    },
    {
      titulo: "Obtener datos",
      descripcion:
        "Nuestro software recopila y analiza datos de calidad periodicamente.",
      icono: Database,
    },
    {
      titulo: "Hacer cambios",
      descripcion:
        "Implemente mejoras basadas en los insights proporcionados por el sistema.",
      icono: Settings,
    },
    {
      titulo: "Exportaciones de calidad",
      descripcion:
        "Logre exportaciones que cumplen con los estándares internacionales.",
      icono: Award,
    },
  ];

  return (
    <section className="py-16 bg-gradient-to-b from-green-50 to-white min-h-screen flex items-center">
      <div className="container mx-auto px-4">
        <h2 className="md:text-5xl text-4xl font-bold text-center mb-12 text-green-800">
          Proceso de Implementación
        </h2>
        <div className="max-w-4xl md:mx-auto mx-2">
          {pasos.map((paso, index) => (
            <motion.div
              key={index}
              className="flex items-start mb-8 relative"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              onMouseEnter={() => setHoveredStep(index)}
              onMouseLeave={() => setHoveredStep(null)}
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-500 flex items-center justify-center z-10">
                <paso.icono className="w-6 h-6 text-white" />
              </div>
              <div className="ml-8 bg-white p-6 rounded-lg shadow-lg flex-grow relative">
                <div
                  className="absolute left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-green-500 rotate-45"
                  style={{ zIndex: -1 }}
                ></div>
                <h3 className="text-xl font-semibold mb-2 text-green-700">
                  Paso {index + 1}: {paso.titulo}
                </h3>
                <p className="text-gray-600">{paso.descripcion}</p>
              </div>
              {index < pasos.length - 1 && (
                <div
                  className="absolute left-6 top-12 bottom-0 w-0.5 bg-green-300"
                  style={{ zIndex: -1 }}
                ></div>
              )}
              <motion.div
                className="absolute left-6 top-12 w-0.5 bg-green-500"
                initial={{ height: 0 }}
                animate={{ height: hoveredStep === index ? "100%" : "0%" }}
                transition={{ duration: 0.5 }}
                style={{ zIndex: -1 }}
              ></motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
