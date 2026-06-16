import type { Metadata } from "next";
import {
  Anton,
  Instrument_Serif,
  JetBrains_Mono,
  Lato,
  Manrope,
  Poppins,
} from "next/font/google";

import { Toaster } from "@/components/Toaster";

import "./globals.css";

// Display: Anton (primary) → Poppins (fallback) → system-ui
const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--font-display-1" });
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-display-2",
});
// Body: Manrope (primary) → Lato (fallback) → system-ui
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body-1",
});
const lato = Lato({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-body-2" });
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Human Growth",
  description:
    "Plataforma de crecimiento profesional holístico — 6 dimensiones del crecimiento humano.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${anton.variable} ${poppins.variable} ${manrope.variable} ${lato.variable} ${serif.variable} ${mono.variable}`}
    >
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
