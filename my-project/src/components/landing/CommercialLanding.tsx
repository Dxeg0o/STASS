"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Camera,
  Check,
  ChevronRight,
  Clock3,
  Layers,
  Mail,
  ScanLine,
  Smartphone,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import { Reveal, SectionLabel } from "./shared";
import LandingNav from "./LandingNav";
import LandingFooter from "./LandingFooter";
import { contactEmail, demoHref } from "./cta";
import { aplicaciones, metrics } from "../../data/aplicaciones";

const heroPoints = [
  { icon: Layers, text: "Mayor cobertura" },
  { icon: Check, text: "Un mismo criterio" },
  { icon: Clock3, text: "Datos a tiempo" },
];

const captureModes = [
  { icon: Camera, label: "Cámara fija", active: true },
  { icon: Wrench, label: "Retrofit", active: false },
  { icon: Smartphone, label: "Móvil", active: false },
];

const heroVariables = ["Conteo", "Calibre", "Color", "Defectos"];

const reasons = [
  {
    number: "01",
    icon: Layers,
    title: "Mayor cobertura",
    text: "Aumenta significativamente la cantidad de producto observado sin aumentar proporcionalmente el trabajo de muestreo.",
  },
  {
    number: "02",
    icon: Check,
    title: "Mayor consistencia",
    text: "El mismo criterio en cada turno, cada punto de medición y cada temporada.",
  },
  {
    number: "03",
    icon: BarChart3,
    title: "Información estructurada",
    text: "Resultados organizados y comparables, listos para usarse en tus decisiones.",
  },
];

export default function CommercialLanding() {
  return (
    <main className="commercial-landing">
      <LandingNav />

      <section id="inicio" className="hero-section">
        <div className="hero-grid-bg" aria-hidden="true" />
        <div className="landing-container hero-grid">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="hero-copy"
          >
            <SectionLabel>Medición inteligente para la agroindustria</SectionLabel>
            <h1>Mide más de tu operación. <span>Decide con mejores datos.</span></h1>
            <p className="hero-lead">
              Qualiblick transforma muestreos manuales y poco representativos en sistemas de medición consistentes y automatizados. Configuramos qué medir, cómo capturarlo y dónde instalarlo según las necesidades de tu operación.
            </p>

            <div className="hero-actions">
              <a href={demoHref} className="button button-primary">
                Agenda una evaluación <ArrowRight aria-hidden="true" />
              </a>
              <Link href="/solucion" className="button button-secondary">
                Conoce la solución <ChevronRight aria-hidden="true" />
              </Link>
            </div>

            <div className="outcome-list" aria-label="Qué cambia con Qualiblick">
              {heroPoints.map(({ icon: Icon, text }) => (
                <div className="outcome-item" key={text}>
                  <span><Icon aria-hidden="true" /></span>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="hero-visual"
          >
            <div className="video-frame">
              <video autoPlay loop muted playsInline poster="/images/valdivia_lilies.jpg" aria-label="Qualiblick midiendo producto dentro de una operación agroindustrial">
                <source src="/videos/example2.mp4" type="video/mp4" />
              </video>
              <div className="video-vignette" />
              <div className="scan-line" aria-hidden="true" />

              <div className="live-badge"><span /> MIDIENDO</div>

              <div className="capture-chips" aria-label="Formas de captura disponibles">
                {captureModes.map(({ icon: Icon, label, active }) => (
                  <span key={label} className={`capture-chip${active ? " capture-chip-active" : ""}`}>
                    <Icon aria-hidden="true" /> {label}
                  </span>
                ))}
              </div>

              <div className="variables-panel">
                <div className="panel-header">
                  <div><ScanLine aria-hidden="true" /> Variables configuradas</div>
                  <span>RECEPCIÓN</span>
                </div>
                <div className="variables-grid">
                  {heroVariables.map((variable) => (
                    <span key={variable}><Check aria-hidden="true" /> {variable}</span>
                  ))}
                </div>
                <div className="panel-footer">
                  <span><Check aria-hidden="true" /> Resultado estructurado</span>
                  <strong>1.284 unidades medidas</strong>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="blindspot-section section-space">
        <div className="landing-container split-heading">
          <Reveal>
            <SectionLabel>El punto de partida</SectionLabel>
            <h2>Decisiones grandes todavía dependen de muestras muy pequeñas.</h2>
          </Reveal>
          <Reveal delay={0.1} className="split-heading-copy">
            <p>Miles o millones de unidades pueden terminar representadas por una muestra de apenas una fracción del total. Ese resultado se usa después para vender, planificar, negociar y ajustar el proceso, sin saber con certeza qué tan representativa es del total.</p>
          </Reveal>
        </div>

        <div className="landing-container comparison-grid">
          <Reveal className="comparison-card comparison-old">
            <span className="comparison-kicker">Muestreo tradicional</span>
            <h3>Una parte mínima intenta representar la operación completa.</h3>
            <ul>
              <li><X aria-hidden="true" /> Muestra pequeña</li>
              <li><X aria-hidden="true" /> Medición manual</li>
              <li><X aria-hidden="true" /> Estimación y criterios que varían</li>
            </ul>
            <div className="sample-visual sample-small">
              {[...Array(35)].map((_, index) => <i key={index} className={index < 4 ? "active" : ""} />)}
            </div>
            <p className="sample-caption"><strong>Muestra limitada</strong><span>Menor representatividad</span></p>
          </Reveal>

          <Reveal delay={0.12} className="comparison-card comparison-new">
            <span className="comparison-kicker">Con Qualiblick</span>
            <h3>La medición cubre una parte mucho mayor de lo que realmente pasa.</h3>
            <ul>
              <li><Check aria-hidden="true" /> Mayor cobertura</li>
              <li><Check aria-hidden="true" /> Medición automatizada</li>
              <li><Check aria-hidden="true" /> Datos consistentes y estructurados</li>
            </ul>
            <div className="sample-visual sample-large">
              {[...Array(35)].map((_, index) => <i key={index} className={index < 30 ? "active" : ""} />)}
            </div>
            <p className="sample-caption"><strong>Mayor cobertura</strong><span>Más información para decidir</span></p>
          </Reveal>
        </div>

        <div className="landing-container">
          <Reveal className="section-closing-note">
            <p>No siempre necesitas medir todo. Pero sí necesitas que lo que mides represente mejor lo que está ocurriendo.</p>
          </Reveal>
        </div>
      </section>

      <section className="impact-section section-space">
        <div className="landing-container">
          <div className="impact-heading">
            <Reveal>
              <SectionLabel>Por qué Qualiblick</SectionLabel>
              <h2>Mejores datos <span>sin multiplicar soluciones.</span></h2>
            </Reveal>
          </div>

          <div className="impact-grid impact-grid-compact">
            {reasons.map(({ number, icon: Icon, title, text }, index) => (
              <Reveal key={title} delay={index * 0.06} className="impact-card">
                <div className="impact-card-top"><span>{number}</span><Icon aria-hidden="true" /></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.2} className="impact-footer-link">
            <Link href="/solucion">Conoce cómo funciona la plataforma <ArrowRight aria-hidden="true" /></Link>
          </Reveal>
        </div>
      </section>

      <section className="solutions-section section-space">
        <div className="landing-container centered-heading">
          <Reveal>
            <SectionLabel>Aplicaciones</SectionLabel>
            <h2>Una plataforma que se adapta a tu operación.</h2>
            <p>El punto de instalación cambia. Qualiblick sigue siendo el mismo.</p>
          </Reveal>
        </div>

        <div className="landing-container solutions-grid">
          {aplicaciones.map(({ slug, contexto, icon: Icon, cardHeadline }, index) => (
            <Reveal key={slug} delay={index * 0.06} className="solution-card">
              <Link href={`/aplicaciones/${slug}`} className="solution-card-link">
                <span className="solution-card-tag"><Icon aria-hidden="true" /> {contexto}</span>
                <p>{cardHeadline}</p>
                <span className="solution-card-cta">Ver aplicación <ArrowRight aria-hidden="true" /></span>
              </Link>
            </Reveal>
          ))}
        </div>

        <div className="landing-container">
          <Reveal className="capture-note">
            <Camera aria-hidden="true" />
            <p>Distintas formas de captura según el proceso: equipos fijos, retrofit sobre maquinaria existente o dispositivos móviles.</p>
          </Reveal>
        </div>
      </section>

      <section className="validation-section section-space">
        <div className="landing-container split-heading">
          <Reveal>
            <SectionLabel>Resultados</SectionLabel>
            <h2>Probado en operación real.</h2>
          </Reveal>
          <Reveal delay={0.1} className="split-heading-copy">
            <p>Qualiblick ya opera en procesos agroindustriales donde existen movimiento, superposición, suciedad, productos irregulares y altos flujos.</p>
            <Link href="/resultados" className="inline-link">Ver resultados y validación <ArrowRight aria-hidden="true" /></Link>
          </Reveal>
        </div>

        <div className="landing-container">
          <Reveal className="metrics-row metrics-row-light">
            {metrics.map(({ value, label }) => (
              <div key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </Reveal>
        </div>

        <div className="landing-container evidence-backers-row" aria-label="Organizaciones que respaldan a Qualiblick">
          <span className="backers-label">Respaldado por</span>
          <div className="backer-logos">
            <div className="backer-logo backer-logo-cgv">
              <Image src="/images/chile-global-ventures.png" alt="Chile Global Ventures" width={582} height={138} />
            </div>
            <div className="backer-logo backer-logo-corfo">
              <Image src="/images/corfo.png" alt="CORFO" width={740} height={216} />
            </div>
          </div>
        </div>
      </section>

      <section id="contacto" className="cta-section">
        <div className="landing-container cta-card">
          <div className="cta-grid" aria-hidden="true" />
          <Reveal className="cta-content">
            <div className="cta-icon"><Sparkles aria-hidden="true" /></div>
            <h2>¿Qué estás midiendo hoy con una muestra?</h2>
            <p>Cuéntanos qué necesitas medir, cómo lo haces actualmente y qué decisión depende de ese resultado. Evaluaremos dónde tiene sentido aumentar la cobertura, estandarizar la medición y convertir ese proceso en información accionable.</p>
            <a href={demoHref} className="button button-primary button-large">
              Agenda una evaluación <ArrowRight aria-hidden="true" />
            </a>
            <span className="cta-contact"><Mail aria-hidden="true" /> {contactEmail}</span>
          </Reveal>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}
