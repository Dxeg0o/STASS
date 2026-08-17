import type { Metadata } from "next";
import CommercialLanding from "../components/landing/CommercialLanding";

const title = "Qualiblick | Mide más de tu operación, decide con mejores datos";
const description =
  "Qualiblick es una plataforma de medición configurable para la agroindustria: aumenta la cobertura y la consistencia de mediciones que hoy se hacen a mano o sobre muestras pequeñas, en terreno, recepción y línea de proceso.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "https://www.qualiblick.com" },
  openGraph: {
    title: "Mide más de tu operación. Decide con mejores datos.",
    description,
    url: "https://www.qualiblick.com",
    siteName: "Qualiblick",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Qualiblick: medición inteligente para la agroindustria" }],
    locale: "es_CL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mide más de tu operación. Decide con mejores datos.",
    description,
    images: ["/og.png"],
  },
};

export default function Home() {
  return <CommercialLanding />;
}
