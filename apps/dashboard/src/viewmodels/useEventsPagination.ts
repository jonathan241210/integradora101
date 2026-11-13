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

export function useEventsPagination(
  items: EventDto[],
  pendingAction: PendingAction | null,
  actionBusy: boolean,
) {
  const [requestedPage, setRequestedPage] = useState(1);
  const result = getEventsPage(items, requestedPage, pendingAction);

  useEffect(() => {
    setRequestedPage(result.page);
  }, [result.page]);

  return {
    ...result,
    changePage: (page: number) => {
      if (!pendingAction && !actionBusy && Number.isInteger(page) && page >= 1 && page <= result.lastPage) {
        setRequestedPage(page);
      }
    },
  };
}
