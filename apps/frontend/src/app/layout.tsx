import type { Metadata } from "next";
import { Anton, Instrument_Serif, JetBrains_Mono, Manrope } from "next/font/google";

import "./globals.css";

const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--font-display" });
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});
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
      className={`${anton.variable} ${manrope.variable} ${serif.variable} ${mono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
