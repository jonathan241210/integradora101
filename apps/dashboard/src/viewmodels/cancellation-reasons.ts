import { describeApiError } from "./api-errors";
import type { CancellationReasonDto, TicketSalesApi } from "./ticket-types";

/**
 * Catálogo cerrado de motivos de cancelación (dashboard-016 CA-18). Lo entrega la API
 * (`api-022` CA-10): el cliente no fija códigos, etiquetas ni la política de comentario.
 */
export type CancellationReasonsState = {
  status: "idle" | "loading" | "ready" | "error";
  reasons: CancellationReasonDto[];
  error: string;
};

export type CancellationReasonsAction =
  | { type: "load-started" }
  | { type: "loaded"; reasons: CancellationReasonDto[] }
  | { type: "load-failed"; message: string };

export const initialCancellationReasonsState: CancellationReasonsState = {
  status: "idle",
  reasons: [],
  error: "",
};

export function cancellationReasonsReducer(
  state: CancellationReasonsState,
  action: CancellationReasonsAction,
): CancellationReasonsState {
  switch (action.type) {
    case "load-started":
      return { ...state, status: "loading", error: "" };
    case "loaded":
      return { status: "ready", reasons: action.reasons, error: "" };
    case "load-failed":
      return { ...state, status: "error", error: action.message };
    default:
      return state;
  }
}

export async function loadCancellationReasons(
  api: Pick<TicketSalesApi, "tickets">,
  dispatch: (action: CancellationReasonsAction) => void,
  isCurrent: () => boolean = () => true,
): Promise<void> {
  dispatch({ type: "load-started" });

  try {
    const reasons = await api.tickets.cancellationReasons();

    if (isCurrent()) dispatch({ type: "loaded", reasons });
  } catch (error) {
    const described = describeApiError(error);

    if (isCurrent() && !described.unauthorized) {
      dispatch({ type: "load-failed", message: described.message });
    }
  }
}

/** Política de comentario del motivo elegido, tal como la entrega la API. */
export function commentRequiredFor(
  reasons: CancellationReasonDto[],
  code: string,
): boolean {
  return reasons.find((reason) => reason.code === code)?.comment_policy === "required";
}

export type CancellationReasonsViewModel = {
  state: CancellationReasonsState;
  reload: () => void;
};
