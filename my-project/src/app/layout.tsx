import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import AuthContext from "./context/AuthContext";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.qualiblick.com"),
  title: "Qualiblick | Decide el destino de cada lote con datos reales",
  description:
    "Qualiblick ayuda a packings y exportadoras agrícolas a conocer la calidad real de sus lotes antes de vender, procesar o guardar. Mide calibre, color y defectos en recepción, línea o terreno.",
  openGraph: {
    title: "Decide el destino de cada lote con datos reales",
    description:
      "Mide calibre, color y defectos antes de que sea tarde para vender, procesar, guardar o corregir.",
    url: "https://www.qualiblick.com",
    siteName: "Qualiblick",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Qualiblick: decide el destino de cada lote con datos reales",
      },
    ],
    locale: "es_CL",
    type: "website",
  },
  keywords: [
    "control de calidad de fruta",
    "packout",
    "reducción de merma",
    "visión artificial agroindustria",
    "escaneo de bins",
    "calibre de fruta",
    "calidad poscosecha",
    "Edge Computing",
    "Qualiblick",
  ],
  authors: [{ name: "Qualiblick", url: "https://www.qualiblick.com" }],
  icons: {
    icon: "/images/Qualiblick2.png",
  },
  twitter: {
    card: "summary_large_image",
    title: "Decide el destino de cada lote con datos reales",
    description: "Mide calidad a tiempo para vender mejor, reducir reprocesos y proteger el valor de cada lote.",
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
