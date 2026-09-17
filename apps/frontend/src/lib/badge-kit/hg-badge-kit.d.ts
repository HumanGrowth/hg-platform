/**
 * Ambient types for the vendored `hg-badge-kit.js` (kept byte-for-byte as shipped —
 * see README.md in "HG/Design/HG Badge System/badge-kit/"). It's a UMD-style script
 * that assigns `this.HGBadge = {...}` at module top level; under CJS/webpack `this`
 * is `module.exports`, so `import { HGBadge } from "./hg-badge-kit.js"` resolves to
 * that object. `svgString` never touches `document` — safe to call in Node (RSC,
 * route handlers). `render`/`mount` do use `document` and must stay client-only.
 */
declare module "./hg-badge-kit.js" {
  export interface RawBadgeOpts {
    picto?: string;
    accent?: string;
    title?: string;
    code?: string;
    divName?: string;
    micro?: string;
    rank?: number;
    state?: "earned" | "locked";
    size?: number;
    compact?: boolean;
  }

  export interface RawDimensionPreset {
    code: string;
    name: string;
    accent: string;
    picto: string;
  }

  export interface RawHGBadgeKit {
    render(opts: RawBadgeOpts): Element;
    mount(container: string | Element, opts: RawBadgeOpts): Element;
    svgString(opts: RawBadgeOpts): string;
    /** Kit's own dimension presets — DO NOT use, inconsistent with the app registry. */
    DIMENSIONS: Record<string, RawDimensionPreset>;
    assetBase: string;
  }

  const HGBadge: RawHGBadgeKit;
  export default HGBadge;
}

// Makes this file itself a module (required for TS's "arbitrary module
// extension" resolution of the ".js" specifier above) rather than a global script.
export {};
