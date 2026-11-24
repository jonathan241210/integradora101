/** Lógica pura de la paginación compartida (dashboard-020 CA-43 a CA-48; movida a @arca/ui en la rev. (d)). */

export type PaginationInput =
  | { page: number; lastPage: number; total: number; busy?: boolean }
  | { page: number; hasMore: boolean; busy?: boolean };

export type PaginationItem =
  | { type: "page"; number: number; current: boolean }
  | { type: "gap"; key: string };

export type PaginationModel = {
  mode: "total" | "has-more";
  page: number;
  summary: string;
  previousDisabled: boolean;
  nextDisabled: boolean;
  previousPage: number;
  nextPage: number;
  items: PaginationItem[];
};

/** Páginas visibles: todas hasta 7; si no, primera, última y la actual con vecinas. */
export function pageItems(page: number, lastPage: number): PaginationItem[] {
  const last = Math.max(1, lastPage);
  const current = Math.min(Math.max(1, page), last);
  const numbers = new Set<number>();
  if (last <= 7) {
    for (let n = 1; n <= last; n += 1) numbers.add(n);
  } else {
    [1, last, current - 1, current, current + 1].forEach((n) => {
      if (n >= 1 && n <= last) numbers.add(n);
    });
  }
  const items: PaginationItem[] = [];
  let previous = 0;
  for (const number of [...numbers].sort((a, b) => a - b)) {
    if (number - previous > 1) items.push({ type: "gap", key: `gap-${previous}` });
    items.push({ type: "page", number, current: number === current });
    previous = number;
  }
  return items;
}

export function buildPagination(input: PaginationInput): PaginationModel {
  const busy = input.busy === true;
  const page = Math.max(1, Math.floor(input.page) || 1);
  if ("hasMore" in input) {
    return {
      mode: "has-more",
      page,
      summary: `Página ${page}`,
      previousDisabled: busy || page <= 1,
      nextDisabled: busy || !input.hasMore,
      previousPage: page - 1,
      nextPage: page + 1,
      items: [],
    };
  }
  const last = Math.max(1, input.lastPage);
  return {
    mode: "total",
    page,
    summary: `Página ${page} de ${last} · ${input.total} en total`,
    previousDisabled: busy || page <= 1,
    nextDisabled: busy || page >= last,
    previousPage: page - 1,
    nextPage: page + 1,
    items: pageItems(page, last),
  };
}
