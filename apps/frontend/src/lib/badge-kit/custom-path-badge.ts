/**
 * Multi-pillar badge for custom paths (Andy's call, see task brief): the kit
 * draws exactly one picto/accent per badge, but a custom path can span several
 * pillars. We reuse the kit's hexagonal frosted frame — including its banner
 * text, two-dot motif and lower-hemisphere caption — and only replace the
 * single-picto medallion with a row of mini-hex pips, one per pillar, tinted
 * with each pillar's canonical accent (via `badgeConfigForDimension`). We
 * never touch hg-badge-kit.js: we call its `svgString` then surgically strip
 * the medallion+rank-pips markup it always emits in non-compact mode and
 * inject our own row in the same slot.
 *
 * `title` = route name, `micro` = company name (Andy's decision). The kit
 * only renders `micro` when non-compact AND no `divName`/`code` are set, which
 * is exactly the combination we use here, so the company name comes through
 * the kit's own caption logic unmodified.
 */
import { badgeConfigForDimension } from "./dimension-adapter";
import { badgeSvgString, type BadgeState } from "./index";

// Neutral brand gold — doesn't privilege any one pillar's accent for the frame.
const FRAME_ACCENT = "#c8a76e"; // --hg-gold, see app/globals.css

const MAX_VISIBLE_PILLARS = 5;
const PIP_R = 7;
const PIP_Y = 80; // same y the kit centers its single-picto medallion on

// The non-compact rank-pips (cx=84/100/116, cy=60) + medallion group (fixed at
// cx=100, cy=80, r=13, closing with the literal "scale(0.38) translate(-24 -24)"
// picto group) that hg-badge-kit.js always emits when `compact` is falsy. Both
// anchors are hardcoded in the kit (not opts-driven), so this stays stable
// across accent/picto/rank inputs. See `__tests__/custom-path-badge.test.ts`
// for a guard that catches silent drift if the kit's markup ever changes.
const MEDALLION_AND_PIPS_RE =
  /<circle cx="84" cy="60"[\s\S]*?scale\(0\.38\) translate\(-24 -24\)">[\s\S]*?<\/g>/;

function hexPipPath(cx: number, cy: number, r: number): string {
  const points: string[] = [];
  for (let k = 0; k < 6; k++) {
    const angle = (Math.PI / 180) * (60 * k - 30);
    const x = (cx + r * Math.cos(angle)).toFixed(1);
    const y = (cy + r * Math.sin(angle)).toFixed(1);
    points.push(`${k === 0 ? "M" : "L"}${x} ${y}`);
  }
  return `${points.join(" ")} Z`;
}

function pillarPipsRow(pillars: string[]): string {
  const visible = pillars.slice(0, MAX_VISIBLE_PILLARS);
  const extra = pillars.length - visible.length;
  const count = visible.length + (extra > 0 ? 1 : 0);
  const gap = 18;
  const startX = 100 - ((count - 1) * gap) / 2;

  let svg = "";
  visible.forEach((pillarCode, i) => {
    const { accent, name } = badgeConfigForDimension(pillarCode);
    const cx = startX + i * gap;
    svg +=
      `<path d="${hexPipPath(cx, PIP_Y, PIP_R)}" fill="${accent}" ` +
      `stroke="#FFFFFF" stroke-width="1" opacity=".92"><title>${escapeXml(name)}</title></path>`;
  });
  if (extra > 0) {
    const cx = startX + visible.length * gap;
    svg +=
      `<path d="${hexPipPath(cx, PIP_Y, PIP_R)}" fill="#2A2826" fill-opacity=".55" stroke="#FFFFFF" stroke-width="1"/>` +
      `<text x="${cx}" y="${PIP_Y + 3}" text-anchor="middle" fill="#FFFFFF" ` +
      `style="font-family:'Poppins',sans-serif;font-weight:700;font-size:8px">+${extra}</text>`;
  }
  return svg;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export interface CustomPathBadgeOpts {
  routeName: string;
  companyName: string;
  /** Pillar identifiers (Drive code, career-path, or assessment code) — any format `badgeConfigForDimension` accepts. */
  pillars: string[];
  size?: number;
  state?: BadgeState;
}

/** Renders a multi-pillar custom-path badge as a raw SVG markup string. SSR-safe. */
export function customPathBadgeSvgString(opts: CustomPathBadgeOpts): string {
  const base = badgeSvgString({
    picto: "bulb", // irrelevant — the medallion using it gets stripped below
    accent: FRAME_ACCENT,
    title: opts.routeName,
    micro: opts.companyName,
    state: opts.state ?? "earned",
    size: opts.size,
    compact: false,
  });

  const withoutMedallion = base.replace(MEDALLION_AND_PIPS_RE, "");
  const pipsRow = pillarPipsRow(opts.pillars);
  return withoutMedallion.replace("</svg>", `${pipsRow}</svg>`);
}
