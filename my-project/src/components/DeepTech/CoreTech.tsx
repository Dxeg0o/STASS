"use client";

import { motion } from "framer-motion";
import { BrainCircuit, Cpu, Zap, Layers } from "lucide-react";

const cards = [
    {
        title: "Deep Learning Físico",
        description: "Algoritmos que entienden rotación, calibre y movimiento. No solo píxeles. Entrenados en entornos industriales reales.",
        icon: BrainCircuit,
        colSpan: "lg:col-span-2",
        bgGradient: "from-cyan-900/20 to-slate-900/20"
    },
    {
        title: "Edge Computing",
        description: "Procesamiento local en hardware Nvidia Jetson. Latencia cero. Sin dependencia de la nube.",
        icon: Cpu,
        colSpan: "lg:col-span-1",
        bgGradient: "from-purple-900/20 to-slate-900/20"
    },
    {
        title: "High-Density Ready",
        description: "Soporte para flujos de >14 objetos/segundo sin pérdida de datos. Escalabilidad nativa.",
        icon: Layers,
        colSpan: "lg:col-span-1",
        bgGradient: "from-emerald-900/20 to-slate-900/20"
    },
    {
        title: "Integración Total",
        description: "API directa a tu ERP/WMS actual.",
        icon: Zap,
        colSpan: "lg:col-span-2",
        bgGradient: "from-blue-900/20 to-slate-900/20"
    }
];

export default function CoreTech() {
  return (
    <section id="technology" className="py-24 bg-slate-950 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
        >
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Tecnología Core</h2>
            <p className="text-slate-400 text-lg max-w-2xl">
                Arquitectura diseñada para la realidad sucia, rápida y caótica de la planta.
            </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {cards.map((card, index) => (
                <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className={`
                        relative group overflow-hidden rounded-2xl border border-white/10 
                        bg-white/5 backdrop-blur-sm p-8 hover:border-cyan-400/50 transition-colors duration-500
                        ${card.colSpan}
                    `}
                >
                    {/* Hover Gradient Effect */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${card.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                    
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center mb-6 group-hover:bg-cyan-400/20 transition-colors duration-500">
                                <card.icon className="w-6 h-6 text-cyan-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-4">{card.title}</h3>
                            <p className="text-slate-400 group-hover:text-slate-300 transition-colors duration-300">
                                {card.description}
                            </p>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
      </div>
    </section>
  );
}
