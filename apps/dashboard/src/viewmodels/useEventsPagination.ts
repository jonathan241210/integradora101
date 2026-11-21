import { useEffect, useState } from "react";
import type { EventDto } from "./admin-types";
import type { PendingAction } from "./inline-list";

const pageSize = 4;

export function getContentPage<T extends { id: number }>(
  items: T[],
  requestedPage: number,
  pendingAction: PendingAction | null,
  size: number,
) {
  const lastPage = Math.max(1, Math.ceil(items.length / size));
  const pendingIndex = pendingAction
    ? items.findIndex((item) => item.id === pendingAction.id)
    : -1;
  const page = pendingIndex >= 0
    ? Math.floor(pendingIndex / size) + 1
    : Math.min(Math.max(1, requestedPage), lastPage);

  return {
    page,
    lastPage,
    items: items.slice((page - 1) * size, page * size),
  };
}

/** Página (1-based) que contiene el evento, o null si no está en la lista. */
function pageOfItem(items: { id: number }[], id: number, size: number): number | null {
  const index = items.findIndex((item) => item.id === id);

  return index < 0 ? null : Math.floor(index / size) + 1;
}

export function getEventsPage(items: EventDto[], requestedPage: number, pendingAction: PendingAction | null) {
  return getContentPage(items, requestedPage, pendingAction, pageSize);
}

export function pageOfEvent(items: EventDto[], id: number) {
  return pageOfItem(items, id, pageSize);
}

export function useContentPagination<T extends { id: number }>(
  items: T[],
  pendingAction: PendingAction | null,
  actionBusy: boolean,
  size: number,
  focus: { id: number; nonce: number } | null = null,
) {
  const [requestedPage, setRequestedPage] = useState(1);
  const result = getContentPage(items, requestedPage, pendingAction, size);

  useEffect(() => {
    setRequestedPage(result.page);
  }, [result.page]);

  // Buscador global (CA-20): salta a la página que contiene el evento buscado.
  useEffect(() => {
    if (!focus) return;
    const target = pageOfItem(items, focus.id, size);

    if (target !== null) setRequestedPage(target);
    // Solo con un nuevo enfoque o cuando llega la lista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.nonce, focus?.id, items, size]);

  return {
    ...result,
    changePage: (page: number) => {
      const confirmingItem = pendingAction && items.some((item) => item.id === pendingAction.id);

      if (!confirmingItem && !actionBusy && Number.isInteger(page) && page >= 1 && page <= result.lastPage) {
        setRequestedPage(page);
      }
    },
  };
}

export function useEventsPagination(
  items: EventDto[],
  pendingAction: PendingAction | null,
  actionBusy: boolean,
  focus: { id: number; nonce: number } | null = null,
) {
  return useContentPagination(items, pendingAction, actionBusy, pageSize, focus);
}
