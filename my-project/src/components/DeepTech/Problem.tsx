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
                <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-6">
                    La incertidumbre operativa <br />
                    <span className="text-slate-400">
                        te está costando dinero.
                    </span>
                </h2>
                <div className="h-1 w-24 bg-gradient-to-r from-cyan-400 to-transparent mx-auto rounded-full mb-8" />
                
                <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-16 leading-relaxed">
                    En la agroindustria, muchas veces se opera basándose en estimaciones al ojo o se obtienen los datos reales cuando el proceso ya terminó.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                    {/* Problem 1 */}
                    <div className="bg-white/5 border border-white/5 p-6 rounded-2xl hover:border-white/10 transition-colors">
                        <h3 className="text-cyan-400 text-xl font-bold mb-3">Estimaciones</h3>
                        <p className="text-slate-400">
                            Asumir rendimientos que no son reales.
                        </p>
                    </div>

                     {/* Problem 2 */}
                    <div className="bg-white/5 border border-white/5 p-6 rounded-2xl hover:border-white/10 transition-colors">
                        <h3 className="text-cyan-400 text-xl font-bold mb-3">Datos Tardíos</h3>
                        <p className="text-slate-400">
                            Saber cuánto produjiste cuando ya no puedes corregir errores.
                        </p>
                    </div>

                     {/* Problem 3 */}
                    <div className="bg-white/5 border border-white/5 p-6 rounded-2xl hover:border-white/10 transition-colors">
                        <h3 className="text-cyan-400 text-xl font-bold mb-3">Puntos Ciegos</h3>
                        <p className="text-slate-400">
                           No saber qué está pasando realmente en tu línea ahora mismo.
                        </p>
                    </div>
                </div>

                <div className="mt-16">
                    <p className="text-2xl font-medium text-white italic">
                        &quot;Elimina la suposición. Toma decisiones con datos reales, al instante.&quot;
                    </p>
                </div>

            </motion.div>
        </div>
    </section>
  );
}
