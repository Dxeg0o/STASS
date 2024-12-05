"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Menu, X } from "lucide-react";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Email enviado:", email);
    setEmail("");
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="px-4 lg:px-6 h-16 flex items-center fixed w-full bg-white/80 backdrop-blur-md z-50 shadow-sm">
        <Link className="flex items-center justify-center" href="#">
          <Image
            src="/images/logo2.png"
            alt="Logo"
            width={140}
            height={84}
            unoptimized={true}
          />
        </Link>
        <nav className="ml-auto hidden md:flex gap-4 sm:gap-6">
          <Link
            className="text-sm font-medium text-red-800 hover:text-red-600 transition-colors"
            href="#steps"
          >
            Pasos
          </Link>
          <Link
            className="text-sm font-medium text-red-800 hover:text-red-600 transition-colors"
            href="#results"
          >
            Resultados
          </Link>
          <Link
            className="text-sm font-medium text-red-800 hover:text-red-600 transition-colors"
            href="#contact"
          >
            Contacto
          </Link>
        </nav>
        <Link
          className="ml-4 hidden md:inline-flex border-red-600 text-red-600 hover:bg-red-50 border rounded-md py-1 px-2"
          href={"/login"}
        >
          Iniciar Sesión
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto md:hidden text-red-600"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </Button>
      </header>
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-white md:hidden pt-16">
          <nav className="flex flex-col items-center gap-4 p-4">
            <Link
              className="text-lg font-medium text-red-800 hover:text-red-600 transition-colors"
              href="#steps"
              onClick={() => setIsMenuOpen(false)}
            >
              Pasos
            </Link>
            <Link
              className="text-lg font-medium text-red-800 hover:text-red-600 transition-colors"
              href="#results"
              onClick={() => setIsMenuOpen(false)}
            >
              Resultados
            </Link>
            <Link
              className="text-lg font-medium text-red-800 hover:text-red-600 transition-colors"
              href="#contact"
              onClick={() => setIsMenuOpen(false)}
            >
              Contacto
            </Link>
            <Link
              className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white"
              href={"/login"}
            >
              Iniciar Sesión
            </Link>
          </nav>
        </div>
      )}
      <main className="flex-1 md:mt-0 mt-12">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container mx-auto px-4 md:px-6 max-w-7xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col space-y-4"
              >
                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-5xl lg:text-6xl text-red-800 text-center md:text-left px-6 md:px-0">
                  Optimiza la{" "}
                  <span className="inline underline md:underline-offset-4 underline-offset-2 decoration-[#fdfa33]">
                    calidad
                  </span>{" "}
                  en tus exportaciones de cerezas
                </h1>
                <h2 className="max-w-[600px] text-red-700 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed text-center md:text-justify px-6 md:px-0">
                  Detectamos hasta un <strong>80% más</strong> de productos
                  <strong> fuera de estándar</strong> mediante tecnología de
                  punta, sin grandes inversiones iniciales.
                </h2>
                <div className="flex flex-col sm:flex-row gap-4 mt-4">
                  <div className=" flex justify-center">
                    <Link
                      className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-md transition-all duration-200 transform hover:scale-105 max-w-40"
                      href={"/demo"}
                    >
                      Ver Demo
                    </Link>
                  </div>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="flex items-end justify-center"
              >
                <Image
                  src="/images/—Pngtree—cherry clipart vector logo_7269809.png"
                  alt="Cherry quality control"
                  width={550}
                  height={300}
                  className="rounded-lg w-3/4 md:w-full max-w-[550px] h-auto object-cover mt-6 md:mt-0"
                />
              </motion.div>
            </div>
          </div>
        </section>
        <section id="steps" className="bg-red-50">
          <div className="w-full py-12 md:py-24 lg:py-32">
            <div className="container mx-auto px-4 md:px-6 max-w-7xl">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-center mb-12 text-red-800">
                Cómo Funciona
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                <div className="flex flex-col items-center text-center">
                  <div className="bg-red-100 p-3 rounded-full mb-4">
                    <CheckCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-red-800">
                    Escaneo de Cerezas
                  </h3>
                  <p className="text-red-700">
                    Nuestro sistema escanea cada cereza individualmente
                    utilizando tecnología de visión por computadora avanzada.
                  </p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="bg-red-100 p-3 rounded-full mb-4">
                    <CheckCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-red-800">
                    Análisis de Calidad
                  </h3>
                  <p className="text-red-700">
                    Los algoritmos de IA analizan cada cereza en tiempo real,
                    detectando imperfecciones y clasificando según los
                    estándares de calidad.
                  </p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="bg-red-100 p-3 rounded-full mb-4">
                    <CheckCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-red-800">
                    Optimización Continua
                  </h3>
                  <p className="text-red-700">
                    El sistema aprende y mejora constantemente, adaptándose a
                    nuevas variedades de cerezas y estándares de calidad.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="results" className="w-full py-12 md:py-24 lg:py-32 ">
          <div className="container mx-auto px-4 md:px-6 max-w-7xl">
            <h3 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-center mb-12 text-red-800">
              Resultados Comprobados
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-white p-6 rounded-lg shadow-lg text-center"
              >
                <h4 className="text-4xl font-bold text-red-600 mb-2">35%</h4>
                <p className="text-red-800 font-semibold">
                  Reducción de Costos Operativos
                </p>
                <p className="text-sm text-red-700 mt-2">
                  Promedio entre nuestros clientes
                </p>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-white p-6 rounded-lg shadow-lg text-center"
              >
                <h3 className="text-4xl font-bold text-red-600 mb-2">99.5%</h3>
                <p className="text-red-800 font-semibold">
                  Precisión en Control de Calidad
                </p>
                <p className="text-sm text-red-700 mt-2">
                  Utilizando nuestra tecnología de escaneo
                </p>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-white p-6 rounded-lg shadow-lg text-center"
              >
                <h3 className="text-4xl font-bold text-red-600 mb-2">30%</h3>
                <p className="text-red-800 font-semibold">Aumento en ROI</p>
                <p className="text-sm text-red-700 mt-2">
                  En el primer año de implementación
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        <section id="faq" className="w-full py-12 md:py-24 lg:py-32 bg-red-50">
          <div className="container mx-auto px-4 md:px-6 max-w-7xl">
            <h4 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-center mb-12 text-red-800">
              Preguntas Frecuentes
            </h4>
            <Accordion
              type="single"
              collapsible
              className="w-full max-w-3xl mx-auto"
            >
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-red-800 text-lg">
                  ¿Cómo funciona la tecnología de escaneo para cerezas?
                </AccordionTrigger>
                <AccordionContent className="text-red-700">
                  Nuestra tecnología utiliza cámaras de alta resolución y
                  algoritmos de inteligencia artificial avanzados para detectar
                  imperfecciones en las cerezas con una precisión del 99.5%. El
                  sistema analiza cada cereza individualmente, considerando
                  factores como tamaño, forma, color y textura.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger className="text-red-800 text-lg">
                  ¿Cuánto tiempo toma implementar el sistema?
                </AccordionTrigger>
                <AccordionContent className="text-red-700">
                  La implementación típica toma entre 2 y 3 semanas, dependiendo
                  del tamaño de su operación y los requisitos específicos.
                  Nuestro equipo de expertos trabaja estrechamente con su
                  personal para asegurar una transición suave y una integración
                  perfecta con sus procesos existentes de selección de cerezas.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger className="text-red-800 text-lg">
                  ¿Ofrecen soporte técnico continuo?
                </AccordionTrigger>
                <AccordionContent className="text-red-700">
                  Sí, ofrecemos soporte técnico 24/7 y actualizaciones regulares
                  del software para asegurar que su sistema siempre esté
                  funcionando de manera óptima. Nuestro equipo de soporte está
                  altamente capacitado y puede resolver la mayoría de los
                  problemas de forma remota, minimizando el tiempo de
                  inactividad en su línea de producción de cerezas.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        <section id="contact" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container mx-auto px-4 md:px-6 max-w-7xl">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h4 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-red-800">
                  ¿Listo para mejorar la calidad de sus exportaciones de
                  cerezas?
                </h4>
                <p className="mx-auto max-w-[600px] text-red-700 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Contáctenos hoy mismo para una demostración gratuita y
                  descubra cómo podemos optimizar sus procesos de exportación de
                  cerezas.
                </p>
              </div>
              <div className="w-full max-w-sm space-y-2">
                <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                  <Input
                    type="email"
                    placeholder="Su correo electrónico"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="rounded-md bg-white"
                  />
                  <Button
                    type="submit"
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-all duration-200 transform hover:scale-105"
                  >
                    Solicitar Información
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-red-700">
          © 2024 STASS. Todos los derechos reservados.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link
            className="text-xs hover:underline underline-offset-4 text-red-700"
            href="#"
          >
            Términos de Servicio
          </Link>
          <Link
            className="text-xs hover:underline underline-offset-4 text-red-700"
            href="#"
          >
            Política de Privacidad
          </Link>
        </nav>
      </footer>
    </div>
  );
}
