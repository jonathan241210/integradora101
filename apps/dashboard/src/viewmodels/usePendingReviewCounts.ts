import { useEffect, useReducer, useRef } from "react";
import { adminApi } from "@/services/arca-api";
import type { DashboardSection } from "./dashboard-shell";
import {
  canSeePendingCounts,
  createPendingQueryMemo,
  initialPendingReviewState,
  pendingReviewReducer,
  refreshPendingCounts,
  type PendingReviewState,
} from "./pending-review";

/**
 * Conteos de pendientes (dashboard-018). Consulta al tener sesión y al cambiar
 * de sección; sin sondeo ni temporizadores (CA-07, CA-08). Sin permisos no
 * consulta (CA-11). Los datos cambian de dueño con `accountId` (RN-02).
 */
export function usePendingReviewCounts(
  accountId: string | number | null,
  permissions: readonly string[],
  activeSection: DashboardSection,
): PendingReviewState {
  const [state, dispatch] = useReducer(pendingReviewReducer, initialPendingReviewState);
  const memo = useRef(createPendingQueryMemo());
  const enabled = accountId !== null && canSeePendingCounts(permissions);
  const permissionKey = permissions.join(",");

  useEffect(() => {
    memo.current = createPendingQueryMemo();
    dispatch({ type: "reset" });
  }, [accountId, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const owner = memo.current;
    void refreshPendingCounts(adminApi, owner, dispatch, {
      permissions,
      now: Date.now(),
      isCurrent: () => memo.current === owner,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, accountId, activeSection, permissionKey]);

  return state;
}
