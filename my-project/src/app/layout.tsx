import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { Inter } from "next/font/google"; // [MODIFY] Use Inter font
import "./globals.css";
import AuthContext from "./context/AuthContext";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] }); // [MODIFY] Initialize Inter font

export const metadata: Metadata = {
  metadataBase: new URL("https://www.qualiblick.com"),
  title: "Qualiblick | Visión Artificial para la Agroindustria",
  description:
    "Transformamos la producción agroindustrial con visión artificial validada. Datos precisos en tiempo real, sin estimaciones. Tecnología DeepTech escalable.",
  openGraph: {
    title: "Qualiblick | Tecnología DeepTech para el Agro",
    description:
      "Digitaliza tu producción real. Visión artificial de alta precisión validada en entornos industriales complejos. Datos claves para la toma de decisiones.",
    url: "https://www.qualiblick.com",
    siteName: "Qualiblick",
    images: [
      {
        url: "/images/Qualiblick2.png",
        width: 800,
        height: 800,
        alt: "Qualiblick",
      },
    ],
    locale: "es_CL",
    type: "website",
  },
  keywords: [
    "DeepTech",
    "Visión Artificial",
    "Control de Calidad",
    "Agroindustria 4.0",
    "Bulbos de Lilium",
    "Agricultura de Precisión",
    "Qualiblick",
    "Tecnología Industrial"
  ],
  authors: [{ name: "Qualiblick", url: "https://www.qualiblick.com" }],
  icons: {
    icon: "/images/Qualiblick2.png",
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
        className={`${inter.className} antialiased bg-slate-950 text-white selection:bg-cyan-500/30`}
      >
        <AuthContext>{children}</AuthContext>
        <Toaster position="top-center" richColors />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
