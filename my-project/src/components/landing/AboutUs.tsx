"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Leaf,
  Linkedin,
  Mail,
  MapPin,
  Menu,
  ScanLine,
  Target,
  UsersRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { Reveal, SectionLabel } from "./shared";

const demoHref =
  "mailto:contacto@qualiblick.com?subject=Conversemos%20con%20Qualiblick&body=Hola%20equipo%20Qualiblick%2C%0A%0AMe%20gustar%C3%ADa%20conocer%20m%C3%A1s%20sobre%20su%20tecnolog%C3%ADa.";

const principles = [
  {
    icon: Target,
    number: "01",
    title: "Datos que llevan a la acción",
    text: "Diseñamos información clara y oportuna para que cada decisión comercial tenga una base objetiva.",
  },
  {
    icon: ScanLine,
    number: "02",
    title: "Tecnología en la operación real",
    text: "Construimos para el ritmo de la cosecha, la planta y el campo: donde la precisión debe funcionar sin detener el proceso.",
  },
  {
    icon: Leaf,
    number: "03",
    title: "Más valor, menos desperdicio",
    text: "Creemos que conocer mejor cada lote permite aprovechar mejor la producción y reducir pérdidas evitables.",
  },
];

const founders = [
  { name: "Diego Soler", linkedin: "https://www.linkedin.com/in/diego-soler-olguin/" },
  { name: "Cristobal Segu", linkedin: "https://www.linkedin.com/in/crist%C3%B3bal-seg%C3%BA-074606229/" },
];

export default function AboutUs() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <main className="commercial-landing about-page">
      <nav className="landing-nav" aria-label="Navegación principal">
        <div className="landing-container nav-inner">
          <Link href="/" className="brand-link" aria-label="Qualiblick, volver al inicio">
            <Image src="/images/qb.png" alt="Qualiblick" width={176} height={40} priority className="brand-logo" />
          </Link>

          <div className="nav-links">
            <Link href="/#soluciones">Soluciones</Link>
            <Link href="/#impacto">Impacto</Link>
            <Link href="/sobre-nosotros" aria-current="page">Sobre nosotros</Link>
          </div>

          <div className="nav-actions">
            <Link href="/login" className="nav-login">Ingresar</Link>
            <a href={demoHref} className="button button-small button-primary">Solicita una demo</a>
          </div>

          <button type="button" className="mobile-menu-button" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-controls="mobile-navigation" aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}>
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>

        {menuOpen && (
          <div id="mobile-navigation" className="mobile-navigation">
            <Link href="/#soluciones" onClick={closeMenu}>Soluciones</Link>
            <Link href="/#impacto" onClick={closeMenu}>Impacto</Link>
            <Link href="/sobre-nosotros" onClick={closeMenu}>Sobre nosotros</Link>
            <Link href="/login" onClick={closeMenu}>Ingresar</Link>
            <a href={demoHref} className="button button-primary" onClick={closeMenu}>Solicita una demo</a>
          </div>
        )}
      </nav>

      <section className="about-hero">
        <div className="hero-grid-bg" aria-hidden="true" />
        <div className="landing-container about-hero-inner">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="about-hero-copy">
            <Link href="/" className="solution-back-link"><ArrowLeft aria-hidden="true" /> Volver al inicio</Link>
            <SectionLabel>Sobre Qualiblick</SectionLabel>
            <h1>Hacemos visible el valor que ya existe en <span>cada lote.</span></h1>
            <p>Qualiblick nace para acercar datos de calidad confiables a las decisiones que definen el resultado de una operación agrícola. Transformamos visión por computador en información útil, justo cuando aún puede cambiar el destino de la producción.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.15 }} className="about-signal-card" aria-label="Propósito de Qualiblick">
            <div className="about-signal-grid" aria-hidden="true" />
            <span className="about-signal-icon"><ScanLine aria-hidden="true" /></span>
            <span className="about-signal-kicker">NUESTRO PROPÓSITO</span>
            <strong>Que cada decisión agrícola pueda apoyarse en evidencia.</strong>
            <p>Más visibilidad para vender, procesar y planificar con mayor certeza.</p>
          </motion.div>
        </div>
      </section>

      <section className="about-story-section section-space">
        <div className="landing-container about-story-grid">
          <Reveal>
            <SectionLabel>Por qué existimos</SectionLabel>
            <h2>Cuando el dato llega tarde, una buena decisión ya no alcanza.</h2>
          </Reveal>
          <Reveal delay={0.1} className="about-story-copy">
            <p>En la poscosecha, una estimación puede definir una venta, un programa de empaque o el destino de una partida completa. Sin una lectura representativa y oportuna, el valor de la producción queda sujeto a supuestos.</p>
            <p>Qualiblick une conocimiento agrícola y visión por computador para medir con consistencia, dar visibilidad a cada lote y convertir esa información en una ventaja concreta para quienes producen.</p>
            <div className="about-story-points">
              <span><Check aria-hidden="true" /> Información objetiva</span>
              <span><Check aria-hidden="true" /> Resultados oportunos</span>
              <span><Check aria-hidden="true" /> Decisiones trazables</span>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="about-principles-section section-space">
        <div className="landing-container">
          <div className="centered-heading">
            <Reveal>
              <SectionLabel>Cómo construimos</SectionLabel>
              <h2>La calidad es medible. El impacto, también.</h2>
              <p>Estos principios orientan cómo llevamos la tecnología desde el problema real hasta la decisión diaria.</p>
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
            {founders.map(({ name, linkedin }, index) => (
              <Reveal key={name} delay={0.12 + index * 0.08} className="founder-card">
                <a href={linkedin} target="_blank" rel="noreferrer" className="founder-linkedin" aria-label={`Ver el perfil de LinkedIn de ${name}`}>
                  <Linkedin aria-hidden="true" />
                </a>
                <div className="founder-monogram">{name.split(" ").map((part) => part[0]).join("")}</div>
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
            <h2>¿Quieres medir mejor lo que tu operación ya produce?</h2>
            <p>Conversemos sobre cómo Qualiblick puede aportar visibilidad a tus decisiones.</p>
            <a href={demoHref} className="button button-primary button-large">Conversemos <ArrowRight aria-hidden="true" /></a>
            <span className="cta-contact"><Mail aria-hidden="true" /> contacto@qualiblick.com</span>
          </Reveal>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-container footer-grid">
          <div><Image src="/images/qb.png" alt="Qualiblick" width={170} height={40} className="footer-logo" /><p>Datos reales para capturar más valor en cada etapa de la poscosecha.</p></div>
          <div className="footer-links"><Link href="/#soluciones">Soluciones</Link><Link href="/#impacto">Impacto</Link><Link href="/sobre-nosotros">Sobre nosotros</Link></div>
          <div className="footer-contact"><a href="mailto:contacto@qualiblick.com"><Mail aria-hidden="true" /> contacto@qualiblick.com</a><span><MapPin aria-hidden="true" /> Santiago, Chile</span></div>
        </div>
        <div className="landing-container footer-bottom"><span>© 2026 Qualiblick. Todos los derechos reservados.</span><Link href="/login">Acceso a plataforma</Link></div>
      </footer>
    </main>
  );
}
