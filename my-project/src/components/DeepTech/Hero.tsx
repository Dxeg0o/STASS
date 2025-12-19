"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { ScanFace, Calendar } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-28 lg:pt-0 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:linear-gradient(to_bottom,black_60%,transparent_100%)]" />
      
      {/* Dynamic Spotlights */}
      <div className="absolute top-0 left-1/4 -translate-x-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-0 right-1/4 translate-x-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          {/* Text Content */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center lg:text-left"
          >
            <div className="flex items-center justify-center lg:justify-start space-x-2 mb-8">
                <div className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold bg-cyan-950/30 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.15)] backdrop-blur-sm">
                    <Zap className="w-3.5 h-3.5 mr-2 fill-cyan-400/20" /> 
                    <span className="tracking-wider">TECNOLOGÍA PARA LA AGROINDUSTRIA</span>
                </div>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-white mb-8 leading-tight">
              Control total de tu <br />
              <span className="relative inline-block mt-2">
                <span className="absolute -inset-1 bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 blur-md rounded-lg transform -skew-x-6" />
                <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-cyan-200 to-emerald-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.2)]">
                  Producción.
                </span>
              </span> <br />
              <span className="text-3xl sm:text-4xl lg:text-5xl text-slate-400 font-medium tracking-normal mt-2 block">
                Sin estimaciones, sin errores.
              </span>
            </h1>
            
            <p className="text-lg lg:text-xl text-slate-300 mb-10 max-w-lg mx-auto lg:mx-0 leading-relaxed font-light">
              Mide en <strong className="text-white font-semibold">tiempo real</strong> lo que realmente está pasando en tu planta, con datos confiables y oportunos.
            </p>

            <div className="flex flex-col sm:flex-row gap-5 justify-center lg:justify-start items-center">
              <Link href="#contact" className="group relative bg-cyan-400 text-slate-950 font-bold py-4 px-8 rounded-xl hover:bg-cyan-300 transition-all shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_40px_rgba(34,211,238,0.6)] hover:-translate-y-1 w-full sm:w-auto text-center overflow-hidden">
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Agendar Demostración
                  <Calendar className="w-5 h-5 opacity-70 group-hover:scale-110 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              </Link>

              <Link href="#cases" className="group relative px-8 py-4 rounded-xl bg-slate-800/50 text-white font-medium border border-white/10 hover:border-emerald-500/50 hover:bg-slate-800/80 transition-all w-full sm:w-auto flex items-center justify-center gap-3 backdrop-blur-md overflow-hidden">
                
                {/* Button Glow on Hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
                
                <span className="relative z-10 group-hover:text-emerald-300 transition-colors">Ver caso Valdivia Lilies</span>
                <svg className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
             <p className="mt-6 text-slate-500 text-sm flex items-center justify-center lg:justify-start gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Precisión validada en operación real.
             </p>
          </motion.div>

          {/* Visual Simulation (Fake UI) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative h-[300px] sm:h-[400px] lg:h-[500px] w-full flex items-center justify-center select-none pointer-events-none mt-8 lg:mt-0"
          >
            <div className="relative w-full aspect-square max-w-md mx-auto">
                {/* Blob Background */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-4/5 bg-cyan-500/20 rounded-full blur-3xl animate-pulse-slow" />

                {/* Simulated 3D Scanner Container */}
                <div className="absolute inset-0 bg-black/80 rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-cyan-900/20 backdrop-blur-lg">
                    <video
                        className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-screen"
                        autoPlay
                        loop
                        muted
                        playsInline
                    >
                        <source src="/videos/example2.mp4" type="video/mp4" />
                    </video>
                    
                    {/* Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-cyan-950/50 to-transparent" />

                    {/* Grid Pattern inside */}
                    <div className="absolute inset-0 opacity-30 bg-[linear-gradient(rgba(34,211,238,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.1)_1px,transparent_1px)] bg-[size:30px_30px]" />
                    
                    {/* Scanning Line */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-cyan-400/80 shadow-[0_0_20px_rgba(34,211,238,1)] animate-[scan_3s_ease-in-out_infinite] z-20" />

                     {/* Dashboard Overlay */}
                     <div className="absolute bottom-6 left-6 right-6 bg-slate-950/90 backdrop-blur-xl border border-cyan-500/20 rounded-xl p-4 shadow-lg z-30">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                                <ScanFace className="text-cyan-400 w-4 h-4" />
                                <span className="text-xs text-cyan-100 font-mono tracking-wider">OBJECT_DETECTION</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span className="text-xs text-emerald-400 font-mono font-bold">LIVE</span>
                            </div>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mb-2">
                            <div className="h-full w-[92%] bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]"></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                           <span>Confidence: 98.2%</span>
                           <span>Latency: 12ms</span>
                        </div>
                     </div>
                </div>
            </div>
          </motion.div>

        </div>
      </div>
      
      <style jsx global>{`
        @keyframes scan {
            0% { top: 10%; opacity: 0; }
            15% { opacity: 1; }
            85% { opacity: 1; }
            100% { top: 90%; opacity: 0; }
        }
        .animate-pulse-slow {
            animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </section>
  );
}
