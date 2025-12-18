"use client";

import { motion } from "framer-motion";
import Link from "next/link";



export default function Validation() {
  return (
    <section id="cases" className="py-24 relative">
        {/* Ambient background lighting */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-900/10 rounded-full blur-[128px] pointer-events-none -translate-y-1/2" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[128px] pointer-events-none translate-y-1/2" />
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
                        0%
                    </h3>
                    <p className="text-sm md:text-base font-medium text-slate-400 uppercase tracking-widest">
                        Dependencia de Operario
                    </p>
                </motion.div>
            </div>
            
            {/* Final CTA */}
            {/* Final CTA */}
            <div className="relative mt-32 max-w-5xl mx-auto">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-600/20 blur-3xl rounded-full opacity-50 pointer-events-none" />
                
                <div className="relative bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-12 md:p-20 text-center overflow-hidden group hover:border-cyan-500/30 transition-colors duration-500">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
                    
                    <div className="relative z-10">
                        <h3 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight">
                            Haz que tu operación tenga <br className="hidden md:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                                datos precisos a tiempo
                            </span>.
                        </h3>
                        
                        <p className="text-slate-400 text-lg mb-10 max-w-2xl mx-auto">
                            Descubre cómo nuestra tecnología de visión artificial puede transformar tu línea de producción hoy mismo.
                        </p>

                        <Link href="#contact" className="inline-flex items-center group/btn bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-4 px-10 rounded-full transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(6,182,212,0.5)]">
                            Agendar una Demostración
                            <svg className="w-5 h-5 ml-2 -mr-1 transition-transform group-hover/btn:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    </section>
  );
}
