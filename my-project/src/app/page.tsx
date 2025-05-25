"use client";

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

// Interfaz para las props de los componentes de sección
interface SectionProps {
  id: string;
}

// Datos de la empresa (extraídos del PDF y requisitos)
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
    text: "Impulsar el crecimiento de las PYMES agroindustriales con herramientas accesibles basadas en IA, democratizando el acceso a tecnología de punta para optimizar la calidad y eficiencia.",
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

// Componente de Logo
const Logo: React.FC = () => (
  <div className="flex items-center space-x-2">
    <svg
      width="36"
      height="36"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className="text-amber-400"
    >
      <path
        d="M50 0 L61.8 38.2 L100 38.2 L69.1 61.8 L80.9 100 L50 76.4 L19.1 100 L30.9 61.8 L0 38.2 L38.2 38.2 Z"
        fill="currentColor"
      />
    </svg>
    <span className="text-2xl font-bold text-green-500">
      Quali<span className="text-green-600">blick</span>
    </span>
  </div>
);

// Componente de Navegación
const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { href: "#home", label: "Inicio" },
    { href: "#mision", label: "Misión" },
    { href: "#soluciones", label: "Soluciones" },
    { href: "#resultados", label: "Resultados" },
    { href: "#contacto", label: "Contacto" },
  ];

  const scrollToSection = (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
    href: string
  ) => {
    e.preventDefault();
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
    setIsOpen(false);
  };

  return (
    <nav className="bg-slate-900/80 backdrop-blur-md text-white p-4 fixed w-full z-50 shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        <a
          href="#home"
          onClick={(e) => scrollToSection(e, "#home")}
          className="hover:opacity-80 transition-opacity"
        >
          <Logo />
        </a>
        <div className="hidden md:flex space-x-6">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => scrollToSection(e, link.href)}
              className="hover:text-amber-400 transition-colors duration-300 font-medium"
            >
              {link.label}
            </a>
          ))}
        </div>
        <div className="md:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-white focus:outline-none"
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-slate-800 shadow-xl py-2">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => scrollToSection(e, link.href)}
              className="block px-4 py-3 text-center hover:bg-slate-700 hover:text-amber-400 transition-colors duration-300"
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
};

// Componente Hero
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
      className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-green-900 text-white flex items-center justify-center pt-20 relative overflow-hidden"
    >
      {/* Fondo abstracto sutil */}
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
                fill="rgba(200,255,200,0.1)"
              />
              <circle cx="50" cy="50" r="2" fill="rgba(250, 180, 40, 0.2)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#heroPattern)" />
        </svg>
      </div>

      <div className="container mx-auto px-6 z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Contenido de texto */}
          <div className="text-center lg:text-left">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight animate-fade-in-down">
              {companyData.hero.title}{" "}
              <span className="text-amber-400">
                {companyData.hero.subtitle}
              </span>
            </h1>
            <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl animate-fade-in-up animation-delay-300">
              {companyData.hero.description}
            </p>
            <button
              onClick={scrollToSolutions}
              className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-4 px-10 rounded-lg text-lg transition-all duration-300 ease-in-out transform hover:scale-105 shadow-xl hover:shadow-amber-500/50 animate-fade-in-up animation-delay-600"
            >
              {companyData.hero.cta} <ChevronDown className="inline ml-2" />
            </button>
          </div>

          {/* Imagen mejorada */}
          <div className="relative lg:block hidden">
            <div className="relative w-full h-96 rounded-2xl overflow-hidden shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
              <img
                src="images/ChatGPT Image 25 may 2025, 14_02_47.png"
                alt="Visualización de IA en Agroindustria"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent"></div>
              <div className="absolute bottom-4 left-4 right-4"></div>
            </div>
            {/* Elementos decorativos */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-amber-400/20 rounded-full blur-xl"></div>
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-green-400/20 rounded-full blur-xl"></div>
          </div>
        </div>
      </div>

      {/* Imagen para móviles */}
      <div className="lg:hidden absolute bottom-0 left-0 right-0 h-32 opacity-20">
        <img
          src="/placeholder.svg?height=200&width=800"
          alt="Visualización de IA en Agroindustria"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
      </div>
    </section>
  );
};

// Componente Misión
const Mission: React.FC<SectionProps> = ({ id }) => (
  <section id={id} className="py-20 bg-slate-100">
    <div className="container mx-auto px-6 text-center">
      <Target size={60} className="mx-auto mb-6 text-green-600" />
      <h2 className="text-4xl font-bold text-slate-800 mb-4">
        {companyData.mission.title}
      </h2>
      <p className="text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">
        {companyData.mission.text}
      </p>
    </div>
  </section>
);

// Componente Soluciones
const Solutions: React.FC<SectionProps> = ({ id }) => (
  <section id={id} className="py-20 bg-slate-800 text-white">
    <div className="container mx-auto px-6">
      <Lightbulb size={60} className="mx-auto mb-6 text-amber-400" />
      <h2 className="text-4xl font-bold text-center mb-4">
        {companyData.solutions.title}
      </h2>
      <p className="text-lg text-slate-300 text-center max-w-3xl mx-auto mb-16 leading-relaxed">
        {companyData.solutions.intro}
      </p>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        {companyData.solutions.items.map((item, index) => (
          <div
            key={index}
            className="bg-slate-700 p-8 rounded-xl shadow-2xl hover:shadow-amber-500/30 transition-all duration-300 transform hover:-translate-y-2 flex flex-col items-center text-center"
          >
            <item.icon size={48} className="mb-6 text-amber-400" />
            <h3 className="text-2xl font-semibold mb-3">{item.name}</h3>
            <p className="text-slate-300 leading-relaxed">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// Componente Resultados
const Results: React.FC<SectionProps> = ({ id }) => (
  <section id={id} className="py-20 bg-slate-50">
    <div className="container mx-auto px-6">
      <BarChart3 size={60} className="mx-auto mb-6 text-green-600" />
      <h2 className="text-4xl font-bold text-slate-800 text-center mb-4">
        {companyData.results.title}
      </h2>
      <p className="text-lg text-slate-600 text-center max-w-3xl mx-auto mb-16 leading-relaxed">
        {companyData.results.intro}
      </p>
      <div className="grid md:grid-cols-3 gap-8">
        {companyData.results.stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white p-8 rounded-xl shadow-xl hover:shadow-green-500/20 transition-all duration-300 transform hover:scale-105 flex flex-col items-center text-center"
          >
            <stat.icon size={48} className="mb-4 text-green-600" />
            <div className="text-5xl font-extrabold text-green-700 mb-2">
              {stat.value}
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">
              {stat.label}
            </h3>
            <p className="text-slate-500 text-sm">{stat.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// Componente Contacto
const Contact: React.FC<SectionProps> = ({ id }) => (
  <section
    id={id}
    className="py-20 bg-gradient-to-br from-slate-900 to-slate-800 text-white"
  >
    <div className="container mx-auto px-6 text-center">
      <Mail size={60} className="mx-auto mb-6 text-amber-400" />
      <h2 className="text-4xl font-bold mb-4">{companyData.contact.title}</h2>
      <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
        {companyData.contact.text}
      </p>
      <div className="space-y-6 md:space-y-0 md:space-x-12 md:flex md:justify-center items-center">
        <a
          href={`tel:${companyData.phone.replace(/\s/g, "")}`}
          className="flex items-center justify-center text-xl hover:text-amber-400 transition-colors duration-300 group"
        >
          <Phone
            size={28}
            className="mr-3 text-amber-400 group-hover:animate-pulse"
          />
          {companyData.phone}
        </a>
        <a
          href={`mailto:${companyData.email}`}
          className="flex items-center justify-center text-xl hover:text-amber-400 transition-colors duration-300 group"
        >
          <Mail
            size={28}
            className="mr-3 text-amber-400 group-hover:animate-pulse"
          />
          {companyData.email}
        </a>
      </div>
    </div>
  </section>
);

// Componente Footer
const Footer: React.FC = () => (
  <footer className="bg-slate-900 text-slate-400 py-10 text-center">
    <div className="container mx-auto px-6">
      <div className="mb-4">
        <Logo />
      </div>
      <p>
        &copy; {new Date().getFullYear()} {companyData.name}. Todos los derechos
        reservados.
      </p>
      <p className="text-sm mt-1">
        Transformando la Agroindustria con Inteligencia Artificial.
      </p>
    </div>
  </footer>
);

// Componente Principal de la App
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
    <div className="font-sans antialiased bg-slate-100">
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
