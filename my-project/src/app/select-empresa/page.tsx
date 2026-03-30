"use client";

import { useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AuthenticationContext } from "@/app/context/AuthContext";
import { Building2, Shield, ChevronRight } from "lucide-react";

export default function SelectEmpresaPage() {
  const { data, loading, selectEmpresa } = useContext(AuthenticationContext);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !data?.id) {
      router.push("/login");
    }
  }, [loading, data, router]);

  const handleSelectEmpresa = async (empresaId: string) => {
    if (selectEmpresa) {
      await selectEmpresa(empresaId);
      router.push("/app");
    }
  };

  const handleAdminPanel = () => {
    router.push("/admin");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-950">
        <div className="spinner border-t-transparent border-cyan-500 border-4 w-8 h-8 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!data?.id) return null;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 font-sans selection:bg-cyan-400/30 text-white overflow-hidden relative">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-cyan-500/20 rounded-[100%] blur-[100px] opacity-30 pointer-events-none" />

      <main className="flex-1 flex items-center justify-center px-4 py-16 relative z-10">
        <div className="w-full max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
              Hola, {data.name}
            </h1>
            <p className="text-slate-400">
              Selecciona la empresa con la que deseas trabajar.
            </p>
          </motion.div>

          <div className="grid gap-4">
            {data.empresas.map((emp, index) => (
              <motion.button
                key={emp.empresaId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                onClick={() => handleSelectEmpresa(emp.empresaId)}
                className="w-full bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-xl p-5 flex items-center gap-4 hover:border-cyan-400/50 hover:bg-slate-800/60 transition-all group cursor-pointer text-left"
              >
                <div className="w-12 h-12 rounded-lg bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6 text-cyan-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white truncate">
                    {emp.empresaNombre}
                  </h3>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300 capitalize">
                    {emp.rol}
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
              </motion.button>
            ))}

            {data.isSuperAdmin && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: data.empresas.length * 0.1 }}
                onClick={handleAdminPanel}
                className="w-full bg-slate-900/60 backdrop-blur-xl border border-amber-500/30 rounded-xl p-5 flex items-center gap-4 hover:border-amber-400/60 hover:bg-slate-800/60 transition-all group cursor-pointer text-left"
              >
                <div className="w-12 h-12 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white">
                    Panel Administrador
                  </h3>
                  <p className="text-xs text-slate-400">
                    Gestión completa de la plataforma
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-amber-400 transition-colors flex-shrink-0" />
              </motion.button>
            )}
          </div>
        </div>
      </main>

      <footer className="py-6 w-full border-t border-white/10 text-center relative z-10 bg-slate-950/80 backdrop-blur">
        <p className="text-xs text-slate-500">
          © 2025 QualiBlick. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
}
