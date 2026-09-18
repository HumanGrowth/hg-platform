import { describe, expect, it } from "vitest";

/**
 * Gate de contraste WCAG para el tema glassmorphic — light y dark (la app
 * es siempre glass, estas son sus dos variantes de color).
 *
 * Compone los tokens translúcidos de glass.css sobre el peor fondo
 * plausible (cada blob del fondo del tema, compuesto sobre la base del
 * tema) y verifica que el texto que vive encima siga cumpliendo WCAG:
 *   - 4.5:1 para texto normal.
 *   - 3:1 para texto grande / componentes UI (foco, bordes).
 *
 * Si algún par cae debajo del umbral, este test falla — es la señal de que
 * un token de glass.css se volvió menos opaco de lo seguro.
 */

type Rgb = [number, number, number];

function hexToRgb(hex: string): Rgb {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** Compone un color rgba (fg) sobre un fondo opaco rgb (bg) → rgb resultante. */
function composite(fg: Rgb, alpha: number, bg: Rgb): Rgb {
  return [0, 1, 2].map((i) => Math.round(fg[i] * alpha + bg[i] * (1 - alpha))) as Rgb;
}

function relLuminance([r, g, b]: Rgb): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(a: Rgb, b: Rgb): number {
  const l1 = relLuminance(a);
  const l2 = relLuminance(b);
  const [lighter, darker] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

const AA_TEXT = 4.5;
const AA_UI = 3.0;

interface ThemeSpec {
  name: string;
  /** Base "ground" del fondo (--hg-cream en light, --bg-sunken en dark). */
  ground: Rgb;
  /** Blobs difusos [hex, alpha] del body::before de ese tema. */
  blobs: [string, number][];
  fillStrongBase: Rgb;
  fillStrongAlpha: number;
  fillDeepBase: Rgb;
  fillDeepAlpha: number;
  /** Tarjeta dentro de tarjeta (.glass-inset) — se compone SOBRE la card strong. */
  insetBase: Rgb;
  insetAlpha: number;
  textStrong: Rgb; // título (--fg)
  textMuted: Rgb; // body/muted (--fg-muted)
  focusRing: Rgb; // --glass-focus-ring
}

const LIGHT: ThemeSpec = {
  name: "light",
  ground: hexToRgb("#faf3e8"), // --hg-cream
  blobs: [
    ["#4a7a54", 0.22],
    ["#e8a030", 0.2],
    ["#a8c4a0", 0.28],
    ["#e8530a", 0.1],
  ],
  fillStrongBase: [255, 255, 255],
  fillStrongAlpha: 0.74,
  fillDeepBase: [253, 250, 246],
  fillDeepAlpha: 0.84,
  insetBase: [255, 255, 255],
  insetAlpha: 0.55,
  textStrong: hexToRgb("#1a1a1a"), // --hg-ink
  textMuted: hexToRgb("#6b7061"), // --hg-olive-gray
  focusRing: hexToRgb("#2a2826"), // --hg-charcoal
};

const DARK: ThemeSpec = {
  name: "dark",
  ground: hexToRgb("#100f0e"), // --bg-sunken bajo [data-theme="dark"]
  blobs: [
    ["#4a7a54", 0.32],
    ["#e8a030", 0.26],
    ["#a8c4a0", 0.2],
    ["#e8530a", 0.16],
  ],
  fillStrongBase: [30, 28, 26],
  fillStrongAlpha: 0.58,
  fillDeepBase: [18, 17, 16],
  fillDeepAlpha: 0.8,
  insetBase: [255, 255, 255],
  insetAlpha: 0.06,
  textStrong: hexToRgb("#faf3e8"), // --fg / --hg-cream
  textMuted: hexToRgb("#b3b0a8"), // --fg-muted
  focusRing: hexToRgb("#faf3e8"), // --hg-cream
};

function backdropCandidates(spec: ThemeSpec): Rgb[] {
  return [spec.ground, ...spec.blobs.map(([hex, alpha]) => composite(hexToRgb(hex), alpha, spec.ground))];
}

function worstContrast(spec: ThemeSpec, fillRgb: Rgb, alpha: number, textRgb: Rgb): number {
  return Math.min(
    ...backdropCandidates(spec).map((bg) => contrastRatio(composite(fillRgb, alpha, bg), textRgb)),
  );
}

describe.each([LIGHT, DARK])("tema glass $name · WCAG contrast gate", (spec) => {
  it("texto principal sobre glass-surface-strong cumple 4.5:1", () => {
    const ratio = worstContrast(spec, spec.fillStrongBase, spec.fillStrongAlpha, spec.textStrong);
    expect(ratio).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it("texto muted sobre glass-surface-strong cumple 4.5:1", () => {
    const ratio = worstContrast(spec, spec.fillStrongBase, spec.fillStrongAlpha, spec.textMuted);
    expect(ratio).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it("texto principal sobre glass-modal (fill-deep) cumple 4.5:1", () => {
    const ratio = worstContrast(spec, spec.fillDeepBase, spec.fillDeepAlpha, spec.textStrong);
    expect(ratio).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it("texto muted sobre glass-modal (fill-deep) cumple 4.5:1", () => {
    const ratio = worstContrast(spec, spec.fillDeepBase, spec.fillDeepAlpha, spec.textMuted);
    expect(ratio).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it("texto muted dentro de una tarjeta inset (card dentro de card) cumple 4.5:1", () => {
    // Peor caso: inset compuesto sobre la card strong compuesta sobre cada backdrop.
    const worst = Math.min(
      ...backdropCandidates(spec).map((bg) => {
        const card = composite(spec.fillStrongBase, spec.fillStrongAlpha, bg);
        const inset = composite(spec.insetBase, spec.insetAlpha, card);
        return contrastRatio(inset, spec.textMuted);
      }),
    );
    expect(worst).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it("anillo de foco sobre glass-surface-strong cumple 3:1 (UI)", () => {
    const ratio = worstContrast(spec, spec.fillStrongBase, spec.fillStrongAlpha, spec.focusRing);
    expect(ratio).toBeGreaterThanOrEqual(AA_UI);
  });

  it("anillo de foco sobre el fondo del tema (peor blob) cumple 3:1 (UI)", () => {
    const ratio = Math.min(...backdropCandidates(spec).map((bg) => contrastRatio(bg, spec.focusRing)));
    expect(ratio).toBeGreaterThanOrEqual(AA_UI);
  });
});
