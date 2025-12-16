"use client";

import { motion } from "framer-motion";

const metrics = [
    {
        value: "97.54%",
        label: "Precisión Promedio Validada"
    },
    {
        value: "24/7",
        label: "Operación Continua sin Thermal Throttling"
    },
    {
        value: "Global",
        label: "Pruebas de Estrés en Holanda/Chile"
    }
];

export default function Validation() {
  return (
    <section id="validation" className="py-24 bg-slate-950 border-t border-white/5 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center divide-y md:divide-y-0 md:divide-x divide-white/10">
                {metrics.map((metric, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.2 }}
                        className="py-8 md:py-0 px-4"
                    >
                        <h3 className="text-5xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-4">
                            {metric.value}
                        </h3>
                        <p className="text-sm md:text-base font-medium text-slate-400 uppercase tracking-widest">
                            {metric.label}
                        </p>
                    </motion.div>
                ))}
            </div>
            
            {/* Trust badge / simple social proof line */}
            <div className="mt-20 text-center">
                <p className="text-slate-500 text-sm mb-6">VALIDADO EN ENTORNOS INDUSTRIALES REALES</p>
                <div className="flex justify-center items-center space-x-8 opacity-40 grayscale">
                    {/* Placeholders for partner logos if needed in future, currently just circles/text */}
                    <div className="h-8 w-24 bg-white/10 rounded flex items-center justify-center text-xs text-white">Partner 1</div>
                    <div className="h-8 w-24 bg-white/10 rounded flex items-center justify-center text-xs text-white">Partner 2</div>
                    <div className="h-8 w-24 bg-white/10 rounded flex items-center justify-center text-xs text-white">Partner 3</div>
                </div>
            </div>
        </div>
    </section>
  );
}
