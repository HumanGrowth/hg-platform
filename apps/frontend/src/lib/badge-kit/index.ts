/**
 * TS wrapper around the vendored HG Badge Kit (`hg-badge-kit.js`). We never
 * reimplement the SVG drawing here — this module only types the kit's inputs
 * and calls its own `svgString`. See `dimension-adapter.ts` for the app→kit
 * translation (canonical dimension pictos/accents/names), which is the only
 * other place allowed to know about this kit's option shape.
 */
import HGBadge from "./hg-badge-kit.js";

// The kit resolves its mosaic PNG as `assetBase + 'pattern-mosaic-blur.png'`.
// We ship that PNG at `/public/badge-kit/`, so point the kit there once — this
// is the only mutation of the kit's shared state and happens exactly once at
// module load, so it's safe under concurrent requests.
HGBadge.assetBase = "/badge-kit/";

export type BadgePicto = "rocket" | "star" | "chat" | "sprout" | "scales" | "bulb";
export type BadgeState = "earned" | "locked";

export interface BadgeOpts {
  picto: BadgePicto;
  accent: string;
  /** Text on the dark banner — typically the level name (e.g. "Sólido"). */
  title?: string;
  /** Division/dimension code shown alongside `divName` (or alone if `divName` is omitted). */
  code?: string;
  /** Division/dimension name — replaces the bare `code` display when present. */
  divName?: string;
  /** Small caption, used only when there's no `divName` and the badge isn't compact. */
  micro?: string;
  /** 0–6; the kit lights up floor(rank/2)+1 rank pips (max 3). */
  rank?: number;
  state?: BadgeState;
  /** Width in px — height is derived from the kit's fixed 200:218 ratio. */
  size?: number;
  /** No medallion, denser layout — for grids of many badges. */
  compact?: boolean;
}

/** Renders a single-pillar badge as a raw SVG markup string. SSR-safe (no `document`). */
export function badgeSvgString(opts: BadgeOpts): string {
  return HGBadge.svgString(opts);
}
