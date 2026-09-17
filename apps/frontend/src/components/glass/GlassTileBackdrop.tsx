"use client";

import * as React from "react";

/**
 * Biblioteca de tiles del artifact glass — copiada a public/brand/tiles/
 * desde HG/Artifacts/Renovación glassmorphic HG/assets/tiles/.
 */
const TILE_FILES = [
  "tile_A1.svg",
  "tile_B2.svg",
  "tile_C3.svg",
  "tile_D4.svg",
  "tile_E1.svg",
  "tile_F2.svg",
  "tile_G3.svg",
  "tile_H4.svg",
];

const TILE_COUNT = 5;

interface PlacedTile {
  key: string;
  src: string;
  top: string;
  left: string;
  size: number;
  rotate: number;
  opacity: number;
}

function pickRandomTiles(): PlacedTile[] {
  const shuffled = [...TILE_FILES].sort(() => Math.random() - 0.5);
  return Array.from({ length: TILE_COUNT }, (_, i) => {
    const src = shuffled[i % shuffled.length];
    return {
      key: `${src}-${i}`,
      src: `/brand/tiles/${src}`,
      top: `${Math.round(Math.random() * 85)}%`,
      left: `${Math.round(Math.random() * 85)}%`,
      size: Math.round(260 + Math.random() * 220),
      rotate: Math.round(Math.random() * 60 - 30),
      opacity: Number((0.05 + Math.random() * 0.06).toFixed(3)),
    };
  });
}

/**
 * Fondo de tema glass (Sprint Glass · PASO 1, revisión) — en vez del
 * mosaico repetido, dispersa tiles aleatorios de la biblioteca del artifact
 * (assets/tiles/), muy desenfocados, detrás de los blobs de color
 * (glass.css `body::before`) y siempre detrás del contenido (z-index -1,
 * pointer-events: none).
 *
 * La selección es aleatoria SOLO en cliente (useEffect, no en el render de
 * SSR) para no generar mismatch de hidratación — recalcula en cada mount
 * (cada carga de página). Se desactiva bajo prefers-reduced-transparency /
 * prefers-contrast, igual que el resto de la capa glass.
 */
export function GlassTileBackdrop() {
  const [tiles, setTiles] = React.useState<PlacedTile[] | null>(null);

  React.useEffect(() => {
    const reduceTransparency = window.matchMedia(
      "(prefers-reduced-transparency: reduce), (prefers-contrast: more)",
    ).matches;
    if (reduceTransparency) return;
    setTiles(pickRandomTiles());
  }, []);

  if (!tiles) return null;

  return (
    <div className="pointer-events-none fixed inset-0 -z-[1] overflow-hidden" aria-hidden>
      {tiles.map((t) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={t.key}
          src={t.src}
          alt=""
          width={t.size}
          height={t.size}
          style={{
            position: "absolute",
            top: t.top,
            left: t.left,
            width: t.size,
            height: t.size,
            opacity: t.opacity,
            transform: `rotate(${t.rotate}deg)`,
            filter: "blur(38px)",
          }}
        />
      ))}
    </div>
  );
}
