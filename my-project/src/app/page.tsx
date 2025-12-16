"use client";
import type React from "react";
import { useState, useEffect } from "react";
import {
  Zap,
  Activity,
  CheckCircle,
  Globe,
  Server,
  Layers,
  Menu,
  X,
  ArrowRight,
} from "lucide-react";

interface SectionProps {
  id: string;
}

const companyData = {
  name: "Qualiblick",
  contactUrl: "#contacto", // Or specific demo link
  hero: {
    headline: "Digitaliza tu producción real. Sin estimaciones.",
    subheadline:
      "Sistemas de visión artificial autónomos que transforman tu línea de proceso en métricas exactas. Tecnología validada industrialmente.",
    cta: "Ver Demo",
  },
  technology: {
    title: "La Tecnología",
    items: [
      {
        icon: Layers,
        title: "Deep Learning Industrial",
        description:
          "Algoritmos propios que corrigen distorsiones físicas (movimiento, vibración, orientación) para dar datos limpios.",
      },
      {
        icon: Server, // Represents Edge/Hardware
        title: "Edge Computing",
        description:
          "Procesamiento local de alta velocidad (hardware Nvidia Jetson). Sin dependencia de la nube. Cero latencia.",
      },
    ],
  },
  traction: {
    title: "Tracción y Validación",
    subtitle: "Prueba de Concepto (PoC) Informe Pelchuquín",
    stats: [
      {
        icon: CheckCircle,
        value: "97.54%",
        label: "Precisión",
        description: "Dato real de conteo validado en planta.",
      },
      {
        icon: Activity, // Represents flow/activity
        value: "High-Flow",
        label: "Ready",
        description:
          "Capaz de procesar flujos densos donde el ojo humano falla.",
      },
      {
        icon: Globe,
        value: "Global",
        label: "Standard",
        description:
          "Tecnología sometida a validación de contra-temporada para asegurar robustez mundial.",
      },
    ],
  },
  scalability: {
    title: "¿Por qué Qualiblick?",
    features: [
      {
        title: "Plug & Play Industrial",
        description:
          "Tecnología lista para desplegar. Sin desarrollos internos lentos ni costosos.",
      },
      {
        title: "Sin Techo Operativo",
        description:
          "Nuestro sistema no se cansa ni pierde precisión en temporada alta.",
      },
    ],
  },
  footer: {
    tagline: "Qualiblick: Inteligencia Artificial para el Agro Real.",
  },
};

const Logo: React.FC = () => (
  <div className="flex items-center space-x-2">
    {/* Reusing existing logo path */}
    <img src="images/qb.png" alt="Qualiblick" className="w-auto h-12" />
  </div>
);

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "#tecnologia", label: "Tecnología" },
    { href: "#validacion", label: "Validación" },
    { href: "#escalabilidad", label: "Escalabilidad" },
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
    <nav
      className={`fixed w-full z-50 transition-all duration-300 ${
        scrolled || isOpen
          ? "bg-slate-900/95 backdrop-blur-md py-4 shadow-lg"
          : "bg-transparent py-6"
      }`}
    >
      <div className="container mx-auto px-6 flex justify-between items-center">
        <a href="#" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <Logo />
        </a>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-8">
          {navLinks.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              onClick={(e) => scrollToSection(e, href)}
              className="text-slate-300 hover:text-emerald-400 font-medium transition-colors"
            >
              {label}
            </a>
          ))}
          <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-full font-semibold transition-all hover:shadow-lg hover:shadow-emerald-500/20">
            {companyData.hero.cta}
          </button>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden text-white"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-slate-900 border-t border-slate-800">
          <div className="flex flex-col p-6 space-y-4">
            {navLinks.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                onClick={(e) => scrollToSection(e, href)}
                className="text-slate-300 hover:text-emerald-400 font-medium text-lg"
              >
                {label}
              </a>
            ))}
            <button className="bg-emerald-500 text-white px-6 py-3 rounded-lg font-semibold w-full">
              {companyData.hero.cta}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

const Hero: React.FC<SectionProps> = ({ id }) => {
  return (
    <section
      id={id}
      className="relative min-h-screen flex items-center pt-20 bg-slate-950 overflow-hidden"
    >
      {/* Background Grid Effect */}
      <div className="absolute inset-0 z-0 opacity-20">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm font-semibold tracking-wide uppercase animate-fade-in-up">
            Tecnología Validada Industrialmente
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 leading-tight animate-fade-in-up animation-delay-100">
            {companyData.hero.headline}
          </h1>
          <p className="text-xl md:text-2xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in-up animation-delay-200">
            {companyData.hero.subheadline}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up animation-delay-300">
            <button className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold text-lg transition-all hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/20 flex items-center justify-center">
              {companyData.hero.cta}
              <ArrowRight className="ml-2 w-5 h-5" />
            </button>
            <button onClick={() => document.querySelector('#tecnologia')?.scrollIntoView({ behavior: 'smooth' })} className="w-full sm:w-auto px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-lg transition-all border border-slate-700">
              Conocer la Tecnología
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

const Technology: React.FC<SectionProps> = ({ id }) => {
  return (
    <section id={id} className="py-24 bg-slate-950 text-white relative">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl md:text-5xl font-bold mb-16 text-center">
          {companyData.technology.title}
        </h2>
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          {companyData.technology.items.map((item, index) => (
            <div
              key={index}
              className="group p-8 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-900/20"
            >
              <div className="mb-6 p-4 rounded-xl bg-slate-800 w-fit group-hover:bg-emerald-500/10 transition-colors">
                <item.icon className="w-10 h-10 text-emerald-500" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-emerald-400 transition-colors">
                {item.title}
              </h3>
              <p className="text-slate-400 text-lg leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Traction: React.FC<SectionProps> = ({ id }) => {
  return (
    <section id={id} className="py-24 bg-slate-900 relative overflow-hidden">
        {/* Subtle decorative elements */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            {companyData.traction.title}
          </h2>
          <p className="text-emerald-400 font-mono text-lg">
            {'//'} {companyData.traction.subtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {companyData.traction.stats.map((stat, index) => (
            <div
              key={index}
              className="bg-slate-950/50 backdrop-blur-sm p-8 rounded-2xl border border-slate-800 flex flex-col items-center text-center hover:transform hover:-translate-y-1 transition-transform duration-300"
            >
              <stat.icon className="w-12 h-12 text-emerald-500 mb-6" />
              <div className="text-4xl md:text-5xl font-extrabold text-white mb-2">
                {stat.value}
              </div>
              <div className="text-xl font-bold text-emerald-400 mb-4">
                {stat.label}
              </div>
              <p className="text-slate-400">
                {stat.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Scalability: React.FC<SectionProps> = ({ id }) => {
  return (
    <section id={id} className="py-24 bg-slate-950 text-white">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
                 <h2 className="text-3xl md:text-5xl font-bold mb-8 leading-tight">
                    {companyData.scalability.title}
                </h2>
                <div className="space-y-8">
                    {companyData.scalability.features.map((feature, idx) => (
                        <div key={idx} className="flex gap-4">
                            <div className="flex-shrink-0 mt-1">
                                <Zap className="w-6 h-6 text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                                <p className="text-slate-400 text-lg">{feature.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-12">
                     <button className="px-8 py-4 bg-white text-slate-950 hover:bg-emerald-50 rounded-lg font-bold text-lg transition-all shadow-lg hover:shadow-white/10">
                        Agenda una Demo
                    </button>
                </div>
            </div>
            {/* Visual element for Scalability */}
            <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-transparent rounded-2xl transform rotate-3" />
                <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
                     <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-4">
                        <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                        </div>
                        <div className="text-xs text-slate-500 font-mono">system_status.log</div>
                     </div>
                     <div className="space-y-4 font-mono text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-400">System Load:</span>
                            <span className="text-emerald-400">OPTIMAL</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Processing Rate:</span>
                            <span className="text-emerald-400">1200 items/min</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Uptime:</span>
                            <span className="text-emerald-400">99.99%</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Latency:</span>
                            <span className="text-emerald-400">&lt; 15ms</span>
                        </div>
                        <div className="mt-4 p-4 bg-slate-950 rounded border border-slate-800 text-slate-300">
                             &gt; Initializing edge nodes... OK<br/>
                             &gt; Calibrating vision sensors... OK<br/>
                             &gt; Starting autonomous flow... OK<br/>
                             <span className="animate-pulse">_</span>
                        </div>
                     </div>
                </div>
            </div>
        </div>
      </div>
    </section>
  );
};

const Footer: React.FC = () => (
  <footer className="bg-slate-950 border-t border-slate-900 text-slate-400 py-12">
    <div className="container mx-auto px-6 text-center">
      <div className="flex justify-center mb-6">
        <Logo />
      </div>
      <p className="text-xl font-medium text-white mb-2">
        {companyData.footer.tagline}
      </p>
      <p className="text-sm opacity-60">
        &copy; {new Date().getFullYear()} {companyData.name}. Todos los derechos reservados.
      </p>
    </div>
  </footer>
);

const App: React.FC = () => {
  useEffect(() => {
    // Simple intersection observer for fade-in animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.remove("opacity-0", "translate-y-4");
            entry.target.classList.add("opacity-100", "translate-y-0");
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll(".animate-fade-in-up").forEach((el) => {
        el.classList.add("transition-all", "duration-700", "ease-out");
       // Don't hide initially here to avoid CLS if JS fails, 
       // but typically we'd add opacity-0 class in JSX
    });
    
    return () => observer.disconnect();
  }, []);

  return (
    <div className="font-sans antialiased text-slate-200 bg-slate-950 selection:bg-emerald-500/30 selection:text-emerald-200">
      <Navbar />
      <main>
        <Hero id="home" />
        <Technology id="tecnologia" />
        <Traction id="validacion" />
        <Scalability id="escalabilidad" />
      </main>
      <Footer />
    </div>
  );
};

export default App;
