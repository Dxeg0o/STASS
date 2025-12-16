"use client";

import Link from "next/link";
import type React from "react";
import { useEffect, useState } from "react";

import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  Cpu,
  Gauge,
  Leaf,
  Menu,
  Phone,
  ShieldCheck,
  Sparkles,
  Target,
  X,
} from "lucide-react";

interface SectionProps {
  id: string;
}

const content = {
  name: "Qualiblick",
  phone: "+56 9 6229 6916",
  email: "contacto@qualiblick.com",
  hero: {
    eyebrow: "Tecnología validada industrialmente",
    title: "Digitaliza tu Producción Real. Sin Estimaciones.",
    subtitle:
      "Transforma tus flujos físicos en datos financieros exactos. Un sistema de visión autónomo que opera donde lo necesites: desde la cosecha en campo hasta la línea de proceso.",
    highlight: "Precisión validada en formas complejas (Bulbos de Lilium).",
    ctaPrimary: "Agendar Demo",
    ctaSecondary: "Ver Tecnología en Acción",
  },
  painPoints: {
    title: "La incertidumbre operativa te está costando dinero.",
    intro:
      "En la agroindustria, muchas veces se opera basándose en estimaciones al ojo o se obtienen los datos reales cuando el proceso ya terminó.",
    bullets: [
      {
        label: "Estimaciones",
        description: "Asumir rendimientos que no son reales.",
      },
      {
        label: "Datos Tardíos",
        description:
          "Saber cuánto produjiste cuando ya no puedes corregir errores.",
      },
      {
        label: "Puntos Ciegos",
        description: "No saber qué está pasando realmente en tu línea ahora mismo.",
      },
    ],
    quote: "Elimina la suposición. Toma decisiones con datos reales, al instante.",
  },
  capabilities: {
    title: "Diseñado para la realidad hostil de tu operación.",
    subtitle:
      "Tecnología robusta que se adapta a tu entorno, no al revés.",
    items: [
      {
        icon: Cpu,
        title: "Detecta lo que otros ignoran",
        description:
          "Entrenado para identificar productos orgánicos complejos e irregulares. Validado detectando bulbos, entiende rotación y calibres, ignorando tierra y suciedad.",
      },
      {
        icon: ShieldCheck,
        title: "Funciona donde está el problema",
        description:
          "Ya sea en medio del campo, en la recepción o en la salida del proceso. Nuestro hardware procesa localmente y no depende de cables de red ni internet estable.",
      },
      {
        icon: Gauge,
        title: "Listo para Temporada Alta",
        description:
          "Probado en flujos de alta velocidad (>20 objetos/segundo). Cuando la presión sube, el sistema mantiene la precisión sin saturarse.",
      },
      {
        icon: BarChart3,
        title: "Datos Financieros Inmediatos",
        description:
          "Convierte el flujo físico en números para tu ERP o Excel. Deja de esperar al informe de cierre de turno; ten el control en tiempo real.",
      },
    ],
  },
  caseStudy: {
    title: "Caso de Éxito",
    client: "Operativa Valdivia Lilies",
    badge: "Implementación Exitosa",
    quote:
      "Nuestra tecnología ha superado uno de los desafíos más difíciles de visión artificial: El Bulbo de Lilium (formas irregulares, suciedad y superposición). Si podemos contar esto con precisión, podemos medir tu producción.",
    standards: "Tecnología probada bajo estándares de Holanda y Chile.",
    metrics: [
      { label: "Precisión en Conteo de Bulbos", value: "97.54%" },
      { label: "Operación Continua", value: "24/7" },
      { label: "Dependencia de Nube", value: "0" },
    ],
  },
  cta: {
    title: "Haz que tu operación tenga datos precisos a tiempo.",
    subtitle: "Agendar una Demostración",
  },
  footer: {
    description:
      "Qualiblick: Transformando la agroindustria mediante visión artificial y datos financieros de alta precisión.",
    links: [
      "Plataforma",
      "Arquitectura",
      "Validación Industrial",
      "Casos de Estudio",
      "Contacto",
    ],
    location: "Santiago, Chile",
  },
};

const Logo: React.FC = () => (
  <div className="flex items-center space-x-2">
    <img src="images/qb.png" alt="Qualiblick" className="h-10 w-auto" />
    <span className="text-lg font-semibold text-emerald-50">{content.name}</span>
  </div>
);

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { href: "#home", label: "Tecnología" },
    { href: "#pain-points", label: "Dolores" },
    { href: "#capabilities", label: "Capacidades" },
    { href: "#case-study", label: "Casos de Éxito" },
    { href: "#contact", label: "Contacto" },
    { href: "#cta", label: "Agendar Demo" },
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
    <nav className="fixed inset-x-0 top-0 z-50 bg-emerald-950/80 backdrop-blur-md text-white shadow-lg">
      <div className="container mx-auto flex items-center justify-between px-6 py-4">
        <a
          href="#home"
          onClick={(e) => scrollToSection(e, "#home")}
          className="flex items-center space-x-3"
        >
          <Logo />
        </a>
        <div className="hidden lg:flex items-center space-x-8 text-sm font-medium">
          {navLinks.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              onClick={(e) => scrollToSection(e, href)}
              className="transition-colors duration-300 hover:text-amber-300"
            >
              {label}
            </a>
          ))}
          <Link
            href="/login"
            className="rounded-full border border-amber-300/70 px-4 py-2 text-amber-200 transition hover:bg-amber-300 hover:text-emerald-950"
          >
            Iniciar sesión
          </Link>
        </div>
        <button
          className="rounded-md p-2 text-white lg:hidden"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>
      {isOpen && (
        <div className="space-y-2 border-t border-emerald-800 bg-emerald-900 px-6 py-4 lg:hidden">
          {navLinks.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              onClick={(e) => scrollToSection(e, href)}
              className="block rounded-md px-3 py-2 text-sm transition-colors hover:bg-emerald-800 hover:text-amber-200"
            >
              {label}
            </a>
          ))}
          <Link
            href="/register"
            className="block rounded-md bg-amber-300 px-3 py-2 text-center text-emerald-950 font-semibold"
          >
            Registrarse
          </Link>
        </div>
      )}
    </nav>
  );
};

const Hero: React.FC<SectionProps> = ({ id }) => {
  const scrollToCTA = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    document.querySelector("#cta")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id={id}
      className="relative min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 text-white"
    >
      <div className="absolute inset-0 opacity-15">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="120" height="120" patternUnits="userSpaceOnUse">
              <path
                d="M0 120 L120 0 M0 0 L120 120"
                stroke="rgba(252,211,77,0.16)"
                strokeWidth="1"
                fill="none"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="container relative mx-auto flex min-h-screen items-center px-6 pt-28 pb-16">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center space-x-2 rounded-full bg-emerald-800/80 px-4 py-2 text-xs uppercase tracking-[0.25em] text-amber-200">
              <span>{content.hero.eyebrow}</span>
              <span className="h-1 w-1 rounded-full bg-amber-300" />
              <span>Agroindustria</span>
            </div>
            <h1 className="text-4xl leading-tight font-extrabold md:text-5xl lg:text-6xl">
              {content.hero.title}
            </h1>
            <p className="max-w-2xl text-lg text-emerald-100 md:text-xl">
              {content.hero.subtitle}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={scrollToCTA}
                className="inline-flex items-center rounded-full bg-amber-300 px-6 py-3 text-lg font-semibold text-emerald-950 shadow-lg shadow-amber-500/30 transition hover:-translate-y-0.5 hover:bg-amber-200"
              >
                {content.hero.ctaPrimary}
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
              <a
                href="#capabilities"
                className="inline-flex items-center rounded-full border border-amber-200/60 px-6 py-3 text-lg font-semibold text-amber-100 transition hover:-translate-y-0.5 hover:border-amber-200 hover:text-white"
              >
                {content.hero.ctaSecondary}
                <ChevronDown className="ml-2 h-5 w-5" />
              </a>
            </div>
            <div className="rounded-2xl border border-emerald-800/80 bg-emerald-900/50 p-6 shadow-inner shadow-black/30">
              <div className="flex items-center space-x-3 text-amber-200">
                <Sparkles className="h-5 w-5" />
                <span className="text-sm font-semibold tracking-wide uppercase">
                  {content.hero.highlight}
                </span>
              </div>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="relative overflow-hidden rounded-3xl border border-emerald-700/70 bg-emerald-900/80 shadow-2xl shadow-emerald-950/60">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-300/10 to-transparent" />
              <img
                src="images/ChatGPT Image 25 may 2025, 14_02_47.png"
                alt="Sistema de visión en agroindustria"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute -left-10 -bottom-14 w-40 rounded-2xl border border-emerald-700/70 bg-emerald-950/90 p-4 text-amber-200 shadow-xl">
              <p className="text-xs uppercase tracking-wide text-emerald-100">
                Precisión comprobada
              </p>
              <p className="text-2xl font-bold">97.54%</p>
              <p className="text-xs text-emerald-200">Conteo de bulbos</p>
            </div>
            <div className="absolute -right-8 -top-10 w-48 overflow-hidden rounded-2xl border border-emerald-700/70 shadow-xl">
              <img
                src="images/WhatsApp Image 2025-05-24 at 23.20.29 (1).jpeg"
                alt="Operación en campo"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const PainPoints: React.FC<SectionProps> = ({ id }) => (
  <section id={id} className="bg-emerald-50 py-20">
    <div className="container mx-auto px-6">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-4xl font-bold text-emerald-950 md:text-5xl">
          {content.painPoints.title}
        </h2>
        <p className="mt-4 text-lg text-emerald-700">
          {content.painPoints.intro}
        </p>
      </div>
      <div className="mt-12 grid gap-8 md:grid-cols-3">
        {content.painPoints.bullets.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
              <Target className="h-6 w-6" />
            </div>
            <h3 className="mt-6 text-xl font-semibold text-emerald-900">
              {item.label}
            </h3>
            <p className="mt-3 text-emerald-700">{item.description}</p>
          </div>
        ))}
      </div>
      <div className="mt-12 rounded-2xl bg-emerald-900 px-8 py-6 text-center text-amber-100 shadow-lg">
        <p className="text-lg font-semibold">{content.painPoints.quote}</p>
      </div>
    </div>
  </section>
);

const Capabilities: React.FC<SectionProps> = ({ id }) => (
  <section id={id} className="bg-emerald-900 py-20 text-white">
    <div className="container mx-auto px-6">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm uppercase tracking-[0.25em] text-amber-200">
          {content.capabilities.subtitle}
        </p>
        <h2 className="mt-3 text-4xl font-bold md:text-5xl">
          {content.capabilities.title}
        </h2>
      </div>
      <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        {content.capabilities.items.map((item) => (
          <div
            key={item.title}
            className="flex flex-col rounded-2xl border border-emerald-700/70 bg-emerald-950/40 p-6 shadow-lg transition hover:-translate-y-1 hover:border-amber-300/60 hover:shadow-amber-500/20"
          >
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-800 text-amber-200">
              <item.icon className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold">{item.title}</h3>
            <p className="mt-3 text-emerald-100">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const CaseStudy: React.FC<SectionProps> = ({ id }) => (
  <section id={id} className="bg-emerald-50 py-20">
    <div className="container mx-auto px-6">
      <div className="rounded-3xl border border-emerald-100 bg-white p-10 shadow-xl lg:flex lg:items-center lg:gap-12">
        <div className="lg:w-1/2">
          <div className="inline-flex items-center rounded-full bg-emerald-100 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-emerald-800">
            {content.caseStudy.badge}
          </div>
          <h2 className="mt-4 text-3xl font-bold text-emerald-950 md:text-4xl">
            {content.caseStudy.title}
          </h2>
          <p className="mt-2 text-lg text-emerald-700">{content.caseStudy.client}</p>
          <p className="mt-6 text-emerald-800">{content.caseStudy.quote}</p>
          <p className="mt-4 text-sm uppercase tracking-[0.25em] text-emerald-600">
            {content.caseStudy.standards}
          </p>
        </div>
        <div className="mt-8 grid gap-6 rounded-2xl bg-emerald-900 px-6 py-8 text-white shadow-lg lg:mt-0 lg:w-1/2 lg:grid-cols-3">
          {content.caseStudy.metrics.map((metric) => (
            <div key={metric.label} className="text-center lg:text-left">
              <p className="text-3xl font-extrabold text-amber-300">{metric.value}</p>
              <p className="mt-2 text-sm uppercase tracking-wide text-emerald-200">
                {metric.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

const CTA: React.FC<SectionProps> = ({ id }) => (
  <section
    id={id}
    className="bg-gradient-to-br from-amber-300 via-amber-200 to-emerald-100 py-16"
  >
    <div className="container mx-auto px-6 text-center">
      <h2 className="text-3xl font-bold text-emerald-950 md:text-4xl">
        {content.cta.title}
      </h2>
      <p className="mt-3 text-lg text-emerald-800">{content.cta.subtitle}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-6">
        <a
          href={`tel:${content.phone.replace(/\s/g, "")}`}
          className="inline-flex items-center rounded-full bg-emerald-950 px-6 py-3 text-lg font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-900"
        >
          <Phone className="mr-3 h-5 w-5" /> {content.phone}
        </a>
        <a
          href={`mailto:${content.email}`}
          className="inline-flex items-center rounded-full border border-emerald-900 px-6 py-3 text-lg font-semibold text-emerald-950 transition hover:-translate-y-0.5 hover:bg-emerald-900 hover:text-white"
        >
          <Sparkles className="mr-3 h-5 w-5" /> {content.email}
        </a>
      </div>
    </div>
  </section>
);

const Contact: React.FC<SectionProps> = ({ id }) => (
  <section id={id} className="bg-emerald-950 py-16 text-white">
    <div className="container mx-auto grid gap-10 px-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <h3 className="text-2xl font-bold">Hablemos de tu operación</h3>
        <p className="mt-3 text-emerald-100">
          Estamos listos para acompañarte desde la primera instalación hasta el
          escalamiento. Coordina una conversación y descubre cómo podemos dar
          visibilidad completa a tu línea.
        </p>
      </div>
      <div className="space-y-3">
        <a
          href={`mailto:${content.email}`}
          className="flex items-center space-x-3 text-amber-200 hover:text-amber-100"
        >
          <Sparkles className="h-5 w-5" />
          <span>{content.email}</span>
        </a>
        <a
          href={`tel:${content.phone.replace(/\s/g, "")}`}
          className="flex items-center space-x-3 text-amber-200 hover:text-amber-100"
        >
          <Phone className="h-5 w-5" />
          <span>{content.phone}</span>
        </a>
        <div className="flex items-center space-x-3 text-emerald-200">
          <Leaf className="h-5 w-5" />
          <span>{content.footer.location}</span>
        </div>
      </div>
    </div>
  </section>
);

const Footer: React.FC = () => (
  <footer className="bg-emerald-900 py-10 text-emerald-100">
    <div className="container mx-auto grid gap-8 px-6 md:grid-cols-3 md:items-center">
      <div className="space-y-3">
        <Logo />
        <p className="text-sm text-emerald-200">{content.footer.description}</p>
      </div>
      <div className="flex flex-wrap gap-3 text-sm font-semibold text-emerald-50 md:justify-center">
        {content.footer.links.map((link) => (
          <span
            key={link}
            className="rounded-full border border-emerald-700 px-3 py-1"
          >
            {link}
          </span>
        ))}
      </div>
      <p className="text-sm text-emerald-300 md:text-right">
        © {new Date().getFullYear()} {content.name}. Todos los derechos reservados.
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
      { threshold: 0.2 }
    );

    document.querySelectorAll("section > div").forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-emerald-50 font-sans antialiased">
      <Navbar />
      <main>
        <Hero id="home" />
        <PainPoints id="pain-points" />
        <Capabilities id="capabilities" />
        <CaseStudy id="case-study" />
        <CTA id="cta" />
        <Contact id="contact" />
      </main>
      <Footer />
    </div>
  );
};

export default App;
