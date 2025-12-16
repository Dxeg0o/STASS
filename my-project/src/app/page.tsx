"use client";

import Link from "next/link";
import type React from "react";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Cpu,
  Gauge,
  Globe2,
  Leaf,
  Menu,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  X,
} from "lucide-react";

interface SectionProps {
  id: string;
}

const content = {
  brand: {
    name: "Qualiblick",
    phone: "+56 9 6229 6916",
    email: "contacto@qualiblick.com",
  },
  hero: {
    eyebrow: "Tecnología Validada Industrialmente",
    title: "Digitaliza tu Producción Real.",
    subtitle: "Sin Estimaciones.",
    description:
      "Transforma tus flujos físicos en datos financieros exactos con visión autónoma que opera desde la cosecha hasta la línea de proceso.",
    primaryCta: "Ver Tecnología en Acción",
    secondaryCta: "Agendar Demo",
    secondaryHref: "#contacto",
  },
  highlights: [
    "Precisión validada en formas complejas (Bulbos de Lilium).",
    "Sistema autónomo listo para operar 24/7 sin depender de la nube.",
    "Datos inmediatos listos para tu ERP o Excel.",
  ],
  painPoints: {
    title: "La incertidumbre operativa te está costando dinero.",
    description:
      "En la agroindustria se sigue operando con estimaciones al ojo o se obtienen datos reales cuando el proceso ya terminó.",
    items: [
      {
        title: "Estimaciones",
        description: "Asumir rendimientos que no son reales.",
      },
      {
        title: "Datos tardíos",
        description: "Saber cuánto produjiste cuando ya no puedes corregir errores.",
      },
      {
        title: "Puntos ciegos",
        description: "No saber qué está pasando realmente en tu línea ahora mismo.",
      },
    ],
    quote: "Elimina la suposición. Toma decisiones con datos reales, al instante.",
  },
  capabilities: {
    title: "Diseñado para la realidad hostil de tu operación.",
    description:
      "Tecnología robusta que se adapta a tu entorno, no al revés. Detecta, entiende y reporta con precisión incluso en condiciones difíciles.",
    items: [
      {
        icon: Sparkles,
        title: "Detecta lo que otros ignoran",
        description:
          "Entrenado para identificar productos orgánicos complejos e irregulares. Valida rotación y calibres e ignora tierra y suciedad.",
      },
      {
        icon: Globe2,
        title: "Funciona donde está el problema",
        description:
          "Opera en campo, recepción o salida de proceso. Hardware local sin depender de cables de red ni internet estable.",
      },
      {
        icon: Gauge,
        title: "Listo para temporada alta",
        description:
          "Probado en flujos de alta velocidad (>20 objetos/segundo). Mantiene la precisión bajo presión sin saturarse.",
      },
      {
        icon: BarChart3,
        title: "Datos financieros inmediatos",
        description:
          "Convierte el flujo físico en números listos para tu ERP o Excel. Control en tiempo real en lugar de esperar el cierre de turno.",
      },
    ],
  },
  caseStudy: {
    title: "Caso de Éxito",
    name: "Valdivia Lilies",
    summary:
      "Nuestra tecnología superó uno de los desafíos más difíciles de visión artificial: el Bulbo de Lilium (formas irregulares, suciedad y superposición). Si podemos contar esto con precisión, podemos medir tu producción.",
    badges: ["Operativa", "Implementación Exitosa"],
    standards: "Tecnología probada bajo estándares de Holanda y Chile.",
    metrics: [
      { label: "Precisión en Conteo de Bulbos", value: "97.54%" },
      { label: "Operación Continua", value: "24/7" },
      { label: "Dependencia de Nube", value: "0" },
    ],
  },
  contact: {
    title: "Haz que tu operación tenga datos precisos a tiempo.",
    description:
      "Agenda una demostración y descubre cómo Qualiblick transforma tu producción con datos financieros exactos en tiempo real.",
    cta: "Agendar una Demostración",
  },
};

const Logo: React.FC = () => (
  <div className="flex items-center space-x-3">
    <img src="images/qb.png" alt="Qualiblick" className="w-28 h-10 object-contain" />
    <span className="text-lg font-semibold text-white/90 tracking-tight">
      {content.brand.name}
    </span>
  </div>
);

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { href: "#home", label: "Tecnología" },
    { href: "#dolor", label: "Problema" },
    { href: "#capacidades", label: "Capacidades" },
    { href: "#caso", label: "Casos de Éxito" },
    { href: "#contacto", label: "Contacto" },
    { href: "/login", label: "Iniciar sesión" },
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
    <nav className="bg-emerald-900/95 backdrop-blur-md text-white p-4 fixed w-full z-50 shadow-xl border-b border-white/10">
      <div className="container mx-auto flex justify-between items-center">
        <a
          href="#home"
          onClick={(e) => scrollToSection(e, "#home")}
          className="focus:outline-none"
          aria-label="Ir al inicio"
        >
          <Logo />
        </a>
        <div className="hidden lg:flex space-x-8 items-center">
          {navLinks.map(({ href, label }) =>
            href.startsWith("#") ? (
              <a
                key={href}
                href={href}
                onClick={(e) => scrollToSection(e, href)}
                className="hover:text-amber-300 transition-colors duration-300 font-medium"
              >
                {label}
              </a>
            ) : (
              <Link
                key={href}
                href={href}
                className="hover:text-amber-300 transition-colors duration-300 font-medium"
              >
                {label}
              </Link>
            )
          )}
          <a
            href="#contacto"
            onClick={(e) => scrollToSection(e, "#contacto")}
            className="bg-amber-400 text-emerald-900 font-semibold px-4 py-2 rounded-full shadow hover:shadow-amber-300/40 transition"
          >
            Demo
          </a>
        </div>
        <div className="lg:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-white focus:outline-none"
            aria-label="Abrir menú"
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 bg-emerald-900 shadow-xl py-2 border-t border-white/10">
          {navLinks.map(({ href, label }) =>
            href.startsWith("#") ? (
              <a
                key={href}
                href={href}
                onClick={(e) => scrollToSection(e, href)}
                className="block px-6 py-3 text-center hover:bg-emerald-800 hover:text-amber-300 transition-colors duration-300"
              >
                {label}
              </a>
            ) : (
              <Link
                key={href}
                href={href}
                className="block px-6 py-3 text-center hover:bg-emerald-800 hover:text-amber-300 transition-colors duration-300"
              >
                {label}
              </Link>
            )
          )}
          <a
            href="#contacto"
            onClick={(e) => scrollToSection(e, "#contacto")}
            className="block px-6 py-3 text-center bg-amber-400 text-emerald-900 font-semibold"
          >
            Demo
          </a>
        </div>
      )}
    </nav>
  );
};

const Hero: React.FC<SectionProps> = ({ id }) => (
  <section
    id={id}
    className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 text-white flex items-center pt-24 relative overflow-hidden"
  >
    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_rgba(244,187,74,0.25),_transparent_45%),radial-gradient(circle_at_30%_20%,_rgba(16,185,129,0.35),_transparent_35%)]" />
    <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center relative z-10">
      <div className="space-y-6">
        <div className="inline-flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-full text-sm text-amber-200">
          <Sparkles size={16} />
          <span>{content.hero.eyebrow}</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">
          {content.hero.title}{" "}
          <span className="text-amber-300">{content.hero.subtitle}</span>
        </h1>
        <p className="text-lg text-emerald-100 max-w-2xl">
          {content.hero.description}
        </p>
        <div className="flex flex-wrap gap-4">
          <a
            href="#capacidades"
            className="bg-amber-400 hover:bg-amber-300 text-emerald-900 font-semibold px-6 py-3 rounded-lg shadow-lg transition"
          >
            {content.hero.primaryCta}
          </a>
          <a
            href={content.hero.secondaryHref}
            className="border border-white/30 hover:border-amber-300 text-white px-6 py-3 rounded-lg font-semibold flex items-center space-x-2 transition"
          >
            <span>{content.hero.secondaryCta}</span>
            <ChevronDown size={18} />
          </a>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 pt-6">
          {content.highlights.map((item) => (
            <div
              key={item}
              className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-emerald-50"
            >
              {item}
            </div>
          ))}
        </div>
      </div>
      <div className="relative hidden lg:block">
        <div className="absolute -inset-6 bg-emerald-400/20 blur-3xl rounded-full" />
        <div className="relative bg-white/5 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <img
            src="images/ChatGPT Image 25 may 2025, 14_02_47.png"
            alt="Sistema de visión autónomo en operación"
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-emerald-950/90 to-transparent p-6 space-y-2">
            <p className="text-sm text-emerald-100">
              Operación autónoma en campo y línea de proceso.
            </p>
            <div className="flex items-center space-x-3 text-amber-200 text-sm">
              <ShieldCheck size={16} />
              <span>Visión validada en ambientes reales.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const PainPoints: React.FC<SectionProps> = ({ id }) => (
  <section id={id} className="py-20 bg-emerald-50">
    <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
      <div className="space-y-4">
        <p className="text-emerald-700 font-semibold flex items-center space-x-2">
          <Target className="text-emerald-600" />
          <span>Operación basada en realidad</span>
        </p>
        <h2 className="text-4xl font-bold text-emerald-950 leading-tight">
          {content.painPoints.title}
        </h2>
        <p className="text-lg text-emerald-700 leading-relaxed">
          {content.painPoints.description}
        </p>
        <div className="bg-white border border-emerald-100 rounded-2xl p-6 shadow-sm">
          <p className="text-xl text-emerald-900 italic">
            “{content.painPoints.quote}”
          </p>
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-4 lg:gap-6">
        {content.painPoints.items.map((item) => (
          <div
            key={item.title}
            className="bg-white border border-emerald-100 rounded-xl p-5 shadow-sm hover:shadow-lg transition"
          >
            <h3 className="text-lg font-semibold text-emerald-900 mb-2">
              {item.title}
            </h3>
            <p className="text-emerald-700 text-sm leading-relaxed">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const Capabilities: React.FC<SectionProps> = ({ id }) => (
  <section id={id} className="py-20 bg-white">
    <div className="container mx-auto px-6">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <p className="text-emerald-600 font-semibold">{content.capabilities.description}</p>
        <h2 className="text-4xl font-bold text-emerald-950">
          {content.capabilities.title}
        </h2>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
        {content.capabilities.items.map((item) => (
          <div
            key={item.title}
            className="h-full bg-gradient-to-br from-emerald-900 to-emerald-800 text-white rounded-2xl p-6 shadow-xl border border-white/10"
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 mb-4">
              <item.icon size={26} className="text-amber-300" />
            </div>
            <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
            <p className="text-emerald-100 text-sm leading-relaxed">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const CaseStudy: React.FC<SectionProps> = ({ id }) => (
  <section id={id} className="py-20 bg-emerald-900 text-white">
    <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {content.caseStudy.badges.map((badge) => (
            <span
              key={badge}
              className="bg-white/10 border border-white/20 px-3 py-1 rounded-full text-sm"
            >
              {badge}
            </span>
          ))}
        </div>
        <p className="text-amber-200 font-semibold">{content.caseStudy.title}</p>
        <h3 className="text-4xl font-bold leading-tight">
          {content.caseStudy.name}
        </h3>
        <p className="text-emerald-50 leading-relaxed">
          {content.caseStudy.summary}
        </p>
        <div className="flex items-center space-x-3 text-emerald-100">
          <ShieldCheck size={18} className="text-amber-300" />
          <span>{content.caseStudy.standards}</span>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 pt-4">
          {content.caseStudy.metrics.map((metric) => (
            <div
              key={metric.label}
              className="bg-white/5 border border-white/10 rounded-xl p-4 text-center"
            >
              <div className="text-3xl font-extrabold text-amber-300">
                {metric.value}
              </div>
              <p className="text-sm text-emerald-100">{metric.label}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="relative">
        <div className="absolute -inset-6 bg-amber-300/10 blur-3xl rounded-full" />
        <div className="relative bg-white rounded-2xl overflow-hidden shadow-2xl border border-amber-100/40">
          <img
            src="images/WhatsApp Image 2025-05-24 at 23.20.29.jpeg"
            alt="Bulbos de Lilium en cinta transportadora"
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 left-4 bg-emerald-900 text-white px-4 py-2 rounded-full text-sm flex items-center space-x-2 shadow">
            <Trophy size={16} className="text-amber-300" />
            <span>97.54% Precisión</span>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const Contact: React.FC<SectionProps> = ({ id }) => (
  <section id={id} className="py-20 bg-emerald-50">
    <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
      <div className="space-y-4">
        <p className="text-emerald-700 font-semibold">{content.contact.title}</p>
        <h3 className="text-4xl font-bold text-emerald-950 leading-tight">
          {content.contact.description}
        </h3>
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <a
            href="#contacto"
            className="bg-emerald-900 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:bg-emerald-800 transition"
          >
            {content.contact.cta}
          </a>
          <a
            href={`mailto:${content.brand.email}`}
            className="flex items-center space-x-2 text-emerald-800 font-semibold"
          >
            <ArrowRight size={18} />
            <span>{content.brand.email}</span>
          </a>
        </div>
      </div>
      <div className="bg-white border border-emerald-100 rounded-2xl p-8 shadow-lg space-y-4">
        <div className="flex items-center space-x-3">
          <CheckCircle2 className="text-emerald-600" />
          <p className="text-emerald-900 font-semibold">Datos listos para tu ERP o Excel en tiempo real.</p>
        </div>
        <div className="flex items-center space-x-3">
          <Cpu className="text-emerald-600" />
          <p className="text-emerald-900 font-semibold">Visión autónoma sin dependencia de la nube.</p>
        </div>
        <div className="flex items-center space-x-3">
          <Leaf className="text-emerald-600" />
          <p className="text-emerald-900 font-semibold">Optimiza tus flujos desde la cosecha hasta el proceso.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 pt-4 text-emerald-800">
          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4">
            <p className="text-sm text-emerald-600">Teléfono</p>
            <a
              href={`tel:${content.brand.phone.replace(/\s/g, "")}`}
              className="font-semibold"
            >
              {content.brand.phone}
            </a>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4">
            <p className="text-sm text-emerald-600">Correo</p>
            <a href={`mailto:${content.brand.email}`} className="font-semibold">
              {content.brand.email}
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const Footer: React.FC = () => (
  <footer className="bg-emerald-950 text-emerald-100 py-10">
    <div className="container mx-auto px-6 flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
      <div className="flex items-center space-x-3">
        <Logo />
        <span className="text-sm text-emerald-300">© 2025 Qualiblick Inc.</span>
      </div>
      <div className="flex items-center space-x-6 text-sm text-emerald-200">
        <span>Plataforma</span>
        <span>Arquitectura</span>
        <span>Validación Industrial</span>
        <span>Casos de Estudio</span>
        <span>Contacto</span>
      </div>
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

    document.querySelectorAll("section").forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="font-sans antialiased bg-white">
      <Navbar />
      <main>
        <Hero id="home" />
        <PainPoints id="dolor" />
        <Capabilities id="capacidades" />
        <CaseStudy id="caso" />
        <Contact id="contacto" />
      </main>
      <Footer />
    </div>
  );
};

export default App;
