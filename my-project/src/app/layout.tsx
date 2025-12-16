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
  title: "Qualiblick - La Revolución de la IA en el Agro",
  description:
    "Aseguramos la competitividad de tus productos agroindustriales con IA de vanguardia. Control total, menos costos, más calidad y eficiencia.",
  openGraph: {
    title: "Qualiblick - La Revolución de la IA en el Agro",
    description:
      "Optimiza tus procesos agroindustriales con soluciones inteligentes. IA para control de calidad, agricultura de precisión y eficiencia productiva.",
    url: "https://www.qualiblick.com",
    siteName: "Qualiblick",
    images: [
      {
        url: "/images/Qualiblick2.png",
        width: 800,
        height: 800,
        alt: "Logo de Qualiblick",
      },
    ],
    locale: "es_CL",
    type: "website",
  },
  keywords: [
    "IA agroindustria",
    "agricultura de precisión",
    "control de calidad",
    "optimización procesos",
    "reducción de mermas",
    "soluciones inteligentes agro",
    "Qualiblick",
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
    <html lang="es" className="dark">
      <body
        className={`${inter.className} antialiased`}
      >
        <AuthContext>{children}</AuthContext>
        <Toaster position="top-center" richColors />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
