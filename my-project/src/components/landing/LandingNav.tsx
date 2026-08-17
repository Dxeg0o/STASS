"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { demoHref as defaultDemoHref, navLinks } from "./cta";

export default function LandingNav({
  isHome = false,
  currentPath,
  demoHref = defaultDemoHref,
}: {
  isHome?: boolean;
  currentPath?: string;
  demoHref?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  const href = (hash: string) => (isHome ? hash : `/${hash}`);

  const links = [
    ...navLinks.map(({ label, hash }) => ({ label, href: href(hash), current: false })),
    {
      label: "Sobre nosotros",
      href: "/sobre-nosotros",
      current: currentPath === "/sobre-nosotros",
    },
  ];

  return (
    <nav className="landing-nav" aria-label="Navegación principal">
      <div className="landing-container nav-inner">
        <Link href={isHome ? "#inicio" : "/"} className="brand-link" aria-label="Qualiblick, volver al inicio">
          <Image src="/images/qb.png" alt="Qualiblick" width={176} height={40} priority className="brand-logo" />
        </Link>

        <div className="nav-links">
          {links.map(({ label, href: linkHref, current }) => (
            <Link key={label} href={linkHref} aria-current={current ? "page" : undefined}>
              {label}
            </Link>
          ))}
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
          {links.map(({ label, href: linkHref }) => (
            <Link key={label} href={linkHref} onClick={closeMenu}>{label}</Link>
          ))}
          <Link href="/login" onClick={closeMenu}>Ingresar</Link>
          <a href={demoHref} className="button button-primary" onClick={closeMenu}>Agenda una evaluación</a>
        </div>
      )}
    </nav>
  );
}
