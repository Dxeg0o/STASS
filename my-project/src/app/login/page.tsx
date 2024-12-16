"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import mongoose from "mongoose";

export default function RegisterPage() {
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
      // Registrar empresa
      const companyResponse = await fetch("/api/companies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: companyName,
          pais: country,
          fecha_registro: new Date().toISOString(),
          _id: new mongoose.Types.ObjectId().toString(),
        }),
      });

      const companyData = await companyResponse.json();
      if (!companyResponse.ok) {
        throw new Error(
          companyData.error || "Error en el registro de la empresa"
        );
      }

      // Obtener el ID de la empresa registrada
      const newCompanyId = companyData.empresa_id;
      setCompanyId(newCompanyId);

      // Registrar usuario
      const userResponse = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: name,
          correo: email,
          contraseña: password,
          empresa_id: newCompanyId,
        }),
      });

      const userData = await userResponse.json();
      if (!userResponse.ok) {
        throw new Error(userData.error || "Error en el registro del usuario");
      }

      setSuccessMessage("Empresa y usuario registrados exitosamente.");
      setCompanyName("");
      setCountry("");
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Algo salió mal.";
      setErrorMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="px-4 lg:px-6 h-16 flex items-center fixed w-full bg-white/80 backdrop-blur-md z-50 shadow-sm">
        <Link className="flex items-center justify-center" href="/">
          <Image
            src="/images/Stass completo.png"
            alt="Logo STASS"
            width={170}
            height={84}
            unoptimized={true}
          />
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-green-800 mb-8 text-center">
            Registro
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
            {/* Datos de la empresa */}
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
              <Input
                id="country"
                type="text"
                placeholder="País de la compañía"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                required
                className="w-full rounded-md bg-white border-green-300 focus:border-green-500 focus:ring-green-500"
              />
            </div>
            {/* Datos del usuario */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-green-700 mb-1"
              >
                Nombre
              </label>
              <Input
                id="name"
                type="text"
                placeholder="Su nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
              {loading ? "Registrando..." : "Registrar"}
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
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-green-700">
          © 2024 STASS. Todos los derechos reservados.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link
            className="text-xs hover:underline underline-offset-4 text-green-700"
            href="#"
          >
            Términos de Servicio
          </Link>
          <Link
            className="text-xs hover:underline underline-offset-4 text-green-700"
            href="#"
          >
            Política de Privacidad
          </Link>
        </nav>
      </footer>
    </div>
  );
}
