import { useEffect, useState } from "react";
import type { EventDto } from "./admin-types";
import type { PendingAction } from "./inline-list";

const pageSize = 4;

export function getEventsPage(
  items: EventDto[],
  requestedPage: number,
  pendingAction: PendingAction | null,
) {
  const lastPage = Math.max(1, Math.ceil(items.length / pageSize));
  const pendingIndex = pendingAction
    ? items.findIndex((item) => item.id === pendingAction.id)
    : -1;
  const page = pendingIndex >= 0
    ? Math.floor(pendingIndex / pageSize) + 1
    : Math.min(Math.max(1, requestedPage), lastPage);

  return {
    page,
    lastPage,
    items: items.slice((page - 1) * pageSize, page * pageSize),
  };
}

/** Página (1-based) que contiene el evento, o null si no está en la lista. */
export function pageOfEvent(items: EventDto[], id: number): number | null {
  const index = items.findIndex((item) => item.id === id);

  return index < 0 ? null : Math.floor(index / pageSize) + 1;
}

export function useEventsPagination(
  items: EventDto[],
  pendingAction: PendingAction | null,
  actionBusy: boolean,
  focus: { id: number; nonce: number } | null = null,
) {
  const [requestedPage, setRequestedPage] = useState(1);
  const result = getEventsPage(items, requestedPage, pendingAction);

  useEffect(() => {
    setRequestedPage(result.page);
  }, [result.page]);

  // Buscador global (CA-20): salta a la página que contiene el evento buscado.
  useEffect(() => {
    if (!focus) return;
    const target = pageOfEvent(items, focus.id);

    if (target !== null) setRequestedPage(target);
    // Solo con un nuevo enfoque o cuando llega la lista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.nonce, focus?.id, items]);

  return {
    ...result,
    changePage: (page: number) => {
      if (!pendingAction && !actionBusy && Number.isInteger(page) && page >= 1 && page <= result.lastPage) {
        setRequestedPage(page);
      }
    },
  };
}
