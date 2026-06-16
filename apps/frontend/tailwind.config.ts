import type { Config } from "tailwindcss";

/**
 * Human Growth design tokens — Marketing palette v1 (confirmada por Andrés, Jun 15).
 * Fuente: docs/prompts/claude-code_Frontend-v2_marketing_nav_radar.md
 * Swap a identidad final = editar estos valores + globals.css, no los componentes.
 *
 * Los tokens semánticos (bg/fg/border) se mantienen wired a CSS variables — toda la
 * app v1 (6 páginas DS-beta) los consume; remapear su valor en globals.css basta.
 * Las claves *-500 / *-700 / *-900 / cream-300 son aliases de compat para clases
 * legacy que aún referencian la escala vieja (orange-500 ×25, cream-300, warm-900…).
 */
const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Foundation (neutrales)
        ink: {
          900: "#1A1A1A", // texto principal
          800: "#2A2826", // texto profundo / warm ink
        },
        slate: {
          900: "#2C3E50", // azul-gris profundo (alternativo)
        },
        warm: {
          600: "#6B7061", // gris cálido
          500: "#8E8E8E", // gris medio
          700: "#2A2826", // alias legacy → ink-800
          900: "#1A1A1A", // alias legacy → ink-900
        },
        cream: {
          50: "#FFFFFF", // blanco puro
          100: "#FAF3E8", // cream base
          200: "#F0EDE6", // cream claro
          300: "#E4DACB", // alias legacy (cream derivado)
        },
        // Paleta marca
        gold: { DEFAULT: "#C8A76E" }, // dorado caqui (acentos calidad/logro)
        forest: { DEFAULT: "#4A7A54" }, // verde bosque (crecimiento)
        orange: {
          DEFAULT: "#E8530A", // CTA principal
          50: "#FFF1E8",
          100: "#FFD9C2",
          500: "#E8530A", // alias legacy = brand
          600: "#C8470A", // hover (-10%)
          700: "#A03B08", // press (-20%)
          800: "#A03B08", // alias legacy
        },
        amber: { DEFAULT: "#E8A030" }, // ámbar (warning, badges)
        sage: { DEFAULT: "#A8C4A0" }, // verde salvia (acentos suaves, success ligero)
        // Semánticos
        success: { DEFAULT: "#4A7A54", bg: "#E6F0E8" },
        warning: { DEFAULT: "#E8A030", bg: "#FBE9CC" },
        danger: { DEFAULT: "#B83A1A", bg: "#FADAD2" },
        info: { DEFAULT: "#2C3E50", bg: "#DCE3EB" },
        // Semantic tokens wired to CSS variables (theme-aware) — preservados.
        bg: {
          DEFAULT: "var(--bg)",
          raised: "var(--bg-raised)",
          sunken: "var(--bg-sunken)",
          inverse: "var(--bg-inverse)",
        },
        fg: {
          DEFAULT: "var(--fg)",
          muted: "var(--fg-muted)",
          subtle: "var(--fg-subtle)",
          inverse: "var(--fg-inverse)",
        },
        border: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
          focus: "var(--border-focus)",
        },
        // 6 pilares (alineados a la lógica del Marco Teórico).
        pillar: {
          p1: "#E8530A", // Carrera — orange
          p2: "#C8A76E", // Propósito — gold
          p3: "#4A7A54", // Relaciones — forest
          p4: "#A8C4A0", // Salud — sage
          p5: "#2C3E50", // Paz interior — slate
          p6: "#6B7061", // Estabilidad — warm
        },
      },
      fontFamily: {
        display: [
          "var(--font-display-1)", // Anton
          "var(--font-display-2)", // Poppins
          "Bebas Neue",
          "Impact",
          "system-ui",
          "sans-serif",
        ],
        sans: [
          "var(--font-body-1)", // Manrope
          "var(--font-body-2)", // Lato
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        serif: ["var(--font-serif)", "Source Serif 4", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SF Mono", "monospace"],
      },
      fontSize: {
        micro: ["0.75rem", { lineHeight: "1.15" }], // 12
        xs: ["0.8125rem", { lineHeight: "1.15" }], // 13
        sm: ["0.875rem", { lineHeight: "1.55" }], // 14
        base: ["1rem", { lineHeight: "1.55" }], // 16
        md: ["1.125rem", { lineHeight: "1.55" }], // 18
        lg: ["1.25rem", { lineHeight: "1.15" }], // 20
        xl: ["1.5rem", { lineHeight: "1.15" }], // 24
        "2xl": ["1.75rem", { lineHeight: "1.15" }], // 28
        "3xl": ["2.25rem", { lineHeight: "1.15" }], // 36
        "4xl": ["3rem", { lineHeight: "0.95" }], // 48
        "5xl": ["4rem", { lineHeight: "0.95" }], // 64
        "6xl": ["5.5rem", { lineHeight: "0.95" }], // 88
      },
      letterSpacing: {
        tight: "-0.02em",
        normal: "0",
        meta: "0.08em",
        wide: "0.16em",
      },
      lineHeight: {
        tight: "0.95",
        snug: "1.15",
        base: "1.55",
        loose: "1.75",
      },
      spacing: {
        // 4px base; extiende Tailwind donde difiere.
        "1": "4px",
        "2": "8px",
        "3": "12px",
        "4": "16px",
        "5": "20px",
        "6": "24px",
        "8": "32px",
        "10": "40px",
        "12": "48px",
        "16": "64px",
        "20": "80px",
        "24": "96px",
        "32": "128px",
      },
      borderRadius: {
        none: "0",
        sm: "4px",
        md: "8px", // buttons / inputs / chips
        lg: "12px", // cards / panels
        xl: "16px", // sheets / modals
        "2xl": "24px",
        full: "9999px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(26, 20, 15, 0.06)",
        md: "0 6px 16px -4px rgba(26, 20, 15, 0.08), 0 2px 4px rgba(26, 20, 15, 0.04)",
        lg: "0 24px 48px -12px rgba(26, 20, 15, 0.18)",
        focus: "0 0 0 3px rgba(232, 83, 10, 0.32)",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.32, 0.72, 0, 1)", // Apple-ish entries
        state: "cubic-bezier(0.4, 0, 0.2, 1)", // state changes
      },
      transitionDuration: {
        fast: "120ms",
        base: "200ms",
        slow: "320ms",
        page: "600ms",
      },
      maxWidth: {
        marketing: "1280px",
        app: "1440px",
        prose: "720px",
      },
      keyframes: {
        "ring-spin": { to: { transform: "rotate(360deg)" } },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "ring-spin": "ring-spin 2.4s linear infinite",
        "fade-up": "fade-up 200ms cubic-bezier(0.32, 0.72, 0, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
