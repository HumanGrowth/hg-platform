import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // ⚠️ Placeholder — reemplazar tras DEC-03 (identidad visual final).
        brand: {
          50: "#f5f7ff",
          100: "#e6ecff",
          500: "#3f5bdb",
          600: "#3349c2",
          700: "#283a9b",
          900: "#1a256b",
        },
        pillar: {
          p1: "#4f46e5", // Carrera e Impacto
          p2: "#0ea5e9", // Propósito y Significado
          p3: "#10b981", // Relaciones y Conexión
          p4: "#f59e0b", // Salud y Bienestar
          p5: "#a855f7", // Paz Interior y Claridad
          p6: "#ef4444", // Estabilidad Emocional y Material
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
