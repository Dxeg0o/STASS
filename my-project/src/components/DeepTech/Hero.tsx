"use client";

import { motion } from "framer-motion";
import { ScanFace, Zap } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden bg-slate-950">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Text Content */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center space-x-2 mb-6">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">
                    <Zap className="w-3 h-3 mr-1" /> Tecnología Validada Industrialmente
                </span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-white mb-6 leading-tight">
              Digitaliza tu <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
                Producción Real.
              </span> <br />
              Sin Estimaciones.
            </h1>
            
            <p className="text-lg lg:text-xl text-slate-400 mb-8 max-w-lg leading-relaxed">
              Plataforma de visión artificial autónoma que transforma flujos físicos en datos financieros exactos.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button className="bg-cyan-400 text-slate-950 font-bold py-3 px-8 rounded hover:bg-cyan-300 transition-colors shadow-[0_0_20px_rgba(34,211,238,0.3)]">
                Agendar Demo
              </button>
              <button className="bg-transparent border border-slate-700 text-slate-300 font-medium py-3 px-8 rounded hover:border-slate-500 hover:text-white transition-colors">
                Ver Tecnología
              </button>
            </div>

            <div className="mt-12 flex items-center space-x-8 text-slate-500 text-sm">
                <div>
                   <span className="block text-2xl font-bold text-white">97.54%</span>
                   <span>Precisión en Conteo</span>
                </div>
                <div className="h-8 w-px bg-slate-800"></div>
                 <div>
                   <span className="block text-2xl font-bold text-white">Edge AI</span>
                   <span>Nvidia Jetson Included</span>
                </div>
            </div>
          </motion.div>

          {/* Visual Simulation */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="relative w-full aspect-square max-w-md mx-auto">
                {/* Simulated 3D Scanner Container */}
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-emerald-500/10 rounded-2xl border border-white/5 backdrop-blur-sm overflow-hidden">
                    {/* Grid Pattern inside */}
                    <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />
                    
                    {/* Simulated "Point Cloud" - Random dots */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
                    
                    {/* Scanning Line */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_rgba(34,211,238,0.8)] animate-[scan_3s_ease-in-out_infinite]" />

                     {/* Dashboard Overlay */}
                     <div className="absolute bottom-4 left-4 right-4 bg-slate-900/80 backdrop-blur border border-white/10 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                                <ScanFace className="text-cyan-400 w-4 h-4" />
                                <span className="text-xs text-cyan-200 font-mono">OBJECT_DETECTION_ACTIVE</span>
                            </div>
                            <span className="text-xs text-emerald-400 font-mono">LIVE</span>
                        </div>
                        <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full w-[85%] bg-cyan-400 rounded-full animate-pulse"></div>
                        </div>
                        <div className="flex justify-between mt-1 text-[10px] text-slate-400 font-mono">
                           <span>FPS: 14.2</span>
                           <span>LATENCY: 12ms</span>
                        </div>
                     </div>
                </div>
            </div>
          </motion.div>

        </div>
      </div>
      
      <style jsx global>{`
        @keyframes scan {
            0% { top: 0%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </section>
  );
}
