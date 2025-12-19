"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import Navbar from "@/components/DeepTech/Navbar";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error en las credenciales.");
      }

      router.push("/app");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ocurrió un error inesperado.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 font-sans selection:bg-cyan-400/30 text-white overflow-hidden relative">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-cyan-500/20 rounded-[100%] blur-[100px] opacity-30 pointer-events-none" />

      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-32 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-[0_0_40px_rgba(0,0,0,0.5)]"
        >
          <div className="text-center mb-8">
             <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
              Bienvenido de nuevo
            </h1>
            <p className="text-slate-400 text-sm">
              Ingresa tus credenciales para acceder a la plataforma.
            </p>
          </div>
         
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm text-center">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-cyan-400 block"
              >
                Correo Electrónico
              </label>
              <input
                id="email"
                type="email"
                placeholder="nombre@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                    htmlFor="password"
                    className="text-sm font-medium text-cyan-400 block"
                >
                    Contraseña
                </label>
                <Link href="#" className="text-xs text-slate-400 hover:text-cyan-400 transition-colors">
                    ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold py-3 px-4 rounded-lg transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] flex items-center justify-center ${
                isLoading ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : "Iniciar Sesión"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-400">
            ¿No tienes una cuenta?{" "}
            <Link
              href="/register"
              className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors hover:underline underline-offset-4"
            >
              Regístrate aquí
            </Link>
          </p>
        </motion.div>
      </main>

      <footer className="py-6 w-full border-t border-white/10 text-center relative z-10 bg-slate-950/80 backdrop-blur">
            <p className="text-xs text-slate-500">
            © 2025 QualiBlick. Todos los derechos reservados.
            </p>
      </footer>
    </div>
  );
}
