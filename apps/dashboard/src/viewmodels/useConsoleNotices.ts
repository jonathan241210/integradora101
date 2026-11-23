import { useEffect, useReducer } from "react";
import { adminApi } from "@/services/arca-api";
import {
  canSeeConsoleNotices,
  consoleNoticesReducer,
  initialConsoleNoticesState,
  loadConsoleNotices,
  markConsoleNoticesRead,
  type ConsoleNoticesViewModel,
} from "./console-notices";

/**
 * Avisos de consola de la sesión (dashboard-017). Solo consulta con
 * `users.manage` (CA-12), una vez al iniciar sesión (no al cambiar de sección).
 */
export function useConsoleNotices(
  accountId: string | number | null,
  permissions: readonly string[],
): ConsoleNoticesViewModel {
  const [state, dispatch] = useReducer(consoleNoticesReducer, initialConsoleNoticesState);
  const enabled = accountId !== null && canSeeConsoleNotices(permissions);

  useEffect(() => {
    if (!enabled) {
      dispatch({ type: "reset" });
      return;
    }

    let current = true;

    void loadConsoleNotices(adminApi, dispatch, () => current);

    return () => {
      current = false;
    };
  }, [enabled, accountId]);

  return {
    state,
    actions: {
      markRead: (ids) => void markConsoleNoticesRead(adminApi, ids),
    },
  };
}
