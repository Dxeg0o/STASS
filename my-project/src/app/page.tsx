"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  CheckCircle,
  BarChart,
  ShieldCheck,
  Globe2,
} from "lucide-react";
import { motion } from "framer-motion";
import { ProductCard } from "@/components/landing/product-card";

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
        <nav className="ml-auto hidden md:flex gap-6">
          <Link
            className="text-sm font-medium text-gray-800 hover:text-green-600 transition-colors"
            href="#soluciones"
          >
            Soluciones
          </Link>
          <Link
            className="text-sm font-medium text-gray-800 hover:text-green-600 transition-colors"
            href="#beneficios"
          >
            Beneficios
          </Link>
          <Link
            className="text-sm font-medium text-gray-800 hover:text-green-600 transition-colors"
            href="#sobre-nosotros"
          >
            Sobre Nosotros
          </Link>
          <Link
            className="text-sm font-medium text-gray-800 hover:text-green-600 transition-colors"
            href="#contacto"
          >
            Contacto
          </Link>
        </nav>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto md:hidden text-gray-600"
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
              className="text-lg font-medium text-gray-800 hover:text-green-600 transition-colors"
              href="#soluciones"
              onClick={() => setIsMenuOpen(false)}
            >
              Soluciones
            </Link>
            <Link
              className="text-lg font-medium text-gray-800 hover:text-green-600 transition-colors"
              href="#beneficios"
              onClick={() => setIsMenuOpen(false)}
            >
              Beneficios
            </Link>
            <Link
              className="text-lg font-medium text-gray-800 hover:text-green-600 transition-colors"
              href="#sobre-nosotros"
              onClick={() => setIsMenuOpen(false)}
            >
              Sobre Nosotros
            </Link>
            <Link
              className="text-lg font-medium text-gray-800 hover:text-green-600 transition-colors"
              href="#contacto"
              onClick={() => setIsMenuOpen(false)}
            >
              Contacto
            </Link>
          </nav>
        </div>
      )}
      <main className="flex-1 pt-16">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-[#f1faf5]">
          <div className="container mx-auto px-4 md:px-6 max-w-5xl">
            <div className="text-center">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl text-[#024521]"
              >
                Control inteligente de{" "}
                <span className="underline decoration-[#f3c301]">calidad</span>{" "}
                para asegurar tus exportaciones
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-4 text-xl text-[#03312e] max-w-3xl mx-auto"
              >
                Ayudamos a las pymes exportadoras a{" "}
                <strong>garantizar la calidad</strong> de sus productos,
                reduciendo hasta un{" "}
                <strong>30% los costos de inspección manual</strong>. Todo esto
                con tecnología de punta, sin necesidad de grandes inversiones.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="mt-8"
              >
                <Link
                  href="#soluciones"
                  className="inline-block bg-[#058240] hover:bg-[#058240]/90 text-[white] font-bold py-3 px-8 rounded-full text-lg transition-all duration-200 transform hover:scale-105"
                >
                  Descubra Nuestras Soluciones
                </Link>
              </motion.div>
            </div>
          </div>
        </section>

        <section
          id="soluciones"
          className="w-full py-16 md:py-24 lg:py-32 bg-[white]"
        >
          <div className="container mx-auto px-4 md:px-6">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-center mb-12 text-[#024521]">
              Soluciones adaptadas a tus productos
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8">
              <ProductCard name="Uvas" linkHref="/uvas" />
              <ProductCard name="Espárragos" linkHref="/esparragos" />
              <ProductCard name="Cerezas" linkHref="/cerezas" />
            </div>
          </div>
        </section>

        <section
          id="beneficios"
          className="w-full py-16 md:py-24 lg:py-32 bg-[#f1faf5]"
        >
          <div className="container mx-auto px-4 md:px-6 max-w-7xl">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-center mb-12 text-[#024521]">
              Beneficios Clave
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-white p-6 rounded-xl shadow-md text-center"
              >
                <div className="text-green-600 mb-4">
                  <ShieldCheck size={48} className="mx-auto" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Cumplimiento y Confianza
                </h3>
                <p className="text-gray-600">
                  Monitorea el cumplimiento de tus proveedores en tiempo real,
                  detectando rápidamente insumos fuera de estándar. Asegura un
                  producto final confiable y apto para los mercados más
                  exigentes.
                </p>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-white p-6 rounded-xl shadow-md text-center"
              >
                <div className="text-green-600 mb-4">
                  <BarChart size={48} className="mx-auto" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Reducción de Costos Reales
                </h3>
                <p className="text-gray-600">
                  Reduce mermas y costos ocasionados por producto defectuoso,
                  disminuye la dependencia de inspecciones manuales
                  ineficientes, y aumenta la rentabilidad al evitar gastos
                  recurrentes.
                </p>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-white p-6 rounded-xl shadow-md text-center"
              >
                <div className="text-green-600 mb-4">
                  <Globe2 size={48} className="mx-auto" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Acceso a Mercados Exigentes
                </h3>
                <p className="text-gray-600">
                  Cumple y supera regulaciones internacionales, posicionando tu
                  marca como un referente de calidad. Diversifica tus canales de
                  venta, accede a mejores precios y eleva tu reputación.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        <section
          id="sobre-nosotros"
          className="w-full py-16 md:py-24 lg:py-32 bg-white"
        >
          <div className="container mx-auto px-4 md:px-6 max-w-7xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mb-6 text-[#024521]">
                  Sobre STASS
                </h2>
                <p className="text-lg text-[#03312e] mb-6">
                  En STASS, revolucionamos la industria agrícola con tecnología
                  de punta. Nuestra misión es empoderar a las pymes exportadoras
                  con herramientas de control de calidad basadas en datos, para
                  que puedan identificar rápidamente desviaciones, mejorar sus
                  procesos y mantener la competitividad.
                </p>
                <p className="text-lg text-[#03312e] mb-6">
                  Nuestro enfoque integral garantiza que puedas{" "}
                  <strong>reaccionar con agilidad</strong> ante problemas,{" "}
                  <strong>mantener la consistencia</strong> del producto y{" "}
                  <strong>alcanzar estándares internacionales</strong>. Con
                  STASS, tu reputación de calidad se consolida y tu negocio
                  crece de manera sostenible.
                </p>
              </div>
              <div className="flex md:justify-end justify-center md:mx-0 mx-24">
                <Image
                  src="/images/Stass completo.png"
                  alt="Equipo STASS"
                  width={500}
                  height={500}
                  className=""
                />
              </div>
            </div>
          </div>
        </section>

        <section
          id="contacto"
          className="w-full py-16 md:py-24 lg:py-32 bg-[#f1faf5]  "
        >
          <div className="container mx-auto px-4 md:px-6 max-w-7xl">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-center mb-12 text-[#024521]">
              Contáctenos
            </h2>
            <div className="text-center max-w-3xl mx-auto">
              <p className="text-xl text-[#03312e] mb-8">
                ¿Listo para optimizar la calidad de tus exportaciones y reducir
                costos desde el origen? Contáctanos y descubre cómo STASS puede
                ayudarte a convertir la{" "}
                <strong>gestión de calidad en una ventaja competitiva</strong>.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link
                  href="mailto:info@stass.com"
                  className="inline-block bg-[#058240] hover:bg-[#058240]/90 text-white font-bold py-3 px-8 rounded-full text-lg transition-all duration-200 transform hover:scale-105"
                >
                  Enviar Correo
                </Link>
                <Link
                  href="tel:+123456789"
                  className="inline-block bg-gray-200 hover:bg-gray-300 text-[#03312e] font-bold py-3 px-8 rounded-full text-lg transition-all duration-200 transform hover:scale-105"
                >
                  Llamar Ahora
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="bg-[#024521] text-white py-12">
        <div className="container mx-auto px-4 md:px-6 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">STASS</h3>
              <p className="text-white">
                Innovando en las exportaciones con tecnología de vanguardia.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Enlaces Rápidos</h4>
              <nav className="flex flex-col gap-2">
                <Link
                  className="text-white hover:text-[#f1faf5] transition-colors"
                  href="#soluciones"
                >
                  Soluciones
                </Link>
                <Link
                  className="text-white hover:text-[#f1faf5] transition-colors"
                  href="#beneficios"
                >
                  Beneficios
                </Link>
                <Link
                  className="text-white hover:text-[#f1faf5] transition-colors"
                  href="#sobre-nosotros"
                >
                  Sobre Nosotros
                </Link>
                <Link
                  className="text-white hover:text-[#f1faf5] transition-colors"
                  href="#contacto"
                >
                  Contacto
                </Link>
              </nav>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Contacto</h4>
              <p className="text-white">Email: info@stass.com</p>
              <p className="text-white">Teléfono: +123 456 789</p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white text-center">
            <p className="text-white">
              © 2024 STASS. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
