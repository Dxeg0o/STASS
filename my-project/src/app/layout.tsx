import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.stass.vercel.app"),
  title: "STASS - Asegura calidad en tus exportaciones de espárragos",
  description:
    "Detectamos hasta un 70% más de productos fuera de estándar mediante tecnología de punta, sin grandes inversiones iniciales.",
  openGraph: {
    title: "STASS - Asegura calidad en tus exportaciones de espárragos",
    description:
      "Detectamos hasta un 70% más de productos fuera de estándar mediante tecnología de punta, sin grandes inversiones iniciales.",
    url: "https://www.stass.vercel.app",
    siteName: "STASS",
    images: [
      {
        url: "/images/Stass.png",
        width: 800,
        height: 800,
        alt: "Logo de STASS",
      },
    ],

    locale: "es_LA",
    type: "website",
  },
  icons: {
    icon: "/images/Stass.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
