"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Layers,
  Linkedin,
  Mail,
  ScanLine,
  Target,
  UsersRound,
} from "lucide-react";
import { Reveal, SectionLabel } from "./shared";
import LandingNav from "./LandingNav";
import LandingFooter from "./LandingFooter";
import { buildDemoHref, contactEmail } from "./cta";

const demoHref = buildDemoHref();

const principles = [
  {
    icon: Target,
    number: "01",
    title: "Partimos de la decisión",
    text: "Antes de hablar de equipos, entendemos qué decisión quiere mejorar el cliente y qué información necesita para tomarla.",
  },
  {
    icon: Layers,
    number: "02",
    title: "Configurable, no a medida",
    text: "Construimos una plataforma que se adapta a distintos puntos, variables y formas de captura, en lugar de un desarrollo nuevo por cliente.",
  },
  {
    icon: ScanLine,
    number: "03",
    title: "Tecnología en la operación real",
    text: "Diseñamos para el ritmo del campo y de la planta: la medición tiene que funcionar sin detener el proceso.",
  },
];

const founders = [
  { name: "Diego Soler", image: "/images/founders/diego-soler.png", linkedin: "https://www.linkedin.com/in/diego-soler-olguin/" },
  { name: "Cristobal Segu", image: "/images/founders/cristobal-segu.png", linkedin: "https://www.linkedin.com/in/crist%C3%B3bal-seg%C3%BA-074606229/" },
];

export default function AboutUs() {
  return (
    <main className="commercial-landing about-page">
      <LandingNav currentPath="/sobre-nosotros" demoHref={demoHref} />

      <section className="about-hero">
        <div className="hero-grid-bg" aria-hidden="true" />
        <div className="landing-container about-hero-inner">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="about-hero-copy">
            <Link href="/" className="solution-back-link"><ArrowLeft aria-hidden="true" /> Volver al inicio</Link>
            <SectionLabel>Sobre Qualiblick</SectionLabel>
            <h1>Construimos la infraestructura de medición de <span>la agroindustria.</span></h1>
            <p>Qualiblick nace para que las decisiones de una operación agrícola dejen de depender de muestras pequeñas y criterios que varían entre personas. Convertimos esos muestreos en sistemas de medición consistentes y representativos.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.15 }} className="about-signal-card" aria-label="Propósito de Qualiblick">
            <div className="about-signal-grid" aria-hidden="true" />
            <span className="about-signal-icon"><ScanLine aria-hidden="true" /></span>
            <span className="about-signal-kicker">NUESTRO PROPÓSITO</span>
            <strong>Que cada decisión agrícola pueda apoyarse en una medición y no en una estimación.</strong>
            <p>Más cobertura, un mismo criterio y datos estructurados para decidir.</p>
          </motion.div>
        </div>
      </section>

      <section className="about-story-section section-space">
        <div className="landing-container about-story-grid">
          <Reveal>
            <SectionLabel>Por qué existimos</SectionLabel>
            <h2>Decisiones grandes todavía dependen de muestras muy pequeñas.</h2>
          </Reveal>
          <Reveal delay={0.1} className="about-story-copy">
            <p>En la agroindustria, miles o millones de unidades terminan representadas por una muestra revisada a mano. Ese resultado define ventas, programas de empaque y acuerdos completos, aunque nadie sepa cuánto se parece al total.</p>
            <p>Qualiblick une conocimiento agrícola, inteligencia artificial y software para medir con mayor cobertura y un criterio único, y para dejar esa información estructurada donde se toman las decisiones.</p>
            <div className="about-story-points">
              <span><Check aria-hidden="true" /> Mediciones consistentes</span>
              <span><Check aria-hidden="true" /> Resultados oportunos</span>
              <span><Check aria-hidden="true" /> Datos comparables</span>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="about-principles-section section-space">
        <div className="landing-container">
          <div className="centered-heading">
            <Reveal>
              <SectionLabel>Cómo construimos</SectionLabel>
              <h2>Nos adaptamos al muestreo. No al revés.</h2>
              <p>Estos principios orientan cómo llevamos la plataforma desde una decisión concreta hasta una medición en operación.</p>
            </Reveal>
          </div>
          <div className="about-principles-grid">
            {principles.map(({ icon: Icon, number, title, text }, index) => (
              <Reveal key={number} delay={index * 0.08} className="about-principle-card">
                <div><span>{number}</span><Icon aria-hidden="true" /></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="about-founders-section section-space">
        <div className="landing-container about-founders-grid">
          <Reveal className="about-founders-heading">
            <SectionLabel>Equipo fundador</SectionLabel>
            <h2>Construimos cerca de quienes hacen que la agricultura avance.</h2>
            <p>Somos un equipo comprometido con entregar tecnología útil para las decisiones complejas de la cadena agrícola.</p>
          </Reveal>
          <div className="founder-list">
            {founders.map(({ name, image, linkedin }, index) => (
              <Reveal key={name} delay={0.12 + index * 0.08} className="founder-card">
                <a href={linkedin} target="_blank" rel="noreferrer" className="founder-linkedin" aria-label={`Ver el perfil de LinkedIn de ${name}`}>
                  <Linkedin aria-hidden="true" />
                </a>
                <Image src={image} alt={`Retrato de ${name}`} width={800} height={800} className="founder-photo" />
                <span>CO-FUNDADOR {String(index + 1).padStart(2, "0")}</span>
                <h3>{name}</h3>
                <p>Fundador de Qualiblick</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-section about-cta-section">
        <div className="landing-container cta-card">
          <div className="cta-grid" aria-hidden="true" />
          <Reveal className="cta-content">
            <div className="cta-icon"><UsersRound aria-hidden="true" /></div>
            <h2>¿Qué estás midiendo hoy con una muestra?</h2>
            <p>Cuéntanos qué necesitas medir y qué decisión depende de ese resultado.</p>
            <a href={demoHref} className="button button-primary button-large">Agenda una evaluación <ArrowRight aria-hidden="true" /></a>
            <span className="cta-contact"><Mail aria-hidden="true" /> {contactEmail}</span>
          </Reveal>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}
