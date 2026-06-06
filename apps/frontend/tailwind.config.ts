import type { Config } from "tailwindcss";

/**
 * Human Growth design tokens (DS beta v1 — pending DEC-03).
 * Fuente: packages/design-system/source/colors_and_type.css
 * Swap a identidad final = editar estos valores + globals.css, no los componentes.
 */
const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        orange: {
          50: "#FFF1E8",
          100: "#FFD9C2",
          200: "#FFB48A",
          300: "#FF8A52",
          400: "#FF6A26",
          500: "#FF4500", // brand primary
          600: "#E63E00", // hover
          700: "#B33000", // press / earned-badge text
          800: "#7A2100", // deep accent (pillar P6)
          900: "#4A1400",
        },
        cream: {
          50: "#FFFCF6", // lifted surface
          100: "#FDF5E6", // DEFAULT canvas
          200: "#F8EDD4",
          300: "#F0E0BD",
          400: "#E2CDA0",
        },
        warm: {
          300: "#B8A799",
          400: "#8A7765",
          500: "#6B5949",
          600: "#5C4A3F",
          700: "#3D3027",
          800: "#2A2018",
          900: "#1A140F", // ink
        },
        success: { DEFAULT: "#1F7A4D", bg: "#DFF0E5" },
        warning: { DEFAULT: "#B8741A", bg: "#FBE9CC" },
        danger: { DEFAULT: "#B83A1A", bg: "#FADAD2" },
        info: { DEFAULT: "#2A5F7A", bg: "#DCE9EF" },
        // Semantic tokens wired to CSS variables (theme-aware).
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
        // 6 pillars (DS-aligned).
        pillar: {
          p1: "#FF4500", // Carrera e Impacto — orange-500
          p2: "#5C4A3F", // Propósito — warm-600
          p3: "#1F7A4D", // Relaciones — success
          p4: "#B8741A", // Salud — warning
          p5: "#2A5F7A", // Paz Interior — info
          p6: "#7A2100", // Estabilidad — orange-800
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Anton", "Impact", "sans-serif"],
        sans: ["var(--font-body)", "Manrope", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Instrument Serif", "Georgia", "serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
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
        focus: "0 0 0 3px rgba(255, 69, 0, 0.32)",
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
