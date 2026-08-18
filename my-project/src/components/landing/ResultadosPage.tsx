"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Mail, MapPin } from "lucide-react";
import { Reveal, SectionLabel } from "./shared";
import LandingNav from "./LandingNav";
import LandingFooter from "./LandingFooter";
import CountUp from "./CountUp";
import { contactEmail, demoHref } from "./cta";
import { metrics } from "../../data/aplicaciones";

export default function ResultadosPage() {
  return (
    <main className="commercial-landing">
      <LandingNav currentPath="/resultados" />

      <section className="page-hero">
        <div className="hero-grid-bg" aria-hidden="true" />
        <div className="landing-container">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="page-hero-copy"
          >
            <SectionLabel>Resultados</SectionLabel>
            <h1>Tecnología probada en <span>operación real.</span></h1>
            <p className="hero-lead">
              Qualiblick ya opera en procesos agroindustriales donde existen movimiento, superposición, suciedad, productos irregulares y altos flujos.
            </p>
          </motion.div>

          <Reveal delay={0.15} className="metrics-row">
            {metrics.map(({ value, label }) => (
              <div key={label}>
                <strong><CountUp value={value} /></strong>
                <span>{label}</span>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="validation-section section-space">
        <div className="landing-container validation-grid">
          <Reveal className="validation-image">
            <Image src="/images/valdivia_lilies.jpg" alt="Planta de Valdivia Lilies, donde Qualiblick opera integrado al proceso" fill sizes="(max-width: 900px) 100vw, 50vw" />
            <div className="validation-image-overlay" />
            <div className="case-label"><MapPin aria-hidden="true" /> Valdivia, Chile</div>
            <div className="case-result"><strong>97,54%</strong><span>Precisión en conteo</span></div>
          </Reveal>

          <Reveal delay={0.1} className="validation-copy">
            <SectionLabel>Valdivia Lilies</SectionLabel>
            <h2>Medición automatizada en condiciones productivas reales.</h2>
            <p>Qualiblick fue integrado directamente al proceso para medir productos irregulares en movimiento y convertir el flujo productivo en información estructurada.</p>
            <blockquote>“No buscamos reemplazar una muestra manual por una muestra digital. Buscamos aumentar la cobertura y consistencia de la información disponible para decidir.”</blockquote>
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
            <h2>¿Qué estás midiendo hoy con una muestra?</h2>
            <p>Cuéntanos qué necesitas medir, cómo lo haces actualmente y qué decisión depende de ese resultado.</p>
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
