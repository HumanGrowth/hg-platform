/**
 * Server-only variant of badgeSvgString/customPathBadgeSvgString that inlines
 * the mosaic PNG as a data: URI, so the resulting SVG is fully self-contained
 * (no relative asset fetch) — for persisted/shared/emailed badges. Import this
 * ONLY from server code (route handlers, server actions); it reads the PNG
 * from disk via `node:fs` and must never end up in a client bundle. Client
 * components should use `badgeSvgString` from "./index" instead, which relies
 * on the kit's relative `assetBase` pointing at the public asset.
 */
import fs from "node:fs";
import path from "node:path";

import { badgeSvgString, type BadgeOpts } from "./index";
import { customPathBadgeSvgString, type CustomPathBadgeOpts } from "./custom-path-badge";

const MOSAIC_HREF_RE = /href="[^"]*pattern-mosaic-blur\.png"/g;

let cachedDataUri: string | null = null;

function mosaicDataUri(): string {
  if (cachedDataUri) return cachedDataUri;
  const pngPath = path.join(process.cwd(), "public", "badge-kit", "pattern-mosaic-blur.png");
  const base64 = fs.readFileSync(pngPath).toString("base64");
  cachedDataUri = `data:image/png;base64,${base64}`;
  return cachedDataUri;
}

function inlineMosaic(svg: string): string {
  return svg.replace(MOSAIC_HREF_RE, `href="${mosaicDataUri()}"`);
}

export function badgeSvgStringInline(opts: BadgeOpts): string {
  return inlineMosaic(badgeSvgString(opts));
}

export function customPathBadgeSvgStringInline(opts: CustomPathBadgeOpts): string {
  return inlineMosaic(customPathBadgeSvgString(opts));
}
