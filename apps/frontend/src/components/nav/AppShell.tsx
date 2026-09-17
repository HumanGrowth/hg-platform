"use client";

import * as React from "react";

import { SpatialCanvas } from "@/components/glass/SpatialCanvas";

/**
 * AppShell — único punto donde vive el chrome de la app autenticada.
 * La app es siempre glassmorphic (light o dark, ver ThemeProvider): el
 * shell es SIEMPRE SpatialCanvas, que ya sabe pintar ambas variantes vía
 * los tokens [data-theme="light"|"dark"] de glass.css.
 *
 * El SideNav/TopBar/BottomNav "clásicos" siguen en el repo (código
 * muerto por ahora) por si hiciera falta un fallback plano más adelante,
 * pero no son alcanzables desde la UI.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return <SpatialCanvas>{children}</SpatialCanvas>;
}
