"use client";

import Link from "next/link";
import type React from "react";
import { useState } from "react";

import {
  BadgeCheck,
  BarChart3,
  CircuitBoard,
  Gauge,
  Menu,
  Phone,
  ShieldCheck,
  Signal,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";

interface SectionProps {
  id: string;
}

const content = {
  brand: {
    name: "Qualiblick",
    tagline: "Visión artificial para operaciones reales.",
    phone: "+56 9 6229 6916",
    email: "contacto@qualiblick.com",
  },
  hero: {
    badge: "Tecnología validada industrialmente",
    title: "Digitaliza tu producción real. Sin estimaciones.",
    description:
      "Transforma tus flujos físicos en datos financieros exactos con un sistema de visión autónomo que opera donde lo necesites: desde la cosecha en campo hasta la línea de proceso.",
    ctaPrimary: "Ver tecnología en acción",
    ctaSecondary: "Agendar una demostración",
    highlight: "Precisión validada en formas complejas (Bulbos de Lilium).",
  },
  friction: {
    heading: "La incertidumbre operativa te está costando dinero.",
    subheading:
      "En la agroindustria, muchas veces se opera basándose en estimaciones al ojo o se obtienen los datos reales cuando el proceso ya terminó.",
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
    heading: "Diseñado para la realidad hostil de tu operación.",
    subheading:
      "Tecnología robusta que se adapta a tu entorno, no al revés.",
    features: [
      {
        icon: Sparkles,
        title: "Detecta lo que otros ignoran.",
        description:
          "Entrenado para identificar productos orgánicos complejos e irregulares. Validado detectando bulbos, entiende rotación y calibres, ignorando tierra y suciedad.",
      },
      {
        icon: Signal,
        title: "Funciona donde está el problema.",
        description:
          "Ya sea en medio del campo, en la recepción o en la salida del proceso. Nuestro hardware procesa localmente y no depende de cables de red ni internet estable.",
      },
      {
        icon: Gauge,
        title: "Listo para temporada alta.",
        description:
          "Probado en flujos de alta velocidad (>20 objetos/segundo). Cuando la presión sube, el sistema mantiene la precisión sin saturarse.",
      },
      {
        icon: BarChart3,
        title: "Datos financieros inmediatos.",
        description:
          "Convierte el flujo físico en números para tu ERP o Excel. Deja de esperar al informe de cierre de turno; ten el control en tiempo real.",
      },
    ],
  },
  caseStudy: {
    heading: "Caso de Éxito Valdivia Lilies",
    description:
      "Nuestra tecnología ha superado uno de los desafíos más difíciles de visión artificial: el bulbo de Lilium. Si podemos contar esto con precisión, podemos medir tu producción.",
    stats: [
      { label: "Precisión en Conteo de Bulbos", value: "97.54%" },
      { label: "Operación Continua", value: "24/7" },
      { label: "Dependencia de Nube", value: "0" },
    ],
    note: "Tecnología probada bajo estándares de Holanda y Chile.",
  },
  closing: {
    heading: "Haz que tu operación tenga datos precisos a tiempo.",
    cta: "Agendar una demostración",
  },
  footer: {
    legal: "Qualiblick: Transformando la agroindustria mediante visión artificial y datos financieros de alta precisión.",
    links: [
      { label: "Plataforma", href: "#tecnologia" },
      { label: "Validación Industrial", href: "#caso" },
      { label: "Casos de Estudio", href: "#caso" },
      { label: "Contacto", href: "#contacto" },
    ],
  },
};

const Logo: React.FC = () => (
  <div className="flex items-center space-x-3">
    <div className="h-12 w-12 rounded-full bg-emerald-900 text-amber-200 flex items-center justify-center font-black text-lg shadow-lg">
      QB
    </div>
    <div className="text-left">
      <p className="text-lg font-bold text-emerald-50">{content.brand.name}</p>
      <p className="text-sm text-emerald-200">{content.brand.tagline}</p>
    </div>
  </div>
);

const Navbar: React.FC = () => {
  const [open, setOpen] = useState(false);

  const navLinks = [
    { href: "#home", label: "Tecnología" },
    { href: "#problema", label: "Dolores" },
    { href: "#tecnologia", label: "Solución" },
    { href: "#caso", label: "Casos de Éxito" },
    { href: "#contacto", label: "Contacto" },
  ];

  const scrollTo = (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
    href: string
  ) => {
    e.preventDefault();
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
    setOpen(false);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-emerald-900/30 bg-emerald-950/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 text-white">
        <a href="#home" onClick={(e) => scrollTo(e, "#home")}> 
          <Logo />
        </a>
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              onClick={(e) => scrollTo(e, href)}
              className="text-sm font-semibold text-emerald-50 transition hover:text-amber-200"
            >
              {label}
            </a>
          ))}
          <Link
            href="/login"
            className="rounded-lg bg-amber-300 px-4 py-2 text-sm font-semibold text-emerald-950 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            Agendar Demo
          </Link>
        </nav>
        <button
          className="flex items-center justify-center rounded-md border border-emerald-800 p-2 md:hidden"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Abrir menú"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open && (
        <div className="border-t border-emerald-900/30 bg-emerald-950/95 px-6 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {navLinks.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                onClick={(e) => scrollTo(e, href)}
                className="rounded-md px-3 py-2 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-900"
              >
                {label}
              </a>
            ))}
            <Link
              href="/login"
              className="rounded-lg bg-amber-300 px-4 py-3 text-center text-sm font-semibold text-emerald-950 shadow-md transition hover:shadow-lg"
            >
              Agendar Demo
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

const Hero: React.FC<SectionProps> = ({ id }) => (
  <section
    id={id}
    className="relative isolate overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 text-white"
  >
    <div className="absolute inset-0 opacity-30">
      <div className="absolute -left-16 top-0 h-64 w-64 rounded-full bg-amber-400 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-emerald-500 blur-3xl" />
    </div>
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-12 px-6 pb-24 pt-32">
      <div className="flex flex-col gap-6 lg:max-w-3xl">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-700 bg-emerald-900/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-amber-200 shadow-lg">
          <BadgeCheck size={16} /> {content.hero.badge}
        </div>
        <h1 className="text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
          {content.hero.title}
        </h1>
        <p className="text-lg text-emerald-100 md:text-xl">
          {content.hero.description}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <a
            href="#tecnologia"
            onClick={(e) => {
              e.preventDefault();
              document
                .querySelector("#tecnologia")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
            className="rounded-full bg-amber-300 px-6 py-3 text-sm font-bold text-emerald-950 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            {content.hero.ctaPrimary}
          </a>
          <a
            href="#contacto"
            onClick={(e) => {
              e.preventDefault();
              document
                .querySelector("#contacto")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
            className="rounded-full border border-emerald-600 px-6 py-3 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-800"
          >
            {content.hero.ctaSecondary}
          </a>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-emerald-700 bg-emerald-900/70 p-4 text-sm text-emerald-100 shadow-lg lg:w-fit">
          <ShieldCheck className="text-amber-300" size={20} /> {content.hero.highlight}
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Cobertura", value: "Campo a planta" },
          { label: "Hardware", value: "Proceso local" },
          { label: "Velocidad", value: ">20 obj/seg" },
          { label: "Integración", value: "ERP / Excel" },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-emerald-700/60 bg-emerald-900/60 p-5 shadow-lg"
          >
            <p className="text-sm text-emerald-200">{item.label}</p>
            <p className="mt-2 text-2xl font-bold text-amber-200">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const Friction: React.FC<SectionProps> = ({ id }) => (
  <section id={id} className="bg-emerald-50 py-20">
    <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-2 lg:items-start">
      <div className="space-y-5">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-700">
          Operación sin datos
        </p>
        <h2 className="text-3xl font-bold text-emerald-950 md:text-4xl">
          {content.friction.heading}
        </h2>
        <p className="text-lg text-emerald-800">
          {content.friction.subheading}
        </p>
        <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
          <p className="text-xl font-semibold text-emerald-900">
            “{content.friction.quote}”
          </p>
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {content.friction.items.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-600">
              {item.title}
            </p>
            <p className="mt-3 text-base text-emerald-900">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const Capabilities: React.FC<SectionProps> = ({ id }) => (
  <section
    id={id}
    className="bg-gradient-to-br from-white via-emerald-50 to-white py-20"
  >
    <div className="mx-auto max-w-6xl px-6">
      <div className="mb-12 space-y-4 text-center">
        <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700 shadow-sm">
          <CircuitBoard size={16} /> Tecnología robusta
        </div>
        <h2 className="text-3xl font-bold text-emerald-950 md:text-4xl">
          {content.capabilities.heading}
        </h2>
        <p className="text-lg text-emerald-800">
          {content.capabilities.subheading}
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {content.capabilities.features.map((feature) => (
          <div
            key={feature.title}
            className="flex h-full flex-col gap-3 rounded-2xl border border-emerald-100 bg-white/70 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex items-center gap-3 text-emerald-900">
              <feature.icon className="text-amber-400" size={24} />
              <h3 className="text-xl font-semibold">{feature.title}</h3>
            </div>
            <p className="text-base text-emerald-800">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const CaseStudy: React.FC<SectionProps> = ({ id }) => (
  <section id={id} className="bg-emerald-950 py-20 text-white">
    <div className="mx-auto max-w-6xl px-6">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div className="space-y-5">
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-700 bg-emerald-900/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-200">
            Caso de éxito
          </p>
          <h2 className="text-3xl font-bold md:text-4xl">{content.caseStudy.heading}</h2>
          <p className="text-lg text-emerald-100">{content.caseStudy.description}</p>
          <div className="rounded-xl border border-emerald-700/70 bg-emerald-900/60 p-5 text-sm text-emerald-100">
            {content.caseStudy.note}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {content.caseStudy.stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-emerald-700/80 bg-emerald-900/60 p-5 text-center shadow-lg"
            >
              <p className="text-3xl font-extrabold text-amber-200">{stat.value}</p>
              <p className="mt-2 text-sm text-emerald-100">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {[
          { label: "Validación industrial", value: "Holanda / Chile" },
          { label: "Rotación y calibre", value: "Control en tiempo real" },
          { label: "Autonomía", value: "Cero nube" },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-2xl border border-emerald-800 bg-emerald-900/50 px-4 py-3 text-sm text-emerald-50"
          >
            <span>{item.label}</span>
            <TrendingUp className="text-amber-300" size={18} />
            <span className="font-semibold text-amber-200">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const Contact: React.FC<SectionProps> = ({ id }) => (
  <section id={id} className="bg-emerald-50 py-20">
    <div className="mx-auto max-w-6xl px-6">
      <div className="rounded-3xl border border-emerald-200 bg-white p-10 shadow-lg lg:p-14">
        <div className="grid gap-8 lg:grid-cols-[2fr,1fr] lg:items-center">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-700">
              Siguiente paso
            </p>
            <h2 className="text-3xl font-bold text-emerald-950 md:text-4xl">
              {content.closing.heading}
            </h2>
            <p className="text-lg text-emerald-800">
              {content.hero.description}
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="mailto:contacto@qualiblick.com"
                className="flex items-center gap-2 rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-emerald-950 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                {content.closing.cta}
              </a>
              <a
                href={`tel:${content.brand.phone.replace(/\s/g, "")}`}
                className="flex items-center gap-2 rounded-full border border-emerald-200 px-5 py-3 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50"
              >
                <Phone size={18} /> {content.brand.phone}
              </a>
            </div>
          </div>
          <div className="space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-6 text-emerald-900">
            <div className="flex items-center gap-3">
              <Sparkles className="text-emerald-600" size={20} />
              <div>
                <p className="text-sm font-semibold">Correo</p>
                <a
                  href={`mailto:${content.brand.email}`}
                  className="text-base font-medium text-emerald-950"
                >
                  {content.brand.email}
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Signal className="text-emerald-600" size={20} />
              <div>
                <p className="text-sm font-semibold">Ubicación</p>
                <p className="text-base font-medium text-emerald-950">Santiago, Chile</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const Footer: React.FC = () => (
  <footer className="border-t border-emerald-900/20 bg-emerald-950 py-10 text-emerald-100">
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 md:flex-row md:items-start md:justify-between">
      <div className="space-y-3">
        <Logo />
        <p className="max-w-xl text-sm text-emerald-200">{content.footer.legal}</p>
        <p className="text-xs text-emerald-400">© 2025 {content.brand.name} Inc.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-6">
        {content.footer.links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="text-sm font-semibold text-emerald-100 transition hover:text-amber-200"
          >
            {link.label}
          </a>
        ))}
        <a
          href={`mailto:${content.brand.email}`}
          className="text-sm font-semibold text-emerald-100 transition hover:text-amber-200"
        >
          contacto@qualiblick.com
        </a>
      </div>
    </div>
  </footer>
);

const HomePage: React.FC = () => (
  <div className="bg-white font-sans text-emerald-950">
    <Navbar />
    <main>
      <Hero id="home" />
      <Friction id="problema" />
      <Capabilities id="tecnologia" />
      <CaseStudy id="caso" />
      <Contact id="contacto" />
    </main>
    <Footer />
  </div>
);

export default HomePage;
