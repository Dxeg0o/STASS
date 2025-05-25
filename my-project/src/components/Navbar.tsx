import React, { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const navLinks = [
  { href: "/", label: "Inicio" },
  { href: "/login", label: "Iniciar sesión" },
  { href: "/register", label: "Registrarse" },
];

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const scrollToSection = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    e.preventDefault();
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
    setIsOpen(false);
  };

  return (
    <nav className="bg-emerald-800/95 backdrop-blur-md text-white p-4 fixed w-full z-50 shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="#home" onClick={(e) => scrollToSection(e, "#home")}>
          <div className="flex items-center space-x-2">
            <img src="images/qb.png" alt="Qualiblick" className="w-124 h-12" />
          </div>{" "}
        </Link>

        {/* Menú escritorio */}
        <div className="hidden md:flex space-x-6">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="hover:text-amber-300 transition-colors duration-300 font-medium"
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Botón móvil */}
        <div className="md:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-white focus:outline-none"
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Menú móvil desplegable */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-emerald-700 shadow-xl py-2">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="block px-4 py-3 text-center hover:bg-emerald-600 hover:text-amber-300 transition-colors duration-300"
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
