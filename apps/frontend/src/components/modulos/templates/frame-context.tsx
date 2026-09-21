"use client";

import * as React from "react";

import type { ElementBox } from "@/lib/hooks/useElementBox";

/** Lo que las plantillas necesitan saber del espacio que les tocó. */
export interface TemplateFrame {
  orientation: ElementBox["orientation"];
  landscape: boolean;
}

const DEFAULT: TemplateFrame = { orientation: "portrait", landscape: false };

export const TemplateFrameContext = React.createContext<TemplateFrame>(DEFAULT);

/** Orientación del marco donde se renderiza la plantilla (default: portrait). */
export function useTemplateFrame(): TemplateFrame {
  return React.useContext(TemplateFrameContext);
}
