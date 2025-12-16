"use client";

import Link from "next/link";
import type React from "react";
import { useEffect, useState } from "react";
import {
  BarChart3,
  ChevronDown,
  Cpu,
  Gauge,
  Lightbulb,
  Mail,
  Menu,
  Phone,
  ShieldCheck,
  Target,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";

interface SectionProps {
  id: string;
}

const companyData = {
  name: "Qualiblick",
  phone: "+56 9 6229 6916",
  email: "contacto@qualiblick.com",
  hero: {
    eyebrow: "Tecnología validada industrialmente",
    title: "Digitaliza tu Producción Real.",
    subtitle: "Sin Estimaciones.",
    description:
      "Transforma tus flujos físicos en datos financieros exactos. Un sistema de visión autónomo que opera donde lo necesites: desde la cosecha en campo hasta la línea de proceso.",
    cta: "Agendar una Demostración",
  },
  painPoints: [
    {
      title: "Estimaciones",
      description: "Asumir rendimientos que no son reales.",
    },
    {
      title: "Datos Tardíos",
      description: "Saber cuánto produjiste cuando ya no puedes corregir errores.",
    },
    {
      title: "Puntos Ciegos",
      description: "No saber qué está pasando realmente en tu línea ahora mismo.",
    },
  ],
  technology: {
    title: "Diseñado para la realidad hostil de tu operación.",
    description:
      "Tecnología robusta que se adapta a tu entorno, no al revés. Entrenada para identificar productos orgánicos complejos e irregulares, sin depender de conectividad inestable.",
    features: [
      {
        icon: ShieldCheck,
        title: "Detecta lo que otros ignoran",
        description:
          "Entrenado para formas irregulares y complejas. Valida rotación, calibres y descarta ruido como tierra o suciedad.",
      },
      {
        icon: Cpu,
        title: "Funciona donde está el problema",
        description:
          "Hardware que procesa localmente en campo, recepción o línea de salida. No depende de cables de red ni internet estable.",
      },
      {
        icon: Zap,
        title: "Listo para temporada alta",
        description:
          "Probado en flujos de alta velocidad (>20 objetos/segundo) manteniendo precisión sin saturarse cuando la presión sube.",
      },
      {
        icon: BarChart3,
        title: "Datos financieros inmediatos",
        description:
          "Convierte el flujo físico en números para tu ERP o Excel. Control en tiempo real, sin esperar el cierre del turno.",
      },
    ],
  },
  caseStudy: {
    title: "Caso de Éxito Valdivia Lilies",
    quote:
      "Nuestra tecnología ha superado uno de los desafíos más difíciles de visión artificial: el Bulbo de Lilium (formas irregulares, suciedad y superposición). Si podemos contar esto con precisión, podemos medir tu producción.",
    stats: [
      {
        icon: Gauge,
        value: "97.54%",
        label: "Precisión en conteo de bulbos",
      },
      {
        icon: Lightbulb,
        value: "24/7",
        label: "Operación continua",
      },
      {
        icon: TrendingUp,
        value: "0",
        label: "Dependencia de nube",
      },
    ],
    footer: "Tecnología probada bajo estándares de Holanda y Chile.",
  },
  locations: {
    city: "Santiago, Chile",
  },
};

const Logo: React.FC = () => (
  <div className="flex items-center space-x-2">
    <img src="images/qb.png" alt="Qualiblick" className="h-12 w-32 object-contain" />
  </div>
);

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { href: "#home", label: "Tecnología" },
    { href: "#problema", label: "Desafío" },
    { href: "#tecnologia", label: "Solución" },
    { href: "#caso-exito", label: "Casos de Éxito" },
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
    <nav className="fixed z-50 w-full bg-emerald-900/90 backdrop-blur-md text-white shadow-lg">
      <div className="container mx-auto flex items-center justify-between p-4">
        <a href="#home" onClick={(e) => scrollToSection(e, "#home")}>
          <Logo />
        </a>
        <div className="hidden items-center space-x-6 md:flex">
          {navLinks.map(({ href, label }) =>
            href.startsWith("#") ? (
              <a
                key={href}
                href={href}
                onClick={(e) => scrollToSection(e, href)}
                className="font-medium transition-colors duration-300 hover:text-amber-300"
              >
                {label}
              </a>
            ) : (
              <Link
                key={href}
                href={href}
                className="font-medium transition-colors duration-300 hover:text-amber-300"
              >
                {label}
              </Link>
            )
          )}
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
        <div className="absolute left-0 right-0 top-full bg-emerald-800 shadow-xl md:hidden">
          {navLinks.map(({ href, label }) =>
            href.startsWith("#") ? (
              <a
                key={href}
                href={href}
                onClick={(e) => scrollToSection(e, href)}
                className="block px-6 py-3 text-center text-white transition-colors duration-300 hover:bg-emerald-700 hover:text-amber-300"
              >
                {label}
              </a>
            ) : (
              <Link
                key={href}
                href={href}
                className="block px-6 py-3 text-center text-white transition-colors duration-300 hover:bg-emerald-700 hover:text-amber-300"
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
  const scrollToContact = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    document.querySelector("#contacto")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id={id}
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-700 pt-24 text-white"
    >
      <div className="absolute inset-0 opacity-20">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="heroPattern"
              patternUnits="userSpaceOnUse"
              width="120"
              height="120"
              patternTransform="scale(1) rotate(20)"
            >
              <path d="M0 60 L60 0 L120 60 L60 120 Z" fill="rgba(249, 115, 22, 0.08)" />
              <circle cx="60" cy="60" r="3" fill="rgba(190, 242, 100, 0.3)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#heroPattern)" />
        </svg>
      </div>

      <div className="container relative z-10 mx-auto px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="text-center lg:text-left">
            <p className="mb-4 inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-amber-200">
              {companyData.hero.eyebrow}
            </p>
            <h1 className="mb-4 text-4xl font-extrabold leading-tight md:text-6xl lg:text-7xl">
              {companyData.hero.title} {" "}
              <span className="text-amber-300">{companyData.hero.subtitle}</span>
            </h1>
            <p className="mb-10 text-lg leading-relaxed text-emerald-100 md:text-xl">
              {companyData.hero.description}
            </p>
            <div className="flex flex-col items-center space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4 lg:items-start">
              <button
                onClick={scrollToContact}
                className="flex items-center justify-center rounded-lg bg-amber-400 px-8 py-4 text-lg font-semibold text-emerald-950 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-amber-300 hover:shadow-amber-400/50"
              >
                {companyData.hero.cta}
                <ChevronDown className="ml-3" />
              </button>
              <div className="flex items-center space-x-3 rounded-lg bg-white/5 px-4 py-3 text-sm text-emerald-100">
                <ShieldCheck className="text-amber-300" />
                <span>Precisión validada en formas complejas (Bulbos de Lilium).</span>
              </div>
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="relative mx-auto max-w-xl">
              <div className="relative overflow-hidden rounded-3xl shadow-2xl ring-1 ring-emerald-400/30">
                <img
                  src="images/ChatGPT Image 25 may 2025, 14_02_47.png"
                  alt="Sistema de visión Qualiblick"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/70 via-transparent" />
              </div>
              <div className="absolute -right-10 -top-10 w-48 overflow-hidden rounded-2xl shadow-xl ring-1 ring-white/20">
                <img
                  src="images/WhatsApp Image 2025-05-24 at 23.20.29.jpeg"
                  alt="Operación en terreno"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="absolute -bottom-12 -left-12 w-56 overflow-hidden rounded-2xl shadow-xl ring-1 ring-white/20">
                <img
                  src="images/WhatsApp Image 2025-05-24 at 23.20.29 (1).jpeg"
                  alt="Visión artificial en proceso"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const PainSection: React.FC<SectionProps> = ({ id }) => (
  <section id={id} className="bg-emerald-50 py-20">
    <div className="container mx-auto px-6">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="mb-4 text-4xl font-bold text-emerald-900">
          La incertidumbre operativa te está costando dinero.
        </h2>
        <p className="text-lg text-emerald-700">
          En la agroindustria, muchas veces se opera basándose en estimaciones al ojo o se obtienen los datos reales cuando el proceso ya terminó.
        </p>
      </div>
      <div className="mt-12 grid gap-8 md:grid-cols-3">
        {companyData.painPoints.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl bg-white p-8 shadow-lg ring-1 ring-emerald-100 transition-all duration-300 hover:-translate-y-2 hover:shadow-emerald-200"
          >
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Target />
            </div>
            <h3 className="mb-3 text-2xl font-semibold text-emerald-900">
              {item.title}
            </h3>
            <p className="text-emerald-700">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const Technology: React.FC<SectionProps> = ({ id }) => (
  <section id={id} className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 py-20 text-white">
    <div className="container mx-auto px-6">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="mb-4 text-4xl font-bold">
          {companyData.technology.title}
        </h2>
        <p className="text-lg text-emerald-100">
          {companyData.technology.description}
        </p>
      </div>
      <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        {companyData.technology.features.map((feature) => (
          <div
            key={feature.title}
            className="rounded-2xl bg-white/5 p-6 shadow-lg ring-1 ring-white/10 transition-all duration-300 hover:-translate-y-2 hover:ring-amber-300/40"
          >
            <feature.icon className="mb-4 text-amber-300" size={42} />
            <h3 className="mb-3 text-xl font-semibold text-white">{feature.title}</h3>
            <p className="text-emerald-100">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const CaseStudy: React.FC<SectionProps> = ({ id }) => (
  <section id={id} className="bg-white py-20">
    <div className="container mx-auto px-6">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <p className="mb-3 inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
            Validación Industrial
          </p>
          <h2 className="mb-4 text-4xl font-bold text-emerald-900">
            {companyData.caseStudy.title}
          </h2>
          <p className="text-lg leading-relaxed text-emerald-800">
            {companyData.caseStudy.quote}
          </p>
          <div className="mt-6 rounded-xl bg-emerald-50 p-5 text-emerald-700 ring-1 ring-emerald-100">
            <p className="font-semibold">{companyData.caseStudy.footer}</p>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {companyData.caseStudy.stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center rounded-2xl bg-emerald-900 p-6 text-center text-white shadow-lg"
            >
              <stat.icon size={36} className="mb-3 text-amber-300" />
              <div className="text-4xl font-extrabold text-amber-300">{stat.value}</div>
              <p className="mt-2 text-sm text-emerald-100">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

const Contact: React.FC<SectionProps> = ({ id }) => (
  <section id={id} className="bg-gradient-to-br from-amber-100 via-white to-emerald-50 py-20">
    <div className="container mx-auto px-6 text-center">
      <Mail size={52} className="mx-auto mb-6 text-emerald-700" />
      <h2 className="mb-4 text-4xl font-bold text-emerald-900">
        Haz que tu operación tenga datos precisos a tiempo.
      </h2>
      <p className="mx-auto max-w-2xl text-lg leading-relaxed text-emerald-800">
        Agendar una demostración es el primer paso para eliminar la suposición y tomar decisiones con datos reales, al instante.
      </p>
      <div className="mt-10 flex flex-col items-center justify-center space-y-4 text-lg text-emerald-900 md:flex-row md:space-x-10 md:space-y-0">
        <a
          href={`tel:${companyData.phone.replace(/\s/g, "")}`}
          className="flex items-center rounded-full bg-white px-5 py-3 font-semibold shadow-md ring-1 ring-emerald-100 transition-transform duration-300 hover:-translate-y-1 hover:shadow-emerald-200"
        >
          <Phone size={24} className="mr-3 text-emerald-700" /> {companyData.phone}
        </a>
        <a
          href={`mailto:${companyData.email}`}
          className="flex items-center rounded-full bg-emerald-900 px-5 py-3 font-semibold text-white shadow-md ring-1 ring-emerald-700 transition-transform duration-300 hover:-translate-y-1 hover:bg-emerald-800"
        >
          <Mail size={24} className="mr-3 text-amber-300" /> {companyData.email}
        </a>
      </div>
      <p className="mt-6 text-sm text-emerald-600">{companyData.locations.city}</p>
    </div>
  </section>
);

const Footer: React.FC = () => (
  <footer className="bg-emerald-950 py-10 text-center text-emerald-100">
    <div className="container mx-auto px-6">
      <div className="mb-4 flex items-center justify-center">
        <Logo />
      </div>
      <p>&copy; {new Date().getFullYear()} {companyData.name}. Todos los derechos reservados.</p>
      <p className="mt-1 text-sm text-emerald-300">
        Qualiblick: Transformando la agroindustria mediante visión artificial y datos financieros de alta precisión.
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
      .forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="font-sans antialiased bg-emerald-50">
      <Navbar />
      <main>
        <Hero id="home" />
        <PainSection id="problema" />
        <Technology id="tecnologia" />
        <CaseStudy id="caso-exito" />
        <Contact id="contacto" />
      </main>
      <Footer />
    </div>
  );
};

export default App;
