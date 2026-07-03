import type { Metadata, Viewport } from "next";
import {
  Anton,
  JetBrains_Mono,
  Manrope,
  Poppins,
  Roboto,
} from "next/font/google";

import { Toaster } from "@/components/Toaster";

import "./globals.css";

/**
 * DS v2 · font tiers (Jul 2 2026).
 * Fuente: HumanGrowth Design System · tokens/fonts.css + Brand Book p.06.
 *
 *   --font-display  → Anton (display / headlines · ALL-CAPS, tight, heavy)
 *   --font-heading  → Poppins (subheads / UI labels / buttons — dedicated tier)
 *   --font-body     → Manrope (body copy · humanist, legible)
 *   --font-data     → Roboto (data tables · dense document text)
 *
 * Serif tier removido en v2 (Instrument Serif ya no forma parte del Brand Book).
 * Mono se mantiene solo para bloques de código puntuales (debug, admin).
 */
const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-heading",
});
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
});
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-data",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.humangrowth.io";
const DESCRIPTION =
  "Plataforma de crecimiento profesional holístico — 6 dimensiones del crecimiento humano.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Human Growth",
    template: "%s · Human Growth",
  },
  description: DESCRIPTION,
  applicationName: "Human Growth",
  manifest: "/favicon/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon/favicon-48x48.ico", sizes: "any" },
      { url: "/favicon/icon.svg", type: "image/svg+xml" },
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/favicon/apple-touch-icon.png",
    other: [{ rel: "mask-icon", url: "/favicon/safari-pinned-tab.svg", color: "#4A7A54" }],
  },
  openGraph: {
    type: "website",
    siteName: "Human Growth",
    title: "Human Growth",
    description: DESCRIPTION,
    locale: "es_CR",
    images: [{ url: "/social/og-image-1200x630.png", width: 1200, height: 630, alt: "Human Growth" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Human Growth",
    description: DESCRIPTION,
    images: ["/social/og-image-1200x630.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#4A7A54",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${anton.variable} ${poppins.variable} ${manrope.variable} ${roboto.variable} ${mono.variable}`}
    >
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
