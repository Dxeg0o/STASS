"use client";

import { Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer id="contact" className="bg-slate-950 border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center text-center md:text-left">
            <div className="mb-6 md:mb-0">
                <p className="text-white font-bold text-lg mb-2">Qualiblick</p>
                <p className="text-slate-500 text-sm">
                    © 2025 Qualiblick. Inteligencia Artificial para el Agro Real.
                </p>
            </div>
            
            <a href="mailto:dsoler.olguin@gmail.com" className="flex items-center space-x-2 text-slate-400 hover:text-cyan-400 transition-colors">
                <Mail className="w-5 h-5" />
                <span>dsoler.olguin@gmail.com</span>
            </a>
        </div>
    </footer>
  );
}
