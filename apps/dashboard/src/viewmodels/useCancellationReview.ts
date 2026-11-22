import { useReducer, useRef } from "react";
import { adminApi } from "@/services/arca-api";
import {
  initialReviewDialogState,
  initialReviewHistoryState,
  loadCancellationReviewHistory,
  reviewDialogReducer,
  reviewHistoryReducer,
  reviewKey,
  submitReviewAndRefresh,
  type CancellationReviewViewModel,
} from "./cancellation-review";

/**
 * ViewModel de la revisión de cancelaciones (dashboard-021): alta e historial con
 * `@arca/api-client`. Tras guardar vuelve a pedir el reporte con los mismos filtros (RN-05) y recarga el historial si su detalle sigue abierto;
 * no recalcula el nivel. Sin `localStorage` (RN-03).
 */
export function useCancellationReview(onSaved: () => void): CancellationReviewViewModel {
  const [dialog, dispatchDialog] = useReducer(reviewDialogReducer, initialReviewDialogState);
  const [history, dispatchHistory] = useReducer(reviewHistoryReducer, initialReviewHistoryState);
  const generation = useRef(0);
  const openHistoryKey = useRef<string | null>(null);

  openHistoryKey.current = history.key;

  return {
    dialog,
    history,
    actions: {
      open: (target) => dispatchDialog({ type: "open", target }),
      close: () => dispatchDialog({ type: "close" }),
      setStatus: (status) => dispatchDialog({ type: "status-changed", status }),
      setNote: (note) => dispatchDialog({ type: "note-changed", note }),
      submit: () => {
        void submitReviewAndRefresh({
          api: adminApi.reports,
          dispatchDialog,
          dispatchHistory,
          dialog,
          getOpenHistoryKey: () => openHistoryKey.current,
          startHistoryLoad: () => {
            const mine = ++generation.current;

            return () => generation.current === mine;
          },
          onSaved,
        });
      },
      toggleHistory: (target) => {
        if (history.key === reviewKey(target)) {
          generation.current += 1;
          dispatchHistory({ type: "close" });

          return;
        }

        const mine = ++generation.current;

        void loadCancellationReviewHistory(
          adminApi.reports,
          dispatchHistory,
          target,
          () => generation.current === mine,
        );
      },
    },
  };
}
