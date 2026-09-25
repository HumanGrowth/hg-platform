/**
 * The ONLY place that translates the app's dimension/level vocabulary
 * (lib/dimensions.ts, lib/dimension-styles.ts) into the badge kit's option
 * shape (BadgeOpts). The kit's own `HGBadge.DIMENSIONS` presets and numbering
 * (d1..d6, its own accents/pictos) are never used — they don't match the app.
 *
 * Conflicts resolved here (documented so nobody re-derives them from the kit):
 *  - Numbering: kit uses d1..d6 in an unrelated order; the app's canonical
 *    axis is the career-path code P1..P6 (see lib/dimensions.ts).
 *  - Pictos: kit ships its own accent+picto per d1..d6. The app's canonical
 *    picto per dimension is DIMENSION_ICON_SRC in dimension-styles.ts — most
 *    notably P5 = bulb (claridad) and P6 = scales (estabilidad), which is the
 *    OPPOSITE of the kit's own d5/d6 assignment. We mirror DIMENSION_ICON_SRC
 *    here rather than import it (it's a private const there) — keep this map
 *    in sync if that file's picto assignment ever changes.
 *  - Accent color: the kit wants a parseable hex string; the app's canonical
 *    hues live as CSS custom properties (`--dimension-p1`..`--dimension-p6`
 *    in app/globals.css), which can't be resolved without a DOM. We mirror
 *    their hex values here for the same reason — keep in sync with
 *    app/globals.css if those hues change.
 *  - Level naming: the app's level names are data-driven per dimension
 *    (`DimensionProgression.current_level_name` / `LevelProgress.name` from
 *    GET /me/progression) — NOT a fixed frontend enum. Prefer passing that
 *    real name through as `level` wherever it's available. The LEVEL_NAME_BY_CODE
 *    fallback below only covers callers that have a bare level_code (L1/L2/L3)
 *    and mirrors the backend seed (migrations/versions/CE-04_dimension_progression.py),
 *    which itself flags these three names as provisional.
 */
import {
  dimensionByCareerPath,
  type CareerPathCode,
} from "@/lib/dimensions";
import { dimensionBaseCode, driveToCareerPath } from "@/lib/dimension-styles";

import type { BadgePicto } from "./index";

const DIMENSION_PICTO: Record<CareerPathCode, BadgePicto> = {
  P1: "rocket",
  P2: "star",
  P3: "chat",
  P4: "sprout",
  P5: "bulb", // dimension-styles.ts DIMENSION_ICON_SRC — web-v3 decisión I
  P6: "scales",
};

// Mirrors --dimension-p1..p6 in app/globals.css (:root).
const DIMENSION_ACCENT_HEX: Record<CareerPathCode, string> = {
  P1: "#e8530a", // --hg-orange
  P2: "#c8a76e", // --hg-gold
  P3: "#4a7a54", // --hg-green
  P4: "#a8c4a0", // --hg-sage
  P5: "#2c3e50", // --hg-slate
  P6: "#e8a030", // --hg-amber
};

export interface DimensionBadgeConfig {
  picto: BadgePicto;
  accent: string;
  code: string;
  name: string;
}

/** Normalizes any dimension identifier the app uses (Drive code, career-path,
 * or assessment code incl. P6A/P6B) down to the canonical career-path. */
function normalizeCareerPath(code: string): CareerPathCode {
  return dimensionBaseCode(driveToCareerPath(code)) as CareerPathCode;
}

/**
 * Resolves a dimension identifier (Drive code like "CP", career-path like
 * "P1", or assessment code like "P6A") to its canonical badge config.
 */
export function badgeConfigForDimension(code: string): DimensionBadgeConfig {
  const careerPath = normalizeCareerPath(code);
  const dimension = dimensionByCareerPath(careerPath);
  return {
    picto: DIMENSION_PICTO[careerPath] ?? DIMENSION_PICTO.P1,
    accent: DIMENSION_ACCENT_HEX[careerPath] ?? DIMENSION_ACCENT_HEX.P1,
    code: dimension?.code ?? careerPath,
    name: dimension?.name ?? careerPath,
  };
}

// Fallback only — see file header. Real level names should come from the API.
const LEVEL_NAME_BY_CODE: Record<string, string> = {
  L1: "En crecimiento",
  L2: "Sólido",
  L3: "Ejemplar",
};

export interface LevelBadgeMeta {
  /** Level display name, for the kit's `title`. */
  title?: string;
  /** Rank pip value (0–6) for the kit's `rank`. */
  rank?: number;
}

/**
 * Maps a level_code (L1, L2, L3, …) to a badge title/rank fallback, for
 * callers that don't already have the resolved level name from the API.
 * Rank scale: the kit lights `floor(rank/2)+1` pips (max 3, matching today's
 * 3-level-per-dimension model) — so L1→rank 0 (1 pip), L2→rank 2 (2 pips),
 * L3→rank 4 (3 pips).
 */
export function levelBadgeMeta(levelCode: string | undefined): LevelBadgeMeta {
  if (!levelCode) return {};
  const match = /^L(\d+)$/i.exec(levelCode.trim());
  const n = match ? Number(match[1]) : undefined;
  return {
    title: LEVEL_NAME_BY_CODE[levelCode.trim().toUpperCase()],
    rank: n !== undefined ? (n - 1) * 2 : undefined,
  };
}

export interface ResolvedLevelBadge {
  dimensionCode: string;
  /** Full dimension name (ej. "Carrera") — nunca la sigla de 2 letras. */
  dimensionName: string;
  levelCode: string;
  levelTitle: string;
  rank: number;
  /** Texto explícito para mostrar — nunca la sigla cruda del backend
   * (CE-04_dimension_progression.py seedea name/description/unlock_hint
   * con la sigla Drive de 2 letras tal cual, ej. "CP · Sólido" — provisional
   * por diseño, ver comentario de archivo). Preferir SIEMPRE estos sobre
   * `MyBadge.name/description/unlock_hint` para badges de nivel. */
  displayName: string;
  displayDescription: string;
  displayUnlockHint: string;
}

// Backend seeds level badges as `level-<drive-code>-<level-code>`, e.g.
// "level-cp-l2" (see migrations/versions/CE-04_dimension_progression.py).
const LEVEL_BADGE_CODE_RE = /^level-([a-z]{2})-(l\d+)$/i;

/**
 * Recognizes a `MyBadge.code` that represents a dimension level badge and
 * resolves it to what <HgBadge> needs. Returns null for badges that don't
 * follow that convention (callers should fall back to <CatalogBadge>).
 */
export function resolveLevelBadge(code: string, name?: string): ResolvedLevelBadge | null {
  const match = LEVEL_BADGE_CODE_RE.exec(code);
  if (!match) return null;
  const [, dimensionDriveCode, levelCode] = match;
  const meta = levelBadgeMeta(levelCode);
  const nameAfterDot = name?.split("·")[1]?.trim();
  const levelTitle = nameAfterDot || meta.title || levelCode.toUpperCase();
  const dimensionName = badgeConfigForDimension(dimensionDriveCode).name;

  return {
    dimensionCode: dimensionDriveCode.toUpperCase(),
    dimensionName,
    levelCode: levelCode.toUpperCase(),
    levelTitle,
    rank: meta.rank ?? 0,
    displayName: `${dimensionName} · ${levelTitle}`,
    displayDescription: `Reconoce que alcanzaste el nivel "${levelTitle}" en tu dimensión de ${dimensionName}.`,
    displayUnlockHint: `Se desbloquea al alcanzar el nivel ${levelTitle} en ${dimensionName}.`,
  };
}

export interface ResolvedPillarBadge {
  dimensionCode: string;
  /** Nombre completo de la dimensión (ej. "Carrera"). */
  dimensionName: string;
  pillarCode: string;
  /** Nombre del área tal como se llama en la app — va en el banner del badge. */
  areaName: string;
  displayName: string;
  displayDescription: string;
  displayUnlockHint: string;
}

// El backend siembra los badges de área como `pillar-<drive-code>-<pillar-code>`,
// ej. "pillar-cp-p1" (`pillar_badge_code` en badges/progression.py).
const PILLAR_BADGE_CODE_RE = /^pillar-([a-z]{2})-([a-z0-9]+)$/i;

/**
 * Reconoce un `MyBadge.code` de área/pilar y lo resuelve a lo que necesita
 * <HgBadge> (mismo arte del design system que los badges de nivel: picto y
 * color de la dimensión, con el nombre del área en el banner). `name` es el
 * nombre explícito del área que ya manda el backend. Null si no sigue la
 * convención.
 */
export function resolvePillarBadge(code: string, name?: string): ResolvedPillarBadge | null {
  const match = PILLAR_BADGE_CODE_RE.exec(code);
  if (!match) return null;
  const [, dimensionDriveCode, pillarCode] = match;
  const dimensionName = badgeConfigForDimension(dimensionDriveCode).name;
  const areaName = name?.trim() || pillarCode.toUpperCase();
  return {
    dimensionCode: dimensionDriveCode.toUpperCase(),
    dimensionName,
    pillarCode: pillarCode.toUpperCase(),
    areaName,
    displayName: areaName,
    displayDescription: `Completaste todas las unidades del área ${areaName} de ${dimensionName}.`,
    displayUnlockHint: `Completá todas las unidades del área ${areaName}.`,
  };
}
