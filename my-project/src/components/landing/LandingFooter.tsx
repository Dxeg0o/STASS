import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin } from "lucide-react";
import { contactEmail, navLinks } from "./cta";

export default function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-container footer-grid">
        <div>
          <Image src="/images/qb.png" alt="Qualiblick" width={170} height={40} className="footer-logo" />
          <p>Medición consistente y representativa para la agroindustria.</p>
        </div>
        <div className="footer-links">
          {navLinks.map(({ label, href }) => (
            <Link key={label} href={href}>{label}</Link>
          ))}
        </div>
        <div className="footer-contact">
          <a href={`mailto:${contactEmail}`}><Mail aria-hidden="true" /> {contactEmail}</a>
          <span><MapPin aria-hidden="true" /> Santiago, Chile</span>
        </div>
      </div>
      <div className="landing-container footer-bottom">
        <span>© 2026 Qualiblick. Todos los derechos reservados.</span>
        <Link href="/login">Acceso a plataforma</Link>
      </div>
    </footer>
  );
}
