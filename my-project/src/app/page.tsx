"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="px-4 lg:px-6 h-16 flex items-center fixed w-full bg-white/80 backdrop-blur-md z-50 shadow-sm">
        <Link className="flex items-center justify-center" href="/">
          <Image
            src="/images/Stass.png"
            alt="Logo STASS"
            width={40}
            height={84}
            unoptimized={true}
            className="mr-1"
          />
          <Image
            src="/images/logo2.png"
            alt="Logo STASS"
            width={140}
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
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-b from-white to-green-50">
          <div className="container mx-auto px-4 md:px-6 max-w-7xl">
            <div className="text-center">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl text-gray-900"
              >
                Revolucionando las Exportaciones con Tecnología de Vanguardia
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto"
              >
                Optimizamos la calidad de sus exportaciones agrícolas con
                soluciones tecnológicas avanzadas, mejorando la eficiencia y
                maximizando sus ganancias.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="mt-8"
              >
                <Link
                  href="#soluciones"
                  className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full text-lg transition-all duration-200 transform hover:scale-105"
                >
                  Descubra Nuestras Soluciones
                </Link>
              </motion.div>
            </div>
          </div>
        </section>

        <section
          id="soluciones"
          className="w-full py-16 md:py-24 lg:py-32 bg-white"
        >
          <div className="container mx-auto px-4 md:px-6 max-w-7xl">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-center mb-12 text-gray-900">
              Soluciones Innovadoras para su Agricultura
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-green-50 p-8 rounded-2xl shadow-lg"
              >
                <div className="flex">
                  <Image
                    src="/images/esparrago.png"
                    alt="Tecnología para Espárragos"
                    width={400}
                    height={300}
                    className="rounded-lg mb-6 w-2/5 h-48 object-cover"
                  />
                </div>
                <h3 className="text-2xl font-bold text-green-700 mb-4">
                  Control de Calidad de Espárragos
                </h3>
                <p className="text-gray-700 mb-6">
                  Nuestra tecnología de punta detecta hasta un 70% más de
                  productos fuera de estándar, asegurando la máxima calidad en
                  sus exportaciones de espárragos.
                </p>
                <Link
                  href="/esparragos"
                  className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-full transition-all duration-200"
                >
                  Explorar Solución
                </Link>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-red-50 p-8 rounded-2xl shadow-lg"
              >
                <Image
                  src="/images/cereza.png"
                  alt="Tecnología para Cerezas"
                  width={400}
                  height={300}
                  className="rounded-lg mb-6 w-3/5 h-48 object-cover"
                />
                <h3 className="text-2xl font-bold text-red-700 mb-4">
                  Control de Calidad de Cerezas
                </h3>
                <p className="text-gray-700 mb-6">
                  Optimizamos sus exportaciones de cerezas con una precisión del
                  99.5% en el control de calidad, garantizando productos de
                  primera clase para sus clientes.
                </p>
                <Link
                  href="/cerezas"
                  className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-full transition-all duration-200"
                >
                  Descubrir Más
                </Link>
              </motion.div>
            </div>
          </div>
        </section>

        <section
          id="beneficios"
          className="w-full py-16 md:py-24 lg:py-32 bg-gray-50"
        >
          <div className="container mx-auto px-4 md:px-6 max-w-7xl">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-center mb-12 text-gray-900">
              Beneficios Clave
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-white p-6 rounded-xl shadow-md text-center"
              >
                <div className="text-green-600 mb-4">
                  <CheckCircle size={48} className="mx-auto" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Mayor Precisión
                </h3>
                <p className="text-gray-600">
                  Detección de hasta 70-80% más productos fuera de estándar,
                  asegurando la más alta calidad.
                </p>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-white p-6 rounded-xl shadow-md text-center"
              >
                <div className="text-green-600 mb-4">
                  <CheckCircle size={48} className="mx-auto" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Reducción de Costos
                </h3>
                <p className="text-gray-600">
                  Optimización de procesos que resulta en una reducción
                  significativa de costos operativos.
                </p>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-white p-6 rounded-xl shadow-md text-center"
              >
                <div className="text-green-600 mb-4">
                  <CheckCircle size={48} className="mx-auto" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Aumento del ROI
                </h3>
                <p className="text-gray-600">
                  Incremento notable en el retorno de inversión desde el primer
                  año de implementación.
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
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mb-6 text-gray-900">
                  Sobre STASS
                </h2>
                <p className="text-lg text-gray-600 mb-6">
                  En STASS, nos dedicamos a revolucionar la industria agrícola
                  con tecnología de punta. Nuestras soluciones de control de
                  calidad ayudan a los exportadores a optimizar sus procesos,
                  reducir costos y mejorar la calidad de sus productos.
                </p>
                <p className="text-lg text-gray-600 mb-6">
                  Con un enfoque en innovación y un equipo apasionado por la
                  tecnología y la agricultura, trabajamos incansablemente para
                  transformar las exportaciones agrícolas y ayudar a nuestros
                  clientes a alcanzar nuevos niveles de excelencia.
                </p>
              </div>
              <div className="flex md:justify-end justify-center md:mx-0 mx-24">
                <Image
                  src="/images/Stass.png"
                  alt="Equipo STASS"
                  width={450}
                  height={450}
                  className=""
                />
              </div>
            </div>
          </div>
        </section>

        <section
          id="contacto"
          className="w-full py-16 md:py-24 lg:py-32 bg-green-50"
        >
          <div className="container mx-auto px-4 md:px-6 max-w-7xl">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-center mb-12 text-gray-900">
              Contáctenos
            </h2>
            <div className="text-center max-w-3xl mx-auto">
              <p className="text-xl text-gray-600 mb-8">
                ¿Listo para llevar sus exportaciones agrícolas al siguiente
                nivel? Nuestro equipo está aquí para ayudarle.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link
                  href="mailto:info@stass.com"
                  className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full text-lg transition-all duration-200 transform hover:scale-105"
                >
                  Enviar Correo
                </Link>
                <Link
                  href="tel:+123456789"
                  className="inline-block bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-8 rounded-full text-lg transition-all duration-200 transform hover:scale-105"
                >
                  Llamar Ahora
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4 md:px-6 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">STASS</h3>
              <p className="text-gray-400">
                Innovando en las exportaciones con tecnología de vanguardia.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Enlaces Rápidos</h4>
              <nav className="flex flex-col gap-2">
                <Link
                  className="text-gray-400 hover:text-white transition-colors"
                  href="#soluciones"
                >
                  Soluciones
                </Link>
                <Link
                  className="text-gray-400 hover:text-white transition-colors"
                  href="#beneficios"
                >
                  Beneficios
                </Link>
                <Link
                  className="text-gray-400 hover:text-white transition-colors"
                  href="#sobre-nosotros"
                >
                  Sobre Nosotros
                </Link>
                <Link
                  className="text-gray-400 hover:text-white transition-colors"
                  href="#contacto"
                >
                  Contacto
                </Link>
              </nav>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Contacto</h4>
              <p className="text-gray-400">Email: info@stass.com</p>
              <p className="text-gray-400">Teléfono: +123 456 789</p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center">
            <p className="text-gray-400">
              © 2024 STASS. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
