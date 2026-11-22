import type { CancellationLevelDto } from "./admin-types";

/**
 * Niveles del semáforo para la leyenda tal como los envía la API en `data.levels[]`
 * (dashboard-021 CA-24 y RN-01): el umbral de «Atención» es configurable en la API
 * (`attention_min_signals`), así que el cliente no fija ni calcula condiciones.
 */
export type LegendLevel = {
  code: string;
  label: string;
  condition: string;
  tone: "success" | "warning" | "danger";
};

const levelTone: Record<string, LegendLevel["tone"]> = {
  normal: "success",
  review: "warning",
  attention: "danger",
};

/** Solo presenta lo que llega; sin `levels` (o vacío) devuelve `[]` y no se inventan umbrales. */
export function legendLevelsFrom(levels: CancellationLevelDto[] | undefined): LegendLevel[] {
  return (levels ?? []).map((level) => ({
    code: level.code,
    label: level.label,
    condition: level.condition,
    tone: levelTone[level.code] ?? "warning",
  }));
}

export const legendStorageKey = "arca.dashboard.cancellation-legend-open";

/** Preferencia de la leyenda: abierta salvo que el usuario la haya plegado (CA-26). */
export function readLegendOpen(): boolean {
  try {
    return globalThis.localStorage?.getItem(legendStorageKey) !== "closed";
  } catch {
    return true;
  }
}

export function writeLegendOpen(open: boolean): void {
  try {
    globalThis.localStorage?.setItem(legendStorageKey, open ? "open" : "closed");
  } catch {
    // Sin almacenamiento disponible: la leyenda sigue funcionando sin recordar la preferencia.
  }
}
