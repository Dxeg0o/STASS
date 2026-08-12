"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  CircleGauge,
  Clock3,
  Cpu,
  Mail,
  MapPin,
  Menu,
  PackageCheck,
  ScanLine,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { soluciones } from "../../data/soluciones";
import { Reveal, SectionLabel } from "./shared";

const demoHref =
  "mailto:contacto@qualiblick.com?subject=Agenda%20una%20evaluaci%C3%B3n%20de%20operaci%C3%B3n&body=Hola%20equipo%20Qualiblick%2C%0A%0AMe%20gustar%C3%ADa%20identificar%20qu%C3%A9%20medir%20primero%20en%20nuestra%20operaci%C3%B3n.%0A%0AEmpresa%3A%0ACultivo%3A%0AVolumen%20aproximado%3A%0ATipo%20de%20operaci%C3%B3n%20%28bins%2C%20l%C3%ADnea%20o%20terreno%29%3A%0A%0AGracias.";

const outcomes = [
  { icon: TrendingUp, text: "Vende conociendo el lote real" },
  { icon: PackageCheck, text: "Envía cada lote al destino correcto" },
  { icon: ShieldCheck, text: "Reduce reprocesos y reclamos" },
];

const impact = [
  {
    number: "01",
    icon: TrendingUp,
    title: "Decide antes de perder valor",
    text: "Conoce calibre, color y calidad cuando todavía puedes vender, guardar, procesar o corregir.",
  },
  {
    number: "02",
    icon: BarChart3,
    title: "Todos negocian sobre el mismo dato",
    text: "Planta, ventas, productor y comprador parten de una lectura objetiva del lote, no de supuestos distintos.",
  },
  {
    number: "03",
    icon: PackageCheck,
    title: "Evita costos que se pueden anticipar",
    text: "Detecta desviaciones antes de que se conviertan en reproceso, reempaque, descuento o reclamo.",
  },
];

export default function CommercialLanding() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <main className="commercial-landing">
      <nav className="landing-nav" aria-label="Navegación principal">
        <div className="landing-container nav-inner">
          <Link href="#inicio" className="brand-link" aria-label="Qualiblick, volver al inicio">
            <Image src="/images/qb.png" alt="Qualiblick" width={176} height={40} priority className="brand-logo" />
          </Link>

          <div className="nav-links">
            <Link href="#soluciones">Soluciones</Link>
            <Link href="#impacto">Impacto</Link>
            <Link href="#validacion">Resultados</Link>
            <Link href="/sobre-nosotros">Sobre nosotros</Link>
          </div>

          <div className="nav-actions">
            <Link href="/login" className="nav-login">Ingresar</Link>
            <a href={demoHref} className="button button-small button-primary">Agenda una evaluación</a>
          </div>

          <button
            type="button"
            className="mobile-menu-button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          >
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>

        {menuOpen && (
          <div id="mobile-navigation" className="mobile-navigation">
            <Link href="#soluciones" onClick={closeMenu}>Soluciones</Link>
            <Link href="#impacto" onClick={closeMenu}>Impacto</Link>
            <Link href="#validacion" onClick={closeMenu}>Resultados</Link>
            <Link href="/sobre-nosotros" onClick={closeMenu}>Sobre nosotros</Link>
            <Link href="/login" onClick={closeMenu}>Ingresar</Link>
            <a href={demoHref} className="button button-primary" onClick={closeMenu}>Agenda una evaluación</a>
          </div>
        )}
      </nav>

      <section id="inicio" className="hero-section">
        <div className="hero-grid-bg" aria-hidden="true" />
        <div className="landing-container hero-grid">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="hero-copy"
          >
            <SectionLabel>Para packings y exportadoras agrícolas</SectionLabel>
            <h1>Conoce la calidad real de cada lote <span>antes de decidir su destino.</span></h1>
            <p className="hero-lead">
              Qualiblick es una solución integrada de equipo, software y servicio que mide calibre, color y defectos en recepción, línea o terreno. Así puedes vender, procesar, guardar o corregir a tiempo, antes de que el resultado ya esté definido.
            </p>

            <div className="hero-actions">
              <a href={demoHref} className="button button-primary">
                Agenda una evaluación <ArrowRight aria-hidden="true" />
              </a>
              <Link href="#soluciones" className="button button-secondary">
                Ver soluciones <ChevronRight aria-hidden="true" />
              </Link>
            </div>

            <div className="outcome-list" aria-label="Principales resultados">
              {outcomes.map(({ icon: Icon, text }) => (
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
              <video autoPlay loop muted playsInline poster="/images/valdivia_lilies.jpg" aria-label="Sistema Qualiblick identificando y midiendo productos en una línea de proceso">
                <source src="/videos/example2.mp4" type="video/mp4" />
              </video>
              <div className="video-vignette" />
              <div className="scan-line" aria-hidden="true" />

              <div className="live-badge"><span /> ANÁLISIS EN VIVO</div>
              <div className="quality-panel">
                <div className="panel-header">
                  <div><ScanLine aria-hidden="true" /> Distribución del lote</div>
                  <span>LOTE 24-06</span>
                </div>
                <div className="distribution-bars" aria-label="Distribución simulada de calibres">
                  <div><span>45–50</span><i style={{ width: "34%" }} /><b>18%</b></div>
                  <div><span>50–55</span><i style={{ width: "76%" }} /><b>41%</b></div>
                  <div><span>55–60</span><i style={{ width: "58%" }} /><b>31%</b></div>
                </div>
                <div className="panel-footer">
                  <span><Check aria-hidden="true" /> Perfil comercial disponible</span>
                  <strong>1.284 analizados</strong>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

      </section>

      <section className="blindspot-section section-space">
        <div className="landing-container split-heading">
          <Reveal>
            <SectionLabel>El costo de decidir tarde</SectionLabel>
            <h2>Cuando conoces la calidad al final, ya perdiste opciones.</h2>
          </Reveal>
          <Reveal delay={0.1} className="split-heading-copy">
            <p>Una muestra pequeña puede ocultar la distribución real de tu producción. Si el dato llega después del empaque, ya no puedes cambiar el destino del lote, corregir la línea ni negociar con la misma evidencia.</p>
          </Reveal>
        </div>

        <div className="landing-container comparison-grid">
          <Reveal className="comparison-card comparison-old">
            <span className="comparison-kicker">Muestreo tradicional</span>
            <h3>Una parte mínima intenta representar el lote completo.</h3>
            <ul>
              <li><X aria-hidden="true" /> Datos tardíos y fragmentados</li>
              <li><X aria-hidden="true" /> Criterios que cambian entre personas</li>
              <li><X aria-hidden="true" /> Decisiones comerciales con puntos ciegos</li>
            </ul>
            <div className="sample-visual sample-small">
              {[...Array(35)].map((_, index) => <i key={index} className={index < 4 ? "active" : ""} />)}
            </div>
            <p className="sample-caption"><strong>Muestra limitada</strong><span>Menor representatividad</span></p>
          </Reveal>

          <Reveal delay={0.12} className="comparison-card comparison-new">
            <span className="comparison-kicker">Decisiones con Qualiblick</span>
            <h3>Información representativa mientras todavía puedes actuar.</h3>
            <ul>
              <li><Check aria-hidden="true" /> Distribución por calibre y calidad</li>
              <li><Check aria-hidden="true" /> Criterios consistentes por lote</li>
              <li><Check aria-hidden="true" /> Datos accionables para ventas y planta</li>
            </ul>
            <div className="sample-visual sample-large">
              {[...Array(35)].map((_, index) => <i key={index} className={index < 30 ? "active" : ""} />)}
            </div>
            <p className="sample-caption"><strong>Mayor cobertura</strong><span>Más opciones antes de decidir</span></p>
          </Reveal>
        </div>
      </section>

      <section id="soluciones" className="solutions-section section-space">
        <div className="landing-container centered-heading">
          <Reveal>
            <SectionLabel>Una misma promesa, donde la necesitas</SectionLabel>
            <h2>Mide a tiempo para tomar la decisión correcta.</h2>
            <p>Qualiblick lleva una lectura objetiva del lote al punto donde todavía puedes cambiar su destino: recepción, línea de proceso o terreno.</p>
          </Reveal>
        </div>

        <div className="landing-container solutions-grid">
          {soluciones.map(({ slug, moment, icon: Icon, name, descriptor, tagline }, index) => (
            <Reveal key={slug} delay={index * 0.08} className="solution-card">
              <Link href={`/soluciones/${slug}`} className="solution-card-link">
                <span className="solution-card-tag"><Icon aria-hidden="true" /> {moment}</span>
                <h3>{name}</h3>
                <span className="solution-card-descriptor">{descriptor}</span>
                <p>{tagline}</p>
                <span className="solution-card-cta">Ver solución <ArrowRight aria-hidden="true" /></span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="impacto" className="impact-section section-space">
        <div className="landing-container">
          <div className="impact-heading">
            <Reveal>
              <SectionLabel>Lo que cambia en tu operación</SectionLabel>
              <h2>El dato importa cuando te permite <span>proteger el valor del lote.</span></h2>
            </Reveal>
          </div>

          <div className="impact-grid">
            {impact.map(({ number, icon: Icon, title, text }, index) => (
              <Reveal key={title} delay={index * 0.08} className="impact-card">
                <div className="impact-card-top"><span>{number}</span><Icon aria-hidden="true" /></div>
                <h3>{title}</h3>
                <p>{text}</p>
                <div className="impact-arrow"><ArrowRight aria-hidden="true" /></div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="edge" className="edge-section section-space">
        <div className="landing-container edge-grid">
          <Reveal className="edge-copy">
            <SectionLabel>Equipo + software + servicio</SectionLabel>
            <h2>La medición ocurre dentro de tu operación, no en una oficina.</h2>
            <p>Qualiblick combina cámaras, análisis y acompañamiento operativo. El equipo analiza las imágenes dentro de tu planta, entrega resultados al instante y sigue funcionando aunque la conexión a internet sea inestable.</p>
            <div className="edge-benefits">
              <div><Clock3 aria-hidden="true" /><span><strong>Al instante</strong>Resultados mientras trabajas</span></div>
              <div><Cpu aria-hidden="true" /><span><strong>Dentro de tu planta</strong>Sin enviar videos a internet</span></div>
              <div><Zap aria-hidden="true" /><span><strong>Aunque falle internet</strong>Tu operación sigue funcionando</span></div>
            </div>
          </Reveal>

          <Reveal delay={0.12} className="edge-visual">
            <div className="edge-rings" aria-hidden="true"><i /><i /><i /></div>
            <div className="edge-device"><Cpu aria-hidden="true" /><span>EQUIPO QUALIBLICK</span><strong>FUNCIONANDO</strong></div>
            <div className="edge-node node-camera"><ScanLine aria-hidden="true" /><span>Cámara</span></div>
            <div className="edge-node node-data"><BarChart3 aria-hidden="true" /><span>Medición</span></div>
            <div className="edge-node node-action"><CircleGauge aria-hidden="true" /><span>Resultado</span></div>
          </Reveal>
        </div>
      </section>

      <section id="validacion" className="validation-section section-space">
        <div className="landing-container validation-grid">
          <Reveal className="validation-image">
            <Image src="/images/valdivia_lilies.jpg" alt="Planta de Valdivia Lilies donde se validó la tecnología Qualiblick" fill sizes="(max-width: 900px) 100vw, 50vw" />
            <div className="validation-image-overlay" />
            <div className="case-label"><MapPin aria-hidden="true" /> Valdivia, Chile</div>
            <div className="case-result"><strong>97,54%</strong><span>Precisión en conteo</span></div>
          </Reveal>

          <Reveal delay={0.1} className="validation-copy">
            <SectionLabel>Prueba en operación real</SectionLabel>
            <h2>La precisión se probó donde el proceso no espera.</h2>
            <p>En Valdivia Lilies, la solución midió productos con formas irregulares, superposición y suciedad: condiciones reales donde un dato equivocado puede terminar en una mala clasificación, reproceso o pérdida de valor.</p>
            <blockquote>“Si podemos medir con precisión en estas condiciones, podemos llevar datos confiables a los puntos más exigentes de tu producción.”</blockquote>
            <div className="validation-metrics">
              <div><strong>97,54%</strong><span>Precisión validada</span></div>
              <div><strong>+20 obj/s</strong><span>Alto flujo</span></div>
              <div><strong>24/7</strong><span>Sin fatiga</span></div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="trust-section section-space" aria-labelledby="trust-title">
        <div className="landing-container trust-grid">
          <Reveal className="trust-copy">
            <SectionLabel>Confianza que acompaña el crecimiento</SectionLabel>
            <h2 id="trust-title">Una tecnología que ya mueve decisiones reales.</h2>
            <p>Contamos con el respaldo de organizaciones que impulsan la innovación y el crecimiento de soluciones de alto impacto.</p>
          </Reveal>

          <Reveal delay={0.1} className="trust-proof-card">
            <div className="trust-proof-stat">
              <strong>+100<span>M</span></strong>
              <span>ítems procesados</span>
            </div>
            <div className="trust-proof-divider" aria-hidden="true" />
            <p>Lecturas que convierten el volumen de tu operación en información accionable.</p>
          </Reveal>
        </div>

        <div className="landing-container backers-row" aria-label="Organizaciones que respaldan a Qualiblick">
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
            <h2>Descubre dónde puedes proteger más valor en cada lote.</h2>
            <p>Agenda una evaluación de tu cultivo, volumen y proceso para identificar qué medir primero y qué decisión puedes mejorar.</p>
            <a href={demoHref} className="button button-primary button-large">
              Agenda una evaluación <ArrowRight aria-hidden="true" />
            </a>
            <span className="cta-contact"><Mail aria-hidden="true" /> contacto@qualiblick.com</span>
          </Reveal>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-container footer-grid">
          <div>
            <Image src="/images/qb.png" alt="Qualiblick" width={170} height={40} className="footer-logo" />
            <p>Datos reales para proteger el valor de cada lote.</p>
          </div>
          <div className="footer-links">
            <Link href="#soluciones">Soluciones</Link>
            <Link href="#impacto">Impacto</Link>
            <Link href="#edge">Tecnología</Link>
            <Link href="#validacion">Resultados</Link>
            <Link href="/sobre-nosotros">Sobre nosotros</Link>
          </div>
          <div className="footer-contact">
            <a href="mailto:contacto@qualiblick.com"><Mail aria-hidden="true" /> contacto@qualiblick.com</a>
            <span><MapPin aria-hidden="true" /> Santiago, Chile</span>
          </div>
        </div>
        <div className="landing-container footer-bottom">
          <span>© 2026 Qualiblick. Todos los derechos reservados.</span>
          <Link href="/login">Acceso a plataforma</Link>
        </div>
      </footer>
    </main>
  );
}
