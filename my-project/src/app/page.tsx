"use client";
import Link from "next/link"; // asegúrate de importarlo

import type React from "react";
import { useState, useEffect } from "react";
import {
  ChevronDown,
  Target,
  BarChart3,
  Lightbulb,
  ShieldCheck,
  TrendingUp,
  Phone,
  Mail,
  Zap,
  Leaf,
  Cpu,
  DollarSign,
  Gauge,
  Menu,
  X,
} from "lucide-react";

interface SectionProps {
  id: string;
}

const companyData = {
  name: "Qualiblick",
  phone: "+56 9 6229 6916",
  email: "dsoler.olguin@gmail.com",
  hero: {
    title: "La Revolución de la IA en el Agro.",
    subtitle: "Optimiza tus procesos hoy.",
    description:
      "Aseguramos la competitividad de tus productos agroindustriales con IA de vanguardia, permitiendo un control total, reduciendo costos, acelerando tus procesos y mejorando la calidad.",
    cta: "Descubre Nuestras Soluciones",
  },
  mission: {
    title: "Nuestra Misión: Calidad Accesible",
    text: "Impulsar el crecimiento de las empresas agroindustriales con herramientas accesibles basadas en IA, democratizando el acceso a tecnología de punta para optimizar la calidad y eficiencia.",
  },
  solutions: {
    title: "Soluciones: Innovación y Creación",
    intro:
      "Desarrollamos soluciones de IA a medida que ofrecen control total de tus productos, minimizan riesgos y optimizan tu producción de manera inteligente y sostenible.",
    items: [
      {
        icon: Cpu,
        name: "Control Total con IA",
        description:
          "Sistemas inteligentes para el monitoreo y gestión integral de la calidad y producción en tiempo real.",
      },
      {
        icon: ShieldCheck,
        name: "Minimización de Riesgos",
        description:
          "Modelos predictivos y análisis avanzados para anticipar problemas y asegurar la inocuidad y consistencia.",
      },
      {
        icon: Zap,
        name: "Optimización de Procesos",
        description:
          "Algoritmos de IA para eficientar la cadena productiva, desde la cosecha hasta el empaque, reduciendo mermas.",
      },
      {
        icon: Leaf,
        name: "Agricultura de Precisión",
        description:
          "Tecnología para la toma de decisiones basada en datos, mejorando el rendimiento y la sostenibilidad de los cultivos.",
      },
    ],
  },
  results: {
    title: "Resultados Preliminares: Impacto Medible",
    intro:
      "Nuestras pruebas piloto demuestran consistentemente una significativa reducción de costos y una mayor agilidad operativa en diversos procesos agroindustriales.",
    stats: [
      {
        icon: Gauge,
        value: "89%",
        label: "Optimización de Eficiencia",
        description:
          "Mejora promedio en la eficiencia de los procesos clave intervenidos.",
      },
      {
        icon: DollarSign,
        value: "7.3X",
        label: "Retorno de Inversión",
        description:
          "Potencial de retorno sobre la inversión en tecnología IA implementada.",
      },
      {
        icon: TrendingUp,
        value: "72%",
        label: "Reducción de Mermas",
        description:
          "Disminución en pérdidas de producto gracias a la detección temprana y control mejorado.",
      },
    ],
  },
  contact: {
    title: "Hablemos de tu Proyecto",
    text: "Estamos listos para ayudarte a integrar la inteligencia artificial en tus operaciones. Conversemos sobre cómo Qualiblick puede potenciar tu negocio.",
  },
};

const Logo: React.FC = () => (
  <div className="flex items-center space-x-2">
    <img src="images/qb.png" alt="Qualiblick" className="w-124 h-12" />
  </div>
);

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { href: "#home", label: "Inicio" },
    { href: "#mision", label: "Misión" },
    { href: "#soluciones", label: "Soluciones" },
    { href: "#resultados", label: "Resultados" },
    { href: "#contacto", label: "Contacto" },
    { href: "/login", label: "Iniciar sesión" },
    { href: "/register", label: "Registrarse" },
  ];

  const scrollToSection = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    e.preventDefault();
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
    setIsOpen(false);
  };

  return (
    <nav className="bg-emerald-800/95 backdrop-blur-md text-white p-4 fixed w-full z-50 shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        <a href="#home" onClick={(e) => scrollToSection(e, "#home")}>
          <Logo />
        </a>
        {/* menú desktop */}
        <div className="hidden md:flex space-x-6">
          {navLinks.map(({ href, label }) =>
            href.startsWith("#") ? (
              // enlace ancla: desplazamiento suave
              <a
                key={href}
                href={href}
                onClick={(e) => scrollToSection(e, href)}
                className="hover:text-amber-300 transition-colors duration-300 font-medium"
              >
                {label}
              </a>
            ) : (
              // enlace de ruta: usa Next.js Link
              <Link
                key={href}
                href={href}
                className="hover:text-amber-300 transition-colors duration-300 font-medium"
              >
                {label}
              </Link>
            )
          )}
        </div>
        {/* botón móvil */}
        <div className="md:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-white focus:outline-none"
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>
      {/* menú desplegable móvil */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-emerald-700 shadow-xl py-2">
          {navLinks.map(({ href, label }) =>
            href.startsWith("#") ? (
              <a
                key={href}
                href={href}
                onClick={(e) => scrollToSection(e, href)}
                className="block px-4 py-3 text-center hover:bg-emerald-600 hover:text-amber-300 transition-colors duration-300"
              >
                {label}
              </a>
            ) : (
              <Link
                key={href}
                href={href}
                className="block px-4 py-3 text-center hover:bg-emerald-600 hover:text-amber-300 transition-colors duration-300"
              >
                {label}
              </Link>
            )
          )}
        </div>
      )}
    </nav>
  );
};

const Hero: React.FC<SectionProps> = ({ id }) => {
  const scrollToSolutions = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    document
      .querySelector("#soluciones")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id={id}
      className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-amber-500 text-white flex items-center justify-center pt-20 relative overflow-hidden"
    >
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="heroPattern"
              patternUnits="userSpaceOnUse"
              width="100"
              height="100"
              patternTransform="scale(1) rotate(45)"
            >
              <path
                d="M0 50 L50 0 L100 50 L50 100 Z"
                fill="rgba(163,230,53,0.1)"
              />
              <circle cx="50" cy="50" r="2" fill="rgba(245,158,11,0.2)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#heroPattern)" />
        </svg>
      </div>

      <div className="container mx-auto px-6 z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight animate-fade-in-down">
              {companyData.hero.title}{" "}
              <span className="text-amber-300">
                {companyData.hero.subtitle}
              </span>
            </h1>
            <p className="text-lg md:text-xl text-emerald-100 mb-10 max-w-2xl animate-fade-in-up animation-delay-300">
              {companyData.hero.description}
            </p>
            <button
              onClick={scrollToSolutions}
              className="bg-amber-400 hover:bg-amber-500 text-emerald-900 font-bold py-4 px-10 rounded-lg text-lg transition-all duration-300 ease-in-out transform hover:scale-105 shadow-xl hover:shadow-amber-400/50 animate-fade-in-up animation-delay-600"
            >
              {companyData.hero.cta} <ChevronDown className="inline ml-2" />
            </button>
          </div>

          <div className="relative lg:block hidden">
            {/* Main center image */}
            <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-500 z-10">
              <img
                src="images/ChatGPT Image 25 may 2025, 14_02_47.png"
                alt="Visualización de IA en Agroindustria"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Top right image */}
            <div className="absolute -top-8 -right-12 w-60 h-40 rounded-xl overflow-hidden shadow-xl transform rotate-12 hover:rotate-6 transition-transform duration-500 z-20">
              <img
                src="images/WhatsApp Image 2025-05-24 at 23.20.29.jpeg"
                alt="Agricultura de Precisión"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Bottom left image */}
            <div className="absolute -bottom-16 -left-16 w-52 h-52 rounded-xl overflow-hidden shadow-xl transform -rotate-8 hover:-rotate-3 transition-transform duration-500 z-20">
              <img
                src="images/WhatsApp Image 2025-05-24 at 23.20.29 (1).jpeg"
                alt="Control de Calidad IA"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Mission: React.FC<SectionProps> = ({ id }) => (
  <section id={id} className="py-20 bg-emerald-50">
    <div className="container mx-auto px-6 text-center">
      <Target size={60} className="mx-auto mb-6 text-emerald-600" />
      <h2 className="text-4xl font-bold text-emerald-900 mb-4">
        {companyData.mission.title}
      </h2>
      <p className="text-lg text-emerald-700 max-w-3xl mx-auto leading-relaxed">
        {companyData.mission.text}
      </p>
    </div>
  </section>
);

const Solutions: React.FC<SectionProps> = ({ id }) => (
  <section id={id} className="py-20 bg-emerald-900 text-white">
    <div className="container mx-auto px-6">
      <Lightbulb size={60} className="mx-auto mb-6 text-amber-300" />
      <h2 className="text-4xl font-bold text-center mb-4">
        {companyData.solutions.title}
      </h2>
      <p className="text-lg text-emerald-100 text-center max-w-3xl mx-auto mb-16 leading-relaxed">
        {companyData.solutions.intro}
      </p>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        {companyData.solutions.items.map((item, index) => (
          <div
            key={index}
            className="bg-emerald-800 p-8 rounded-xl shadow-2xl hover:shadow-amber-300/30 transition-all duration-300 transform hover:-translate-y-2 flex flex-col items-center text-center"
          >
            <item.icon size={48} className="mb-6 text-amber-300" />
            <h3 className="text-2xl font-semibold mb-3">{item.name}</h3>
            <p className="text-emerald-100 leading-relaxed">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const Results: React.FC<SectionProps> = ({ id }) => (
  <section id={id} className="py-20 bg-emerald-50">
    <div className="container mx-auto px-6">
      <BarChart3 size={60} className="mx-auto mb-6 text-emerald-600" />
      <h2 className="text-4xl font-bold text-emerald-900 text-center mb-4">
        {companyData.results.title}
      </h2>
      <p className="text-lg text-emerald-700 text-center max-w-3xl mx-auto mb-16 leading-relaxed">
        {companyData.results.intro}
      </p>
      <div className="grid md:grid-cols-3 gap-8">
        {companyData.results.stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white p-8 rounded-xl shadow-xl hover:shadow-emerald-500/20 transition-all duration-300 transform hover:scale-105 flex flex-col items-center text-center"
          >
            <stat.icon size={48} className="mb-4 text-emerald-600" />
            <div className="text-5xl font-extrabold text-emerald-700 mb-2">
              {stat.value}
            </div>
            <h3 className="text-xl font-semibold text-emerald-900 mb-2">
              {stat.label}
            </h3>
            <p className="text-emerald-600 text-sm">{stat.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const Contact: React.FC<SectionProps> = ({ id }) => (
  <section
    id={id}
    className="py-20 bg-gradient-to-br from-emerald-900 to-emerald-800 text-white"
  >
    <div className="container mx-auto px-6 text-center">
      <Mail size={60} className="mx-auto mb-6 text-amber-300" />
      <h2 className="text-4xl font-bold mb-4">{companyData.contact.title}</h2>
      <p className="text-lg text-emerald-100 max-w-2xl mx-auto mb-10 leading-relaxed">
        {companyData.contact.text}
      </p>
      <div className="space-y-6 md:space-y-0 md:space-x-12 md:flex md:justify-center items-center">
        <a
          href={`tel:${companyData.phone.replace(/\s/g, "")}`}
          className="flex items-center justify-center text-xl hover:text-amber-300 transition-colors duration-300 group"
        >
          <Phone
            size={28}
            className="mr-3 text-amber-300 group-hover:animate-pulse"
          />
          {companyData.phone}
        </a>
        <a
          href={`mailto:${companyData.email}`}
          className="flex items-center justify-center text-xl hover:text-amber-300 transition-colors duration-300 group"
        >
          <Mail
            size={28}
            className="mr-3 text-amber-300 group-hover:animate-pulse"
          />
          {companyData.email}
        </a>
      </div>
    </div>
  </section>
);

const Footer: React.FC = () => (
  <footer className="bg-emerald-900 text-emerald-100 py-10 text-center">
    <div className="container mx-auto px-6">
      <div className="mb-4">
        <Logo />
      </div>
      <p>
        &copy; {new Date().getFullYear()} {companyData.name}. Todos los derechos
        reservados.
      </p>
      <p className="text-sm mt-1 text-emerald-300">
        Transformando la Agroindustria con Inteligencia Artificial.
      </p>
    </div>
  </footer>
);

const App: React.FC = () => {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-in-up-scroll");
          }
        });
      },
      { threshold: 0.1 }
    );

    document
      .querySelectorAll("section > div > *:not(h2):not(p:first-of-type)")
      .forEach((el) => {
        observer.observe(el);
      });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="font-sans antialiased bg-emerald-50">
      <Navbar />
      <main>
        <Hero id="home" />
        <Mission id="mision" />
        <Solutions id="soluciones" />
        <Results id="resultados" />
        <Contact id="contacto" />
      </main>
      <Footer />
    </div>
  );
};

export default App;
