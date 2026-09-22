"use client";

import * as React from "react";

/**
 * ¿Mostrar la metáfora grande del pilar como header de la pantalla de bloque?
 * Sólo en el primer bloque de la unit (ahí cumple su rol de "ubicación", como en
 * la apertura); en los siguientes el eyebrow propio del bloque alcanza y evitamos
 * repetir el mismo ícono grande en cada pantalla. Default `true` = comportamiento
 * histórico para cualquier caller que no lo indique.
 */
export const PillarMarkContext = React.createContext<boolean>(true);

export function usePillarMark(): boolean {
  return React.useContext(PillarMarkContext);
}

/** Índice del primer bloque que usa BlockScreenLayout (el primero que no es video). */
export function firstScreenBlockIndex(blocks: { block_type: string }[]): number {
  return blocks.findIndex((b) => !b.block_type.startsWith("video"));
}

/** ¿El bloque `index` es el que lleva la metáfora del pilar? (sin bloques de pantalla → sí). */
export function isPillarMarkBlock(blocks: { block_type: string }[], index: number): boolean {
  const first = firstScreenBlockIndex(blocks);
  return first === -1 || index === first;
}
