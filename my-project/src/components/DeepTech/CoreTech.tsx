"use client";

import { motion } from "framer-motion";
import { BrainCircuit, Cpu, Zap, Layers } from "lucide-react";

const cards = [
    {
        title: "Deep Learning Físico",
        description: "Algoritmos que entienden rotación, calibre y movimiento. No solo píxeles. Entrenados en entornos industriales reales.",
        icon: BrainCircuit,
        colSpan: "lg:col-span-2",
        bgGradient: "from-cyan-900/20 to-slate-900/20",
        shadowColor: "shadow-cyan-500/10"
    },
    {
        title: "Edge Computing",
        description: "Procesamiento local en hardware. Latencia cero. Sin dependencia de la nube.",
        icon: Cpu,
        colSpan: "lg:col-span-1",
        bgGradient: "from-purple-900/20 to-slate-900/20",
        shadowColor: "shadow-purple-500/10"
    },
    {
        title: "High-Density Ready",
        description: "Soporte para flujos de >20 objetos/segundo sin pérdida de datos. Escalabilidad nativa.",
        icon: Layers,
        colSpan: "lg:col-span-1",
        bgGradient: "from-emerald-900/20 to-slate-900/20",
        shadowColor: "shadow-emerald-500/10"
    },
    {
        title: "Integración Total",
        description: "API directa a tu ERP/WMS actual. ",
        icon: Zap,
        colSpan: "lg:col-span-2",
        bgGradient: "from-blue-900/20 to-slate-900/20",
        shadowColor: "shadow-blue-500/10"
    }
];

export default function CoreTech() {
  return (
    <section id="technology" className="py-24 bg-slate-950 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute center top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-900/10 rounded-full blur-[100px] pointer-events-none" />

   <div className="max-w-7xl mx-auto relative z-10">
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center lg:text-left"
        >
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Diseñado para la realidad hostil de tu operación.</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto lg:mx-0">
                Tecnología robusta que se adapta a tu entorno, no al revés.
            </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card 1 */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="relative group overflow-hidden rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md p-8 transition-all duration-500 hover:border-white/10 hover:shadow-2xl shadow-cyan-500/10 hover:-translate-y-1"
            >
                 <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 to-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                 <div className="relative z-10">
                    <BrainCircuit className="w-10 h-10 text-cyan-400 mb-6" />
                    <h3 className="text-2xl font-bold text-white mb-4">Detecta lo que otros ignoran.</h3>
                    <p className="text-slate-400 leading-relaxed">
                        Entrenado para identificar productos orgánicos complejos e irregulares. Validado detectando bulbos, entiende rotación y calibres, ignorando tierra y suciedad.
                    </p>
                 </div>
            </motion.div>

            {/* Card 2 */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="relative group overflow-hidden rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md p-8 transition-all duration-500 hover:border-white/10 hover:shadow-2xl shadow-purple-500/10 hover:-translate-y-1"
            >
                 <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                 <div className="relative z-10">
                    <Cpu className="w-10 h-10 text-purple-400 mb-6" />
                    <h3 className="text-2xl font-bold text-white mb-4">Funciona donde está el problema.</h3>
                    <p className="text-slate-400 leading-relaxed">
                        Ya sea en medio del campo, en la recepción o en la salida del proceso. Nuestro hardware procesa localmente y no depende de cables de red ni internet estable.
                    </p>
                 </div>
            </motion.div>

             {/* Card 3 */}
             <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="relative group overflow-hidden rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md p-8 transition-all duration-500 hover:border-white/10 hover:shadow-2xl shadow-emerald-500/10 hover:-translate-y-1"
            >
                 <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 to-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                 <div className="relative z-10">
                    <Zap className="w-10 h-10 text-emerald-400 mb-6" />
                    <h3 className="text-2xl font-bold text-white mb-4">Listo para Temporada Alta.</h3>
                    <p className="text-slate-400 leading-relaxed">
                        Probado en flujos de alta velocidad (&gt;20 objetos/segundo). Cuando la presión sube, el sistema mantiene la precisión sin saturarse.
                    </p>
                 </div>
            </motion.div>

            {/* Card 4 */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="relative group overflow-hidden rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md p-8 transition-all duration-500 hover:border-white/10 hover:shadow-2xl shadow-blue-500/10 hover:-translate-y-1"
            >
                 <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                 <div className="relative z-10">
                    <Layers className="w-10 h-10 text-blue-400 mb-6" />
                    <h3 className="text-2xl font-bold text-white mb-4">Datos Financieros Inmediatos.</h3>
                    <p className="text-slate-400 leading-relaxed">
                        Convierte el flujo físico en números para tu ERP o Excel. Deja de esperar al informe de cierre de turno; ten el control en tiempo real.
                    </p>
                 </div>
            </motion.div>
        </div>
      </div>
    </section>
  );
}
