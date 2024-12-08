"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [companyName, setCompanyName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Registration attempt with:", {
      email,
      password,
      confirmPassword,
      companyName,
    });
    // Here you would typically handle the registration logic
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
            Registrarse
          </h1>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-all duration-200 transform hover:scale-105"
            >
              Registrarse
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
