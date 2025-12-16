"use client";

import { motion } from "framer-motion";

export default function Problem() {
  return (
    <section className="py-24 bg-slate-950 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-slate-900/50 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
            >
                <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-8">
                    La incertidumbre cuesta millones. <br />
                    <span className="text-slate-500">
                        Los sistemas actuales se saturan cuando tu línea acelera.
                    </span>
                </h2>
                <div className="h-1 w-24 bg-gradient-to-r from-cyan-400 to-transparent mx-auto rounded-full" />
                <p className="mt-8 text-xl text-slate-400 max-w-2xl mx-auto">
                    Nosotros eliminamos los puntos ciegos operativos.
                </p>
            </motion.div>
        </div>
    </section>
  );
}
