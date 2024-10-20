"use client";
import { useState } from "react";
import Image from "next/image";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Leaf,
  BarChart,
  CheckCircle,
  DollarSign,
  Menu,
  X,
  Zap,
  Globe,
  TrendingUp,
  PieChart,
  Users,
  ShieldCheck,
} from "lucide-react";
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
    <div className="flex flex-col min-h-screen bg-green-50">
      <header className="px-4 lg:px-6 h-16 flex items-center fixed w-full bg-white/80 backdrop-blur-md z-50 shadow-sm">
        <Link className="flex items-center justify-center" href="#">
          <Image
            src="/images/logo2.png"
            alt="Logo"
            width={140} // Adjust the width as needed
            height={84} // Adjust the height as needed
            unoptimized={true} // Agrega esta línea
          />
        </Link>
        <nav className="ml-auto hidden md:flex gap-4 sm:gap-6">
          <Link
            className="text-sm font-medium text-green-700 hover:text-green-600 transition-colors"
            href="#features"
          >
            Características
          </Link>
          <Link
            className="text-sm font-medium text-green-700 hover:text-green-600 transition-colors"
            href="#benefits"
          >
            Beneficios
          </Link>
          <Link
            className="text-sm font-medium text-green-700 hover:text-green-600 transition-colors"
            href="#testimonials"
          >
            Testimonios
          </Link>
          <Link
            className="text-sm font-medium text-green-700 hover:text-green-600 transition-colors"
            href="#contact"
          >
            Contacto
          </Link>
        </nav>
        <Button
          variant="outline"
          className="ml-4 hidden md:inline-flex border-green-600 text-green-600 hover:bg-green-100"
        >
          Iniciar Sesión
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto md:hidden text-green-600"
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
        <div className="fixed inset-0 z-40 bg-green-50 md:hidden pt-16">
          <nav className="flex flex-col items-center gap-4 p-4">
            <Link
              className="text-lg font-medium text-green-700 hover:text-green-600 transition-colors"
              href="#features"
              onClick={() => setIsMenuOpen(false)}
            >
              Características
            </Link>
            <Link
              className="text-lg font-medium text-green-700 hover:text-green-600 transition-colors"
              href="#benefits"
              onClick={() => setIsMenuOpen(false)}
            >
              Beneficios
            </Link>
            <Link
              className="text-lg font-medium text-green-700 hover:text-green-600 transition-colors"
              href="#testimonials"
              onClick={() => setIsMenuOpen(false)}
            >
              Testimonios
            </Link>
            <Link
              className="text-lg font-medium text-green-700 hover:text-green-600 transition-colors"
              href="#contact"
              onClick={() => setIsMenuOpen(false)}
            >
              Contacto
            </Link>
            <Button className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white">
              Iniciar Sesión
            </Button>
          </nav>
        </div>
      )}
      <main className="flex-1 pt-16">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-green-100">
          <div className="container mx-auto px-4 md:px-6 max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center space-y-4 text-center max-w-4xl mx-auto"
            >
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none text-green-800">
                  Calidad de exportación para sus espárragos
                </h1>
                <p className="mx-auto max-w-[700px] text-green-700 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Ayudamos a pymes exportadoras de espárragos a cumplir con los
                  estándares internacionales de calidad, utilizando tecnología
                  avanzada de escaneo que reduce errores y costos, sin requerir
                  grandes inversiones iniciales.
                </p>
              </div>
              <div className="space-x-4">
                <Button className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-full transition-all duration-200 transform hover:scale-105">
                  Solicitar Demo
                </Button>
                <Button
                  variant="outline"
                  className="border-green-600 text-green-600 hover:bg-green-200 font-bold py-2 px-4 rounded-full transition-all duration-200 transform hover:scale-105"
                >
                  Más Información
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        <section
          id="key-data"
          className="w-full py-12 md:py-24 lg:py-32 bg-white"
        >
          <div className="container mx-auto px-4 md:px-6 max-w-7xl">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-center mb-8 text-green-800">
              Datos Clave
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 justify-items-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-green-50 p-6 rounded-lg shadow-lg flex flex-col items-center text-center"
              >
                <TrendingUp className="h-12 w-12 text-green-600 mb-4" />
                <h3 className="text-2xl font-bold mb-2 text-green-800">300%</h3>
                <p className="text-green-700">
                  ROI promedio para nuestros clientes
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-green-50 p-6 rounded-lg shadow-lg flex flex-col items-center text-center"
              >
                <PieChart className="h-12 w-12 text-green-600 mb-4" />
                <h3 className="text-2xl font-bold mb-2 text-green-800">25%</h3>
                <p className="text-green-700">Reducción en costos operativos</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-green-50 p-6 rounded-lg shadow-lg flex flex-col items-center text-center"
              >
                <Users className="h-12 w-12 text-green-600 mb-4" />
                <h3 className="text-2xl font-bold mb-2 text-green-800">
                  10,000+
                </h3>
                <p className="text-green-700">Agricultores beneficiados</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-green-50 p-6 rounded-lg shadow-lg flex flex-col items-center text-center"
              >
                <ShieldCheck className="h-12 w-12 text-green-600 mb-4" />
                <h3 className="text-2xl font-bold mb-2 text-green-800">
                  99.9%
                </h3>
                <p className="text-green-700">
                  Precisión en detección de calidad
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        <section
          id="features"
          className="w-full py-12 md:py-24 lg:py-32 bg-green-100"
        >
          <div className="container mx-auto px-4 md:px-6 max-w-7xl">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-center mb-8 text-green-800">
              Características Clave
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center text-center"
              >
                <BarChart className="h-12 w-12 text-green-600 mb-4" />
                <h3 className="text-xl font-bold mb-2 text-green-800">
                  Escaneo Avanzado
                </h3>
                <p className="text-green-700">
                  Tecnología de punta para detectar imperfecciones con
                  precisión.
                </p>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center text-center"
              >
                <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
                <h3 className="text-xl font-bold mb-2 text-green-800">
                  Cumplimiento de Estándares
                </h3>
                <p className="text-green-700">
                  Aseguramos que su producto cumpla con las normas
                  internacionales.
                </p>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center text-center"
              >
                <DollarSign className="h-12 w-12 text-green-600 mb-4" />
                <h3 className="text-xl font-bold mb-2 text-green-800">
                  Costos Reducidos
                </h3>
                <p className="text-green-700">
                  Minimice errores y optimice sus recursos con nuestra solución.
                </p>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center text-center"
              >
                <Zap className="h-12 w-12 text-green-600 mb-4" />
                <h3 className="text-xl font-bold mb-2 text-green-800">
                  Eficiencia Mejorada
                </h3>
                <p className="text-green-700">
                  Aumente la velocidad de procesamiento y reduzca los tiempos de
                  espera.
                </p>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center text-center"
              >
                <Globe className="h-12 w-12 text-green-600 mb-4" />
                <h3 className="text-xl font-bold mb-2 text-green-800">
                  Alcance Global
                </h3>
                <p className="text-green-700">
                  Expanda su mercado y llegue a clientes internacionales con
                  confianza.
                </p>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center text-center"
              >
                <Leaf className="h-12 w-12 text-green-600 mb-4" />
                <h3 className="text-xl font-bold mb-2 text-green-800">
                  Sostenibilidad
                </h3>
                <p className="text-green-700">
                  Optimice el uso de recursos y reduzca el desperdicio en su
                  producción.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        <section
          id="benefits"
          className="w-full py-12 md:py-24 lg:py-32 bg-white"
        >
          <div className="container mx-auto px-4 md:px-6 max-w-7xl">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-center mb-8 text-green-800">
              Beneficios para su Negocio
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-green-50 p-6 rounded-lg shadow-md border-l-4 border-green-600"
              >
                <h3 className="text-xl font-bold mb-2 text-green-800">
                  Aumento de la Calidad
                </h3>
                <p className="text-green-700">
                  Mejore la calidad de sus exportaciones y gane la confianza de
                  sus clientes internacionales.
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-green-50 p-6 rounded-lg shadow-md border-l-4 border-green-600"
              >
                <h3 className="text-xl font-bold mb-2 text-green-800">
                  Eficiencia Operativa
                </h3>
                <p className="text-green-700">
                  Optimice sus procesos y reduzca los tiempos de inspección con
                  nuestra tecnología automatizada.
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-green-50 p-6 rounded-lg shadow-md border-l-4 border-green-600"
              >
                <h3 className="text-xl font-bold mb-2 text-green-800">
                  Acceso a Nuevos Mercados
                </h3>
                <p className="text-green-700">
                  Cumpla con los estándares internacionales y expanda su negocio
                  a nuevos mercados globales.
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-green-50 p-6 rounded-lg shadow-md border-l-4 border-green-600"
              >
                <h3 className="text-xl font-bold mb-2 text-green-800">
                  Retorno de Inversión Rápido
                </h3>
                <p className="text-green-700">
                  Vea resultados inmediatos sin necesidad de grandes inversiones
                  iniciales en equipamiento.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        <section
          id="testimonials"
          className="w-full py-12 md:py-24 lg:py-32 bg-green-100"
        >
          <div className="container mx-auto px-4 md:px-6 max-w-7xl">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-center mb-8 text-green-800">
              Lo que dicen nuestros clientes
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-white p-6 rounded-lg shadow-lg"
              >
                <p className="text-green-700 mb-4">
                  &quot;EspárragoTech ha revolucionado nuestra forma de
                  trabajar. La calidad de nuestras exportaciones ha mejorado
                  significativamente.&quot;
                </p>
                <p className="font-bold text-green-800">
                  - María Rodríguez, Gerente de Calidad
                </p>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-white p-6 rounded-lg shadow-lg"
              >
                <p className="text-green-700 mb-4">
                  &quot;Gracias a su tecnología, hemos reducido nuestros costos
                  operativos en un 30%. Una inversión que realmente vale la
                  pena.&quot;
                </p>
                <p className="font-bold text-green-800">
                  - Carlos Soler, Director de Operaciones
                </p>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-white p-6 rounded-lg shadow-lg"
              >
                <p className="text-green-700 mb-4">
                  &quot;El soporte técnico de EspárragoTech es excepcional.
                  Siempre están disponibles para ayudarnos a optimizar nuestros
                  procesos.&quot;
                </p>
                <p className="font-bold text-green-800">
                  - Ana Gómez, Supervisora de Producción
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        <section id="faq" className="w-full py-12 md:py-24 lg:py-32 bg-white">
          <div className="container mx-auto px-4 md:px-6 max-w-7xl">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-center mb-8 text-green-800">
              Preguntas Frecuentes
            </h2>
            <Accordion
              type="single"
              collapsible
              className="w-full max-w-3xl mx-auto"
            >
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-green-800">
                  ¿Cómo funciona la tecnología de escaneo?
                </AccordionTrigger>
                <AccordionContent className="text-green-700">
                  Nuestra tecnología utiliza cámaras de alta resolución y
                  algoritmos de inteligencia artificial para detectar
                  imperfecciones en los espárragos con una precisión del 99.9%.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger className="text-green-800">
                  ¿Cuánto tiempo toma implementar el sistema?
                </AccordionTrigger>
                <AccordionContent className="text-green-700">
                  La implementación típica toma entre 2 y 4 semanas, dependiendo
                  del tamaño de su operación y los requisitos específicos.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger className="text-green-800">
                  ¿Ofrecen soporte técnico continuo?
                </AccordionTrigger>
                <AccordionContent className="text-green-700">
                  Sí, ofrecemos soporte técnico 24/7 y actualizaciones regulares
                  del software para asegurar que su sistema siempre esté
                  funcionando de manera óptima.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        <section
          id="contact"
          className="w-full py-12 md:py-24 lg:py-32 bg-green-100"
        >
          <div className="container mx-auto px-4 md:px-6 max-w-7xl">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-green-800">
                  ¿Listo para mejorar la calidad de sus exportaciones?
                </h2>
                <p className="mx-auto max-w-[600px] text-green-700 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Contáctenos hoy mismo para una demostración gratuita y
                  descubra cómo podemos ayudar a su negocio.
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
                    className="rounded-full"
                  />
                  <Button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-full transition-all duration-200 transform hover:scale-105"
                  >
                    Solicitar Información
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-white">
        <p className="text-xs text-green-700">
          © 2024 EspárragoTech. Todos los derechos reservados.
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
