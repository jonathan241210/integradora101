import type { CancellationTrafficLightDto } from "./admin-types";

/** Orden de presentación del nivel: Atención, Revisar, Normal; sin cajero al final (dashboard-021 CA-18). */
const levelRank: Record<string, number> = { attention: 0, review: 1, normal: 2 };

/**
 * Ordena y filtra el semáforo solo para presentarlo (CA-18, CA-21): no decide niveles, usa el
 * que manda la API. Dentro de cada nivel, fecha descendente; el grupo sin cajero va al final.
 */
export function arrangeTrafficLightRows(
  rows: CancellationTrafficLightDto[],
  options: { onlyToReview?: boolean } = {},
): CancellationTrafficLightDto[] {
  const rank = (row: CancellationTrafficLightDto) =>
    row.cashier_id === null || row.traffic_light === null ? 3 : (levelRank[row.traffic_light] ?? 3);

  return rows
    // «Solo por revisar» oculta Normal y también «Sin cajero registrado» (no hay a quién revisar).
    .filter(
      (row) =>
        !options.onlyToReview || (row.cashier_id !== null && row.traffic_light !== "normal"),
    )
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const byLevel = rank(a.row) - rank(b.row);

      if (byLevel !== 0) return byLevel;
      if (a.row.date !== b.row.date) return a.row.date < b.row.date ? 1 : -1;

      return a.index - b.index;
    })
    .map(({ row }) => row);
}
