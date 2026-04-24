"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, ShieldCheck } from "lucide-react";
import Navbar from "@/components/DeepTech/Navbar";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-slate-950 font-sans text-white selection:bg-cyan-400/30">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[1000px] -translate-x-1/2 rounded-[100%] bg-cyan-500/20 opacity-30 blur-[100px]" />

      <Navbar />

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900/60 p-8 shadow-[0_0_40px_rgba(0,0,0,0.5)] backdrop-blur-xl"
        >
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10">
              <ShieldCheck className="h-7 w-7 text-cyan-400" />
            </div>
            <h1 className="mb-2 text-3xl font-bold tracking-tight text-white">
              Acceso solo por invitación
            </h1>
            <p className="text-sm text-slate-400">
              Para proteger la plataforma, las cuentas nuevas se habilitan únicamente mediante un enlace de invitación válido.
            </p>
          </div>

          <div className="space-y-4 rounded-xl border border-white/10 bg-slate-950/40 p-5">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-5 w-5 text-cyan-400" />
              <div>
                <p className="text-sm font-medium text-white">
                  ¿Necesitas acceso?
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Solicita que un administrador te envíe una invitación por correo electrónico.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex flex-1 items-center justify-center rounded-lg bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition-all hover:bg-cyan-300"
            >
              Ir a iniciar sesión
            </Link>
            <Link
              href="/"
              className="inline-flex flex-1 items-center justify-center rounded-lg border border-white/10 px-4 py-3 font-semibold text-slate-300 transition-all hover:bg-white/5 hover:text-white"
            >
              Volver al inicio
            </Link>
          </div>
        </motion.div>
      </main>

      <footer className="relative z-10 w-full border-t border-white/10 bg-slate-950/80 py-6 text-center backdrop-blur">
        <p className="text-xs text-slate-500">
          © 2025 QualiBlick. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
}
