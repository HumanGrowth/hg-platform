import { readFileSync } from "fs";
import { join } from "path";

import { ImageResponse } from "next/og";

// OG / social share image (1200×630, DS v2). Provisional: compone el isotipo
// PNG sobre el verde primario. Reemplazar por arte definitivo cuando llegue.
export const runtime = "nodejs";
export const alt = "Human Growth — crecimiento profesional holístico";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GREEN = "#4A7A54";
const CREAM = "#FAF3E8";
const AMBER = "#E8A030";

export default function OgImage() {
  const iso = readFileSync(join(process.cwd(), "public/brand/isotype-cream.png"));
  const isoSrc = `data:image/png;base64,${iso.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: GREEN,
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={isoSrc} alt="" width={132} height={115} />
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 88,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: CREAM,
              lineHeight: 1,
            }}
          >
            Human Growth
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 44, height: 6, borderRadius: 3, background: AMBER }} />
            <div style={{ fontSize: 34, color: CREAM, opacity: 0.92 }}>
              Crecimiento profesional en 6 dimensiones
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
