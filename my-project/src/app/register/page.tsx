"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar"; // <-- Importa el Navbar

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
    <div className="flex flex-col min-h-screen bg-white">
      {/* Navbar en lugar de header */}
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-green-800 mb-8 text-center">
            Registrarse
          </h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <p className="text-sm text-red-500 text-center">{errorMessage}</p>
            )}
            {successMessage && (
              <p className="text-sm text-green-500 text-center">
                {successMessage}
              </p>
            )}

            {/* Campos de formulario */}
            <div>
              <label
                htmlFor="companyName"
                className="block text-sm font-medium text-green-700 mb-1"
              >
                Nombre de la Compañía
              </label>
              <Input
                id="companyName"
                type="text"
                placeholder="Nombre de su compañía"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                className="w-full rounded-md bg-white border-green-300 focus:border-green-500 focus:ring-green-500"
              />
            </div>

            <div>
              <label
                htmlFor="country"
                className="block text-sm font-medium text-green-700 mb-1"
              >
                País
              </label>
              <select
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                required
                className="w-full text-gray-500 rounded-md bg-white border border-green-300 focus:border-green-500 focus:ring-green-500 h-10 px-3 py-2 text-sm appearance-none"
              >
                <option value="">Seleccione su país</option>
                {/* ...opciones... */}
                <option value="Chile">Chile</option>
                <option value="Argentina">Argentina</option>
                {/* resto de países */}
              </select>
            </div>

            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-green-700 mb-1"
              >
                Nombre de la persona
              </label>
              <Input
                id="username"
                type="text"
                placeholder="Nombre del administrador"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full rounded-md bg-white border-green-300 focus:border-green-500 focus:ring-green-500"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-green-700 mb-1"
              >
                Correo Electrónico
              </label>
              <Input
                id="email"
                type="email"
                placeholder="Su correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-md bg-white border-green-300 focus:border-green-500 focus:ring-green-500"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-green-700 mb-1"
              >
                Contraseña
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Su contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-md bg-white border-green-300 focus:border-green-500 focus:ring-green-500"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-green-700 mb-1"
              >
                Confirmar Contraseña
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirme su contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full rounded-md bg-white border-green-300 focus:border-green-500 focus:ring-green-500"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-all duration-200 transform hover:scale-105"
            >
              {loading ? "Registrando..." : "Registrarse"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-green-700">
            ¿Ya tiene una cuenta?{" "}
            <Link
              href="/login"
              className="font-medium text-green-600 hover:underline"
            >
              Inicie sesión aquí
            </Link>
          </p>
        </motion.div>
      </main>

      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full items-center px-4 md:px-6 border-t">
        <p className="text-xs text-green-700">
          © 2024 QualiBlick. Todos los derechos reservados.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link
            href="#"
            className="text-xs hover:underline underline-offset-4 text-green-700"
          >
            Términos de Servicio
          </Link>
          <Link
            href="#"
            className="text-xs hover:underline underline-offset-4 text-green-700"
          >
            Política de Privacidad
          </Link>
        </nav>
      </footer>
    </div>
  );
}
