import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import AuthContext from "./context/AuthContext";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.qualiblick.com"),
  title: "Qualiblick | Mide más de tu operación, decide con mejores datos",
  description:
    "La agroindustria decide con información obtenida de una fracción muy pequeña de lo que realmente ocurre. Qualiblick transforma esos muestreos en sistemas de medición consistentes y automatizados, configurados para terreno, recepción y línea de proceso.",
  openGraph: {
    title: "Mide más de tu operación. Decide con mejores datos.",
    description:
      "Una sola plataforma configurable para medir con mayor cobertura, un mismo criterio y datos estructurados, en terreno y en planta.",
    url: "https://www.qualiblick.com",
    siteName: "Qualiblick",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Qualiblick: medición consistente y representativa para la agroindustria",
      },
    ],
    locale: "es_CL",
    type: "website",
  },
  keywords: [
    "medición para la agroindustria",
    "muestreo representativo",
    "conteo automatizado",
    "visión computacional agrícola",
    "medición en línea de proceso",
    "medición en recepción",
    "medición en terreno",
    "inteligencia artificial agroindustrial",
    "procesamiento edge",
    "Qualiblick",
  ],
  authors: [{ name: "Qualiblick", url: "https://www.qualiblick.com" }],
  icons: {
    icon: "/images/Qualiblick2.png",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mide más de tu operación. Decide con mejores datos.",
    description:
      "Mayor cobertura, un mismo criterio y datos estructurados para las decisiones que hoy dependen de una muestra pequeña.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark scroll-smooth">
      <body
        className="antialiased bg-slate-950 text-white selection:bg-cyan-500/30"
      >
        <AuthContext>{children}</AuthContext>
        <Toaster position="top-center" richColors />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
