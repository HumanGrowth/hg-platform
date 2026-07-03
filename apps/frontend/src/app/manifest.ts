import type { MetadataRoute } from "next";

// PWA manifest (DS v2). Iconos provisionales derivados del isotipo PNG —
// reemplazar por los definitivos cuando lleguen los SVG del Brand Book.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Human Growth",
    short_name: "HG",
    description:
      "Plataforma de crecimiento profesional holístico — 6 dimensiones del crecimiento humano.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF3E8",
    theme_color: "#4A7A54",
    icons: [
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/brand/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
