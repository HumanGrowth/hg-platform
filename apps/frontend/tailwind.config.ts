import type { Config } from "tailwindcss";

/**
 * Human Growth · Design System v2 · Tailwind config (Jul 2 2026).
 *
 * Fuente de verdad: HG/Design/Nueva Marca - Brand Book/HumanGrowth Design System/tokens/
 * Delta baseline→v2: docs/design-system/DS_v2_delta.md
 *
 * Los tokens de color se dividen en 3 capas:
 *   1. Brand core (hg-*) — hex verbatim del Brand Book.
 *   2. Semantic (primary, accent, success, ...) — reglas de rol.
 *   3. Semantic tokens wired to CSS vars (bg, fg, border, accent) — theme-aware.
 *
 * DS-07: los aliases legacy v1 (orange/cream/warm/ink/gold/forest/sage/amber)
 * fueron eliminados; todo el código usa los tokens v2 (hg-*, primary, surface-*,
 * bg/fg/border semánticos, pillar-*).
 *
 * ⚠️ SWAP CLAVE: --accent es GREEN (era ORANGE). Componentes que usan
 * bg-accent, ring-accent ven el swap.
 */
const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // ---- Brand core -------------------------------------------------
        "hg-green": { DEFAULT: "#4a7a54", 700: "#3c6444", 100: "#e3ebdf" },
        "hg-amber": { DEFAULT: "#e8a030", 600: "#ce8a1f" },
        "hg-orange": { DEFAULT: "#e8530a", 700: "#c4440a" },
        "hg-gold": { DEFAULT: "#c8a76e" },
        "hg-sage": { DEFAULT: "#a8c4a0" },

        "hg-ink": { DEFAULT: "#1a1a1a" },
        "hg-charcoal": { DEFAULT: "#2a2826" },
        "hg-slate": { DEFAULT: "#2c3e50" },
        "hg-olive-gray": { DEFAULT: "#6b7061" },
        "hg-gray": { DEFAULT: "#8e8e8e" },
        "hg-cream": { DEFAULT: "#faf3e8" },
        "hg-linen": { DEFAULT: "#f0ede6" },
        "hg-white": { DEFAULT: "#ffffff" },

        // ---- Semantic roles ---------------------------------------------
        primary: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
        },
        secondary: {
          DEFAULT: "var(--color-secondary)",
          hover: "var(--color-secondary-hover)",
        },
        // Semantic tokens (theme-aware — light/dark via CSS vars)
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
          subtle: "var(--border-subtle)",
        },
        surface: {
          page: "var(--surface-page)",
          card: "var(--surface-card)",
          sunken: "var(--surface-sunken)",
          dark: "var(--surface-dark)",
          brand: "var(--surface-brand)",
        },

        // Feedback (semantic pairs)
        success: { DEFAULT: "var(--color-success)", bg: "var(--color-success-bg)" },
        warning: { DEFAULT: "var(--color-warning)", bg: "var(--color-warning-bg)" },
        danger: { DEFAULT: "var(--color-danger)", bg: "var(--color-danger-bg)" },
        info: { DEFAULT: "var(--color-info)", bg: "var(--color-info-bg)" },

        // ---- Pillar colors (mapping DS v2 · §4.2 delta doc) --------------
        // P6 pasa de gray → amber (más visible en dashboards)
        pillar: {
          p1: "#e8530a", // Carrera — orange (accent)
          p2: "#c8a76e", // Propósito — gold
          p3: "#4a7a54", // Relaciones — green (primary)
          p4: "#a8c4a0", // Salud — sage
          p5: "#2c3e50", // Paz interior — slate
          p6: "#e8a030", // Estabilidad — amber (era gray)
        },
      },
      fontFamily: {
        // DS v2 · tres tiers separados
        display: [
          "var(--font-display)",   // Anton
          "Arial Narrow",
          "Impact",
          "system-ui",
          "sans-serif",
        ],
        heading: [
          "var(--font-heading)",   // Poppins (DEDICATED tier)
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
        sans: [
          "var(--font-body)",      // Manrope
          "Segoe UI",
          "-apple-system",
          "system-ui",
          "sans-serif",
        ],
        data: [
          "var(--font-data)",      // Roboto (data tables)
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
        serif: ["var(--font-serif)", "Source Serif 4", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SF Mono", "monospace"],
      },
      fontSize: {
        // Micro + xs (utility)
        micro: ["0.75rem", { lineHeight: "1.15" }],       // 12
        xs: ["0.8125rem", { lineHeight: "1.15" }],         // 13 · excepción documentada
        // DS v2 body scale
        sm: ["0.875rem", { lineHeight: "1.5" }],           // 14
        base: ["1rem", { lineHeight: "1.5" }],             // 16
        md: ["1.125rem", { lineHeight: "1.5" }],           // 18
        // DS v2 headings (h1..h4)
        h4: ["1.25rem", { lineHeight: "1.15" }],           // 20
        h3: ["1.5rem", { lineHeight: "1.15" }],            // 24
        h2: ["2rem", { lineHeight: "1.15" }],              // 32
        h1: ["2.5rem", { lineHeight: "1.15" }],            // 40
        // Display
        "display-m": ["3rem", { lineHeight: "1.02" }],     // 48
        "display-l": ["4rem", { lineHeight: "1.02" }],     // 64
        "display-xl": ["5.5rem", { lineHeight: "1.02" }],  // 88
        // Legacy aliases (deprecated · match display-m/l/xl)
        lg: ["1.25rem", { lineHeight: "1.15" }],           // 20
        xl: ["1.5rem", { lineHeight: "1.15" }],            // 24
        "2xl": ["2rem", { lineHeight: "1.15" }],           // 32
        "3xl": ["2.5rem", { lineHeight: "1.15" }],         // 40
        "4xl": ["3rem", { lineHeight: "1.02" }],           // 48
        "5xl": ["4rem", { lineHeight: "1.02" }],           // 64
        "6xl": ["5.5rem", { lineHeight: "1.02" }],         // 88
      },
      letterSpacing: {
        display: "-0.01em",
        tight: "-0.02em",
        normal: "0",
        wide: "0.04em",
        meta: "0.08em",     // eyebrows
        caps: "0.08em",     // alias
        widest: "0.16em",
      },
      lineHeight: {
        tight: "1.02",
        snug: "1.15",
        base: "1.5",
        loose: "1.65",
      },
      spacing: {
        "1": "4px",
        "2": "8px",
        "3": "12px",
        "4": "16px",
        "5": "20px",   // legacy alias
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
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        "2xl": "24px",
        full: "9999px",
        pill: "9999px",
      },
      boxShadow: {
        xs: "0 1px 2px rgba(42, 40, 38, 0.06)",
        sm: "0 2px 6px rgba(42, 40, 38, 0.08)",
        md: "0 6px 18px rgba(42, 40, 38, 0.10)",
        lg: "0 16px 40px rgba(42, 40, 38, 0.14)",
        focus: "0 0 0 3px rgba(232, 160, 48, 0.45)",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.22, 1, 0.36, 1)",
        state: "cubic-bezier(0.65, 0, 0.35, 1)",
        "in-out": "cubic-bezier(0.65, 0, 0.35, 1)",
      },
      transitionDuration: {
        fast: "140ms",
        base: "220ms",
        slow: "380ms",
        page: "600ms",
      },
      maxWidth: {
        marketing: "1200px",
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
        "fade-up": "fade-up 220ms cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
