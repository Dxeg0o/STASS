"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Navbar from "@/components/DeepTech/Navbar";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      // Registrar la empresa primero
      const empresaResponse = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: companyName,
          pais: country,
          fechaRegistro: new Date(),
        }),
      });

      const empresaData = await empresaResponse.json();
      if (!empresaResponse.ok) {
        throw new Error(empresaData.error || "Error al registrar la empresa");
      }

      // Registrar el usuario con el ID de empresa
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: username,
          correo: email,
          contraseña: password,
          empresaId: empresaData._id,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Error en el registro");
      }

      setSuccessMessage("Usuario y empresa registrados exitosamente.");
      // Limpiar formulario se podría hacer aquí, o redirigir
      setUsername("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setCompanyName("");
      setCountry("");
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Algo salió mal."
      );
    } finally {
      setLoading(false);
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
          className="w-full max-w-lg bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-[0_0_40px_rgba(0,0,0,0.5)]"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
              Crear Cuenta
            </h1>
            <p className="text-slate-400 text-sm">
              Registra tu empresa y comienza a digitalizar tu producción.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm text-center">
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-400 text-sm text-center">
                {successMessage}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                <label htmlFor="companyName" className="text-xs font-medium text-cyan-400 block uppercase tracking-wider">
                    Nombre Compañía
                </label>
                <input
                    id="companyName"
                    type="text"
                    placeholder="Empresa SpA"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all text-sm"
                />
                </div>

                <div className="space-y-2">
                <label htmlFor="country" className="text-xs font-medium text-cyan-400 block uppercase tracking-wider">
                    País
                </label>
                <select
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    required
                    className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2 text-white/50 focus:text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all text-sm appearance-none"
                    style={{ color: country ? 'white' : undefined }}
                >
                    <option value="" disabled className="bg-slate-900 text-slate-500">Seleccionar país</option>
                    <option value="Chile" className="bg-slate-900">Chile</option>
                    <option value="Argentina" className="bg-slate-900">Argentina</option>
                    <option value="Mexico" className="bg-slate-900">México</option>
                    <option value="Peru" className="bg-slate-900">Perú</option>
                    <option value="Colombia" className="bg-slate-900">Colombia</option>
                    <option value="Otro" className="bg-slate-900">Otro</option>
                </select>
                </div>
            </div>

            <div className="space-y-2">
                <label htmlFor="username" className="text-xs font-medium text-cyan-400 block uppercase tracking-wider">
                    Nombre Completo
                </label>
                <input
                    id="username"
                    type="text"
                    placeholder="Juan Pérez"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all text-sm"
                />
            </div>

            <div className="space-y-2">
                <label htmlFor="email" className="text-xs font-medium text-cyan-400 block uppercase tracking-wider">
                    Correo Electrónico
                </label>
                <input
                    id="email"
                    type="email"
                    placeholder="juan@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all text-sm"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label htmlFor="password" className="text-xs font-medium text-cyan-400 block uppercase tracking-wider">
                        Contraseña
                    </label>
                    <input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all text-sm"
                    />
                </div>

                <div className="space-y-2">
                    <label htmlFor="confirmPassword" className="text-xs font-medium text-cyan-400 block uppercase tracking-wider">
                        Confirmar Contraseña
                    </label>
                    <input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all text-sm"
                    />
                </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full mt-6 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold py-3 px-4 rounded-lg transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] flex items-center justify-center ${
                loading ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : "Registrarse"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-400">
            ¿Ya tienes una cuenta?{" "}
            <Link
              href="/login"
              className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors hover:underline underline-offset-4"
            >
              Inicia sesión aquí
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
