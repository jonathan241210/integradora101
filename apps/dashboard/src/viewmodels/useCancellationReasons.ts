import { useEffect, useReducer, useRef } from "react";
import { ticketSalesApi } from "@/services/arca-api";
import {
  cancellationReasonsReducer,
  initialCancellationReasonsState,
  loadCancellationReasons,
  type CancellationReasonsViewModel,
} from "./cancellation-reasons";

/**
 * Carga el catálogo cuando `enabled` pasa a verdadero (al abrir el diálogo de cancelar), para
 * no pedirlo a quien no tiene `tickets.cancel`. Sin reintento automático.
 */
export function useCancellationReasons(enabled: boolean): CancellationReasonsViewModel {
  const [state, dispatch] = useReducer(
    cancellationReasonsReducer,
    initialCancellationReasonsState,
  );
  const generation = useRef(0);
  const load = () => {
    const mine = ++generation.current;

    void loadCancellationReasons(ticketSalesApi, dispatch, () => generation.current === mine);
  };

  useEffect(() => {
    if (enabled && state.status === "idle") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, state.status]);

  return { state, reload: load };
}
