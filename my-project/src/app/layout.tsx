import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import AuthContext from "./context/AuthContext";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.qualiblick.com"),
  title: "Qualiblick | Más valor por cada lote",
  description:
    "Conoce calibre, color y calidad antes y durante el empaque. Qualiblick convierte bins y líneas de proceso en datos para vender mejor, optimizar el packout y reducir reempaque.",
  openGraph: {
    title: "Convierte cada lote en una decisión más rentable",
    description:
      "Datos de calidad en tiempo real para vender con mayor certeza, dirigir cada fruta al destino correcto y reducir merma y reempaque.",
    url: "https://www.qualiblick.com",
    siteName: "Qualiblick",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Qualiblick: convierte cada lote en una decisión más rentable",
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
    title: "Convierte cada lote en una decisión más rentable",
    description: "Datos de calidad en tiempo real para vender mejor, optimizar el packout y reducir reempaque.",
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
