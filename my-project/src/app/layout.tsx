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
  metadataBase: new URL("https://www.qualiblick.com"),
  title: "QualiBlick - Asegura calidad en tus exportaciones agrícolas",
  description:
    "Reducimos hasta un 30% los costos de inspección manual mediante tecnología de punta, sin grandes inversiones iniciales.",
  openGraph: {
    title: "QualiBlick - Asegura calidad en tus exportaciones agrícolas",
    description:
      "Reducimos hasta un 30% los costos de inspección manual mediante tecnología de punta, sin grandes inversiones iniciales.",
    url: "https://www.qualiblick.com",
    siteName: "QualiBlick",
    images: [
      {
        url: "/images/Qualiblick2.png",
        width: 800,
        height: 800,
        alt: "Logo de QualiBlick",
      },
    ],

    locale: "es_LA",
    type: "website",
  },
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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
