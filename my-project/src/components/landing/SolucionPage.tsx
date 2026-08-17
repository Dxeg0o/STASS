"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Camera,
  Clock3,
  Cpu,
  Hash,
  Locate,
  Palette,
  Plus,
  Ruler,
  Smartphone,
  Sprout,
  Wrench,
  Zap,
} from "lucide-react";
import { Reveal, SectionLabel } from "./shared";
import LandingNav from "./LandingNav";
import LandingFooter from "./LandingFooter";
import { demoHref } from "./cta";

const capabilities = [
  { icon: Hash, title: "Conteo", text: "Cantidad de producto observado durante la operación." },
  { icon: Ruler, title: "Calibre", text: "Tamaños y distribución de tamaños." },
  { icon: Palette, title: "Color", text: "Medición consistente de características visuales." },
  { icon: AlertTriangle, title: "Defectos", text: "Clasificación según criterios definidos con tu equipo." },
  { icon: BarChart3, title: "Distribución", text: "Composición del lote entre diferentes categorías." },
  { icon: Locate, title: "Densidad y posición", text: "Cantidad y ubicación cuando el proceso lo requiere." },
];

const captureModes = [
  { icon: Camera, text: "Cámaras fijas" },
  { icon: Wrench, text: "Retrofit sobre maquinaria" },
  { icon: Smartphone, text: "Dispositivos móviles" },
  { icon: Sprout, text: "Equipos en terreno" },
  { icon: Plus, text: "Otras fuentes de información" },
];

const process = [
  { number: "01", title: "Entendemos", text: "Qué necesitas medir y qué decisión depende de ese dato." },
  { number: "02", title: "Configuramos", text: "Variables, captura y hardware." },
  { number: "03", title: "Instalamos", text: "Integramos Qualiblick a tu proceso existente." },
  { number: "04", title: "Medimos", text: "Convertimos las observaciones en información estructurada y utilizable." },
];

const techCards = [
  { icon: Cpu, title: "Procesamiento local", text: "El análisis puede realizarse directamente en terreno o planta." },
  { icon: Clock3, title: "Resultados en el momento", text: "La información está disponible mientras el proceso ocurre." },
  { icon: Zap, title: "Conectividad limitada", text: "La medición puede continuar aunque internet sea inestable." },
];

export default function SolucionPage() {
  return (
    <main className="commercial-landing">
      <LandingNav currentPath="/solucion" />

      <section className="page-hero">
        <div className="hero-grid-bg" aria-hidden="true" />
        <div className="landing-container">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="page-hero-copy"
          >
            <SectionLabel>Medición para la agroindustria</SectionLabel>
            <h1>Convierte tus muestreos en <span>sistemas de medición.</span></h1>
            <p className="hero-lead">
              Qualiblick es una plataforma configurable que permite aumentar la cobertura, consistencia y oportunidad de mediciones que hoy se realizan manualmente o sobre muestras pequeñas.
            </p>
            <p className="hero-lead">
              Definimos qué necesitas medir, cómo capturarlo y dónde integrarlo según tu operación.
            </p>
            <div className="hero-actions">
              <a href={demoHref} className="button button-primary">
                Agenda una evaluación <ArrowRight aria-hidden="true" />
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="platform-section section-space">
        <div className="landing-container split-heading">
          <Reveal>
            <SectionLabel>La plataforma</SectionLabel>
            <h2>Una plataforma que se configura según lo que necesitas medir.</h2>
          </Reveal>
          <Reveal delay={0.1} className="split-heading-copy">
            <p>Qualiblick no parte de una máquina o una única variable. Parte de una pregunta: ¿qué necesitas medir para tomar una mejor decisión?</p>
            <p>A partir de eso configuramos la captura, el hardware, los modelos y el software necesarios.</p>
          </Reveal>
        </div>
      </section>

      <section id="variables" className="capability-section section-space">
        <div className="landing-container centered-heading">
          <Reveal>
            <SectionLabel>Qué puede medir</SectionLabel>
            <h2>Distintas variables. Una misma plataforma.</h2>
          </Reveal>
        </div>

        <div className="landing-container capability-grid">
          {capabilities.map(({ icon: Icon, title, text }, index) => (
            <Reveal key={title} delay={index * 0.06} className="capability-card">
              <span className="capability-icon"><Icon aria-hidden="true" /></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </Reveal>
          ))}
          <Reveal delay={0.36} className="capability-card capability-card-open">
            <span className="capability-icon"><Plus aria-hidden="true" /></span>
            <h3>¿Otra variable?</h3>
            <p>Evaluamos si puede incorporarse a Qualiblick.</p>
            <a href={demoHref} className="capability-open-cta">Conversemos <ArrowRight aria-hidden="true" /></a>
          </Reveal>
        </div>
      </section>

      <section className="differentiation-section section-space">
        <div className="landing-container differentiation-grid">
          <Reveal className="differentiation-copy">
            <SectionLabel>Formas de captura</SectionLabel>
            <h2>Nos adaptamos a tu operación. No al revés.</h2>
            <p>La captura puede realizarse de distintas maneras según el punto de medición y las condiciones del proceso. Todo forma parte de la misma plataforma.</p>
          </Reveal>

          <Reveal delay={0.12} className="capture-list">
            {captureModes.map(({ icon: Icon, text }) => (
              <div key={text}>
                <Icon aria-hidden="true" />
                <span>{text}</span>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section id="como-funciona" className="methods-section section-space">
        <div className="landing-container centered-heading">
          <Reveal>
            <SectionLabel>Cómo funciona</SectionLabel>
            <h2>De una decisión concreta a una medición en operación.</h2>
          </Reveal>
        </div>

        <div className="landing-container process-grid">
          {process.map(({ number, title, text }, index) => (
            <Reveal key={number} delay={index * 0.06} className="process-card">
              <span className="method-number">{number}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="edge-section section-space">
        <div className="landing-container centered-heading">
          <Reveal>
            <SectionLabel>Tecnología</SectionLabel>
            <h2>Diseñada para operar donde ocurre la medición.</h2>
          </Reveal>
        </div>

        <div className="landing-container tech-grid">
          {techCards.map(({ icon: Icon, title, text }, index) => (
            <Reveal key={title} delay={index * 0.06} className="tech-card">
              <Icon aria-hidden="true" />
              <h3>{title}</h3>
              <p>{text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="cta-section">
        <div className="landing-container cta-card">
          <div className="cta-grid" aria-hidden="true" />
          <Reveal className="cta-content">
            <h2>Una plataforma. Más puntos de medición.</h2>
            <p>Qualiblick puede comenzar resolviendo una medición específica y luego extenderse hacia otros procesos de la misma operación.</p>
            <Link href="/aplicaciones" className="button button-primary button-large">
              Ver aplicaciones <ArrowRight aria-hidden="true" />
            </Link>
          </Reveal>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}
