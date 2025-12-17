"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center">
              <Image src="/images/qb.png" alt="Qualiblick" width={120} height={48} className="h-12 w-auto py-1.5" />
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <Link href="/#technology" className="text-slate-300 hover:text-cyan-400 transition-colors px-3 py-2 rounded-md text-sm font-medium">
                Tecnología
              </Link>
              <Link href="/#cases" className="text-slate-300 hover:text-cyan-400 transition-colors px-3 py-2 rounded-md text-sm font-medium">
                Casos de Éxito
              </Link>
              <Link href="/login" className="text-slate-300 hover:text-cyan-400 transition-colors px-3 py-2 rounded-md text-sm font-medium">
                Ingresar
              </Link>
              <Link href="/register" className="text-slate-300 hover:text-cyan-400 transition-colors px-3 py-2 rounded-md text-sm font-medium">
                Registrarse
              </Link>
            </div>
          </div>

          {/* CTA Button */}
          <div className="hidden md:block">
            <Link href="#contact" className="inline-block bg-transparent hover:bg-cyan-400/10 text-cyan-400 font-semibold hover:text-cyan-300 py-2 px-4 border border-cyan-400 hover:border-cyan-300 rounded transition-all shadow-[0_0_10px_rgba(34,211,238,0.2)] hover:shadow-[0_0_20px_rgba(34,211,238,0.4)]">
              Agendar Demo
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-slate-950 border-b border-white/10">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link href="/#technology" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">
              Tecnología
            </Link>
            <Link href="/#cases" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">
              Casos de Éxito
            </Link>
            <Link href="/login" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">
              Ingresar
            </Link>
            <Link href="/register" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">
              Registrarse
            </Link>
            <Link href="#contact" className="block w-full mt-4 bg-transparent hover:bg-cyan-400/10 text-cyan-400 font-semibold py-2 px-4 border border-cyan-400 rounded transition-all text-center">
              Agendar Demo
            </Link>
          </div>
        </div>
      )}
    </motion.nav>
  );
}
