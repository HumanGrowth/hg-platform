import { NextResponse } from "next/server";

import { badgeConfigForDimension, levelBadgeMeta } from "@/lib/badge-kit/dimension-adapter";
import { badgeSvgStringInline, customPathBadgeSvgStringInline } from "@/lib/badge-kit/server";
import type { BadgeState } from "@/lib/badge-kit";

// Needs Node's fs to inline the mosaic PNG as a data URI (self-contained SVG).
export const runtime = "nodejs";

const MAX_SIZE = 512;
const MIN_SIZE = 32;
const MAX_PILLARS = 12;
const MAX_TEXT_LEN = 80;

function parseSize(raw: string | null): number | undefined {
  if (raw === null) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < MIN_SIZE || n > MAX_SIZE) return undefined;
  return Math.round(n);
}

function parseState(raw: string | null): BadgeState {
  return raw === "locked" ? "locked" : "earned";
}

function badRequest(detail: string) {
  return NextResponse.json({ detail }, { status: 400 });
}

/**
 * GET /api/badge — cached, self-contained badge SVGs.
 *   ?dimension=CP&level=L2&rank=3&state=earned      → single-pillar badge
 *   ?route=<name>&company=<name>&pillars=CP,PR,SA   → multi-pillar custom-path badge
 * Cached forever (querystring is the cache key) — each unique badge renders once.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const size = parseSize(searchParams.get("size"));
  if (searchParams.has("size") && size === undefined) {
    return badRequest(`size must be between ${MIN_SIZE} and ${MAX_SIZE}`);
  }
  const state = parseState(searchParams.get("state"));

  const routeName = searchParams.get("route");
  if (routeName !== null) {
    const companyName = searchParams.get("company") ?? "";
    const pillarsRaw = searchParams.get("pillars") ?? "";
    const pillars = pillarsRaw
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    if (!routeName.trim() || routeName.length > MAX_TEXT_LEN) {
      return badRequest("route must be a non-empty string up to 80 chars");
    }
    if (companyName.length > MAX_TEXT_LEN) {
      return badRequest("company must be up to 80 chars");
    }
    if (pillars.length === 0 || pillars.length > MAX_PILLARS) {
      return badRequest(`pillars must list between 1 and ${MAX_PILLARS} codes`);
    }

    const svg = customPathBadgeSvgStringInline({
      routeName,
      companyName,
      pillars,
      size,
      state,
    });
    return svgResponse(svg);
  }

  const dimension = searchParams.get("dimension");
  if (!dimension) {
    return badRequest("dimension (or route) is required");
  }

  const config = badgeConfigForDimension(dimension);
  const levelParam = searchParams.get("level");
  const meta = levelBadgeMeta(levelParam ?? undefined);
  const rankParam = searchParams.get("rank");
  const rank = rankParam !== null && Number.isFinite(Number(rankParam)) ? Number(rankParam) : meta.rank;

  const svg = badgeSvgStringInline({
    picto: config.picto,
    accent: config.accent,
    code: config.code,
    divName: config.name,
    title: meta.title,
    rank,
    state,
    size,
  });
  return svgResponse(svg);
}

function svgResponse(svg: string) {
  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
