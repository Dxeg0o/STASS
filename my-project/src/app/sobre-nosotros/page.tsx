import type { Metadata } from "next";
import AboutUs from "../../components/landing/AboutUs";

const title = "Sobre nosotros | Qualiblick";
const description =
  "Qualiblick construye la infraestructura de medición de la agroindustria: convertimos muestreos manuales en sistemas de medición objetivos, consistentes y representativos.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "https://www.qualiblick.com/sobre-nosotros" },
  openGraph: {
    title,
    description,
    url: "https://www.qualiblick.com/sobre-nosotros",
    siteName: "Qualiblick",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Equipo fundador de Qualiblick" }],
    locale: "es_CL",
    type: "website",
  },
};

export default function AboutUsPage() {
  return <AboutUs />;
}
