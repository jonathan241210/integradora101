import { useEffect, useMemo, useReducer, useRef } from "react";
import { adminApi } from "@/services/arca-api";
import { imagePreview } from "@/services/image-preview";
import {
  acceptRequest,
  closeDecision,
  initialMemoryDetailState,
  memoryDetailReducer,
  openDecision,
  openDetail,
  rejectRequest,
  releaseImage,
  type MemoryDetailContext,
  type MemoryDetailViewModel,
} from "./memory-review";
import { createGeneration } from "./memory-review-shared";

/**
 * ViewModel del detalle y de la imagen de una petición. La sección lo monta
 * solo con una petición abierta, con `key` por id: cambiar de petición o
 * desmontar invalida lo pendiente y revoca la URL `blob:` (CA-17).
 */
export function useMemoryReviewDetail(id: number): MemoryDetailViewModel {
  const [state, dispatch] = useReducer(memoryDetailReducer, initialMemoryDetailState);
  const stateRef = useRef(state);
  const generation = useRef(createGeneration());

  stateRef.current = state;

  const context = (supersede: boolean): MemoryDetailContext => {
    const token = supersede ? generation.current.next() : generation.current.peek();

    return {
      api: adminApi,
      dispatch,
      preview: imagePreview,
      getState: () => stateRef.current,
      isCurrent: () => generation.current.isCurrent(token),
    };
  };

  useEffect(() => {
    void openDetail(context(true), id);

    return () => {
      generation.current.invalidate();
      releaseImage(imagePreview, stateRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return useMemo(
    () => ({
      state,
      actions: {
        reload: () => void openDetail(context(true), id),
        openAccept: () => openDecision({ dispatch }, "accept"),
        openReject: () => openDecision({ dispatch }, "reject"),
        closeDecision: () => closeDecision({ dispatch }),
        changeRejectReason: (reason) => dispatch({ type: "reject-reason-changed", reason }),
        toggleRejectField: (field) => dispatch({ type: "reject-field-toggled", field }),
        confirmDecision: () => {
          const pending = stateRef.current.pendingAction;

          if (pending === "accept") void acceptRequest(context(false), id);
          else if (pending === "reject") void rejectRequest(context(false), id);
        },
        dismissNotice: () => dispatch({ type: "notice-dismissed" }),
        dismissAlert: () => dispatch({ type: "alert-dismissed" }),
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, id],
  );
}
