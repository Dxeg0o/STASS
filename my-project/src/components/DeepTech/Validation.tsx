"use client";

import { motion } from "framer-motion";
import Link from "next/link";



export default function Validation() {
  return (
    <section id="cases" className="py-24 bg-slate-950 border-t border-white/5 relative bg-[linear-gradient(to_bottom,#020617,#0f172a)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-16 text-center">
                 <span className="text-cyan-400 font-bold uppercase tracking-widest text-sm mb-2 block">Caso de Éxito</span>
                 <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Valdivia Lilies</h2>
                 <p className="text-slate-300 text-lg max-w-3xl mx-auto leading-relaxed">
                    &quot;Nuestra tecnología ha superado uno de los desafíos más difíciles de visión artificial: El Bulbo de Lilium (formas irregulares, suciedad y superposición). Si podemos contar esto con precisión, podemos medir tu producción.&quot;
                 </p>
                 <div className="mt-8 inline-block bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1">
                    <span className="text-emerald-400 text-sm font-medium">Tecnología probada bajo estándares de Holanda y Chile.</span>
                 </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center divide-y md:divide-y-0 md:divide-x divide-white/10 mb-20">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="py-8 md:py-0 px-4"
                >
                    <h3 className="text-5xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-4">
                        97.54%
                    </h3>
                    <p className="text-sm md:text-base font-medium text-slate-400 uppercase tracking-widest">
                        Precisión en Conteo de Bulbos
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="py-8 md:py-0 px-4"
                >
                    <h3 className="text-5xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-4">
                        24/7
                    </h3>
                    <p className="text-sm md:text-base font-medium text-slate-400 uppercase tracking-widest">
                        Operación Continua
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 }}
                    className="py-8 md:py-0 px-4"
                >
                    <h3 className="text-5xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-4">
                        0
                    </h3>
                    <p className="text-sm md:text-base font-medium text-slate-400 uppercase tracking-widest">
                        Dependencia de Nube
                    </p>
                </motion.div>
            </div>
            
            {/* Final CTA */}
            <div className="text-center bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border border-white/5 rounded-3xl p-12 max-w-4xl mx-auto">
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-6">Haz que tu operación tenga datos precisos a tiempo.</h3>
                <Link href="#contact" className="inline-block bg-white text-slate-950 font-bold py-3 px-8 rounded hover:bg-slate-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                    Agendar una Demostración
                </Link>
            </div>
        </div>
    </section>
  );
}
