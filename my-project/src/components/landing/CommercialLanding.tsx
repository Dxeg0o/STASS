"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Boxes,
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

const demoHref =
  "mailto:contacto@qualiblick.com?subject=Solicitud%20de%20demostraci%C3%B3n%20t%C3%A9cnica&body=Hola%20equipo%20Qualiblick%2C%0A%0AMe%20gustar%C3%ADa%20conocer%20c%C3%B3mo%20Qualiblick%20puede%20aplicarse%20a%20nuestra%20operaci%C3%B3n.%0A%0AEmpresa%3A%0ACultivo%3A%0AVolumen%20aproximado%3A%0ATipo%20de%20operaci%C3%B3n%20%28bins%20o%20l%C3%ADnea%29%3A%0A%0AGracias.";

const outcomes = [
  { icon: TrendingUp, text: "Vende antes, con mayor certeza" },
  { icon: PackageCheck, text: "Más fruta al destino correcto" },
  { icon: ShieldCheck, text: "Menos merma y reempaque" },
];

const impact = [
  {
    number: "01",
    icon: TrendingUp,
    title: "Acelera las ventas",
    text: "Ofrece tu inventario con mayor conocimiento de su calibre, color y calidad antes de que ingrese al empaque.",
  },
  {
    number: "02",
    icon: BarChart3,
    title: "Optimiza el packout",
    text: "Dirige cada fruta al programa comercial adecuado y alinea lo que recibes con lo que tus clientes necesitan.",
  },
  {
    number: "03",
    icon: PackageCheck,
    title: "Reduce costos evitables",
    text: "Detecta desviaciones a tiempo para disminuir reprocesos, reempaque y pérdida de valor durante la poscosecha.",
  },
];

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="section-label">
      <span className="section-label-dot" />
      {children}
    </div>
  );
}

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
            <Link href="#como-funciona">Cómo funciona</Link>
            <Link href="#impacto">Impacto</Link>
            <Link href="#validacion">Resultados</Link>
          </div>

          <div className="nav-actions">
            <Link href="/login" className="nav-login">Ingresar</Link>
            <a href={demoHref} className="button button-small button-primary">Solicita una demo</a>
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
            <Link href="#como-funciona" onClick={closeMenu}>Cómo funciona</Link>
            <Link href="#impacto" onClick={closeMenu}>Impacto</Link>
            <Link href="#validacion" onClick={closeMenu}>Resultados</Link>
            <Link href="/login" onClick={closeMenu}>Ingresar</Link>
            <a href={demoHref} className="button button-primary" onClick={closeMenu}>Solicita una demo</a>
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
            <SectionLabel>Inteligencia de calidad para decisiones comerciales</SectionLabel>
            <h1>Convierte cada lote en una decisión <span>más rentable.</span></h1>
            <p className="hero-lead">
              Conoce calibre, color y defectos antes y durante el empaque. Qualiblick transforma bins y líneas de proceso en datos en tiempo real para vender con mayor certeza, reducir reempaque y dirigir cada fruta al destino correcto.
            </p>

            <div className="hero-actions">
              <a href={demoHref} className="button button-primary">
                Solicita una demostración <ArrowRight aria-hidden="true" />
              </a>
              <Link href="#como-funciona" className="button button-secondary">
                Ver cómo funciona <ChevronRight aria-hidden="true" />
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
            <SectionLabel>Visibilidad antes de actuar</SectionLabel>
            <h2>Conoce lo que tienes antes de decidir qué hacer con ello.</h2>
          </Reveal>
          <Reveal delay={0.1} className="split-heading-copy">
            <p>Una muestra pequeña puede ocultar la verdadera distribución de tu producción. Cuando el dato llega tarde, ventas, almacenamiento y empaque deciden con información incompleta.</p>
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
            <p className="sample-caption"><strong>Mayor cobertura</strong><span>Visibilidad en tiempo real</span></p>
          </Reveal>
        </div>
      </section>

      <section id="como-funciona" className="methods-section section-space">
        <div className="landing-container centered-heading">
          <Reveal>
            <SectionLabel>Se adapta a tu operación</SectionLabel>
            <h2>Una plataforma. Dos momentos críticos.</h2>
            <p>Obtén visibilidad antes de empacar y mantén el control mientras la producción está en movimiento.</p>
          </Reveal>
        </div>

        <div className="landing-container methods-grid">
          <Reveal className="method-card">
            <div className="method-image">
              <Image src="/images/bin-scan-industrial.webp" alt="Bin de manzanas bajo una cámara industrial para análisis antes del empaque" fill sizes="(max-width: 900px) 100vw, 50vw" />
              <div className="method-overlay" />
              <div className="method-tag"><Boxes aria-hidden="true" /> Antes del empaque</div>
              <div className="bin-data-chip"><span>LOTE RECEPCIONADO</span><strong>Perfil disponible</strong></div>
            </div>
            <div className="method-content">
              <span className="method-number">01</span>
              <h3>Escaneo de bins</h3>
              <p>Conoce calibre, color y calidad desde la recepción para orientar ventas, almacenamiento y programas de empaque.</p>
              <ul>
                <li><Check aria-hidden="true" /> Medición rápida y estandarizada</li>
                <li><Check aria-hidden="true" /> Perfil comercial por lote</li>
                <li><Check aria-hidden="true" /> Sin infraestructura compleja</li>
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.1} className="method-card">
            <div className="method-image">
              <video autoPlay loop muted playsInline aria-label="Conteo y medición continua de productos en una línea industrial">
                <source src="/videos/example.mp4" type="video/mp4" />
              </video>
              <div className="method-overlay" />
              <div className="method-tag"><ScanLine aria-hidden="true" /> Durante el proceso</div>
              <div className="line-status"><span /><strong>LÍNEA ACTIVA</strong><b>+20 obj/s</b></div>
            </div>
            <div className="method-content">
              <span className="method-number">02</span>
              <h3>Inspección continua</h3>
              <p>Detecta desviaciones durante el proceso y segmenta la calidad por productor, lote, turno o destino comercial.</p>
              <ul>
                <li><Check aria-hidden="true" /> Operación continua 24/7</li>
                <li><Check aria-hidden="true" /> Sin detener la línea</li>
                <li><Check aria-hidden="true" /> Datos listos para decidir</li>
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="impacto" className="impact-section section-space">
        <div className="landing-container">
          <div className="impact-heading">
            <Reveal>
              <SectionLabel>De la medición a la rentabilidad</SectionLabel>
              <h2>Más información no es el objetivo. <span>Mejores decisiones sí.</span></h2>
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
            <SectionLabel>Funciona donde produces</SectionLabel>
            <h2>Tus datos siguen llegando, incluso cuando internet falla.</h2>
            <p>El equipo de Qualiblick analiza las imágenes dentro de tu planta. Por eso puedes ver resultados al instante y seguir trabajando aunque la conexión a internet sea inestable.</p>
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
            <SectionLabel>Validación en operación real</SectionLabel>
            <h2>Validado donde medir es realmente difícil.</h2>
            <p>Formas irregulares, superposición y suciedad: el caso Valdivia Lilies llevó la tecnología a un entorno donde la visión artificial debe demostrar precisión, no prometerla.</p>
            <blockquote>“Si podemos medir con precisión en estas condiciones, podemos llevar datos confiables a los puntos más exigentes de tu producción.”</blockquote>
            <div className="validation-metrics">
              <div><strong>97,54%</strong><span>Precisión validada</span></div>
              <div><strong>+20 obj/s</strong><span>Alto flujo</span></div>
              <div><strong>24/7</strong><span>Sin fatiga</span></div>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="contacto" className="cta-section">
        <div className="landing-container cta-card">
          <div className="cta-grid" aria-hidden="true" />
          <Reveal className="cta-content">
            <div className="cta-icon"><Sparkles aria-hidden="true" /></div>
            <h2>Descubre cuánto valor estás dejando fuera de cada lote.</h2>
            <p>Conversemos sobre tu cultivo, volumen y proceso de empaque.</p>
            <a href={demoHref} className="button button-primary button-large">
              Solicita una demostración <ArrowRight aria-hidden="true" />
            </a>
            <span className="cta-contact"><Mail aria-hidden="true" /> contacto@qualiblick.com</span>
          </Reveal>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-container footer-grid">
          <div>
            <Image src="/images/qb.png" alt="Qualiblick" width={170} height={40} className="footer-logo" />
            <p>Datos reales para capturar más valor en cada etapa de la poscosecha.</p>
          </div>
          <div className="footer-links">
            <Link href="#como-funciona">Cómo funciona</Link>
            <Link href="#impacto">Impacto</Link>
            <Link href="#edge">Tecnología</Link>
            <Link href="#validacion">Resultados</Link>
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
