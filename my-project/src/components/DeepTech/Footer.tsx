"use client";

import { Mail, MapPin } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer id="contact" className="pt-16 pb-8 text-center md:text-left relative overflow-hidden">
        {/* Ambient background lighting for footer */}
         <div className="absolute bottom-0 left-1/2 w-[500px] h-[300px] bg-cyan-900/10 rounded-full blur-[100px] pointer-events-none -translate-x-1/2 translate-y-1/2" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
                
                {/* Column 1: Brand */}
                <div className="col-span-1">
                    <h3 className="text-2xl font-bold text-white mb-4">Qualiblick</h3>
                    <p className="text-slate-400 text-sm leading-relaxed mb-6">
                        Transformando la agroindustria mediante visión artificial y datos claves de alta precisión.
                    </p>
                    <div className="text-slate-500 text-xs">
                        © 2025 Qualiblick Inc.
                    </div>
                </div>

                {/* Column 2: Links */}
                <div className="col-span-1">
                    <h4 className="text-white font-medium mb-4">Plataforma</h4>
                    <ul className="space-y-3 text-sm text-slate-400">
                        <li>
                            <Link href="#technology" className="hover:text-cyan-400 transition-colors">
                                Arquitectura
                            </Link>
                        </li>
                        <li>
                            <Link href="#cases" className="hover:text-cyan-400 transition-colors">
                                Casos de Éxito
                            </Link>
                        </li>
                        <li>
                            <Link href="/login" className="hover:text-cyan-400 transition-colors">
                                Ingresar
                            </Link>
                        </li>
                        <li>
                            <Link href="/register" className="hover:text-cyan-400 transition-colors">
                                Registrarse
                            </Link>
                        </li>
                    </ul>
                </div>

                {/* Column 3: Contact */}
                <div className="col-span-1">
                    <h4 className="text-white font-medium mb-4">Contacto</h4>
                    <ul className="space-y-4 text-sm text-slate-400">
                        <li>
                            <a href="mailto:contacto@qualiblick.com" className="flex items-center space-x-3 hover:text-cyan-400 transition-colors group">
                                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 group-hover:border-cyan-400/30 transition-colors">
                                    <Mail className="w-4 h-4" />
                                </div>
                                <span>contacto@qualiblick.com</span>
                            </a>
                        </li>
                        <li>
                            <div className="flex items-center space-x-3 text-slate-400">
                                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                                     <MapPin className="w-4 h-4" />
                                </div>
                                <span>Santiago, Chile</span>
                            </div>
                        </li>
                    </ul>
                </div>

            </div>
            
            <div className="border-t border-white/5 pt-8 text-center md:text-left">
                 <p className="text-slate-600 text-xs">
                    Designed for High-Throughput Environments.
                </p>
            </div>
        </div>
    </footer>
  );
}
