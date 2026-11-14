import { useEffect, useMemo, useReducer, useRef } from "react";
import { adminApi } from "@/services/arca-api";
import { imagePreview } from "@/services/image-preview";
import {
  acceptRequest,
  cancelRequestEdit,
  chooseRequestPhoto,
  clearRequestPhoto,
  closeRequestDetail,
  initialSpeciesRequestsState,
  loadRequestList,
  openRequest,
  rejectRequest,
  releaseDetailUrls,
  reloadRequest,
  requestIsDirty,
  saveRequestEdit,
  speciesRequestsReducer,
  startRequestEdit,
  type RequestsContext,
  type SpeciesRequestsViewModel,
} from "./species-requests";
import { createGeneration } from "./species-publication-shared";

/**
 * ViewModel de «Solicitudes de especies». Lista y detalle tienen contador de
 * generación propio: una respuesta tardía no escribe en el estado (CA-12).
 */
export function useSpeciesRequests(): SpeciesRequestsViewModel {
  const [state, dispatch] = useReducer(speciesRequestsReducer, initialSpeciesRequestsState);
  const stateRef = useRef(state);
  const listGeneration = useRef(createGeneration());
  const detailGeneration = useRef(createGeneration());

  stateRef.current = state;

  const context = (
    generation: ReturnType<typeof createGeneration>,
    supersede = true,
  ): RequestsContext => {
    const token = supersede ? generation.next() : generation.peek();

    return {
      api: adminApi,
      dispatch,
      preview: imagePreview,
      getState: () => stateRef.current,
      isCurrent: () => generation.isCurrent(token),
    };
  };
  // Abrir, cerrar y recargar sustituyen lo que está en curso; las demás
  // acciones del detalle conservan el token vigente.
  const detailContext = () => context(detailGeneration.current);
  const sameDetail = () => context(detailGeneration.current, false);

  useEffect(() => {
    void loadRequestList(context(listGeneration.current), {
      filter: state.filter,
      page: state.page,
    });

    return () => listGeneration.current.invalidate();
  }, [state.filter, state.page]);

  // Al desmontar la sección se revocan las URL `blob:` (RN-10).
  useEffect(
    () => () => {
      detailGeneration.current.invalidate();
      releaseDetailUrls(imagePreview, stateRef.current);
    },
    [],
  );

  return useMemo(
    () => ({
      state,
      dirty: requestIsDirty(state),
      actions: {
        changeFilter: (filter) => dispatch({ type: "filter-changed", filter }),
        goToPage: (page) => dispatch({ type: "page-changed", page }),
        reload: () =>
          void loadRequestList(context(listGeneration.current), {
            filter: stateRef.current.filter,
            page: stateRef.current.page,
          }),
        open: (id) => void openRequest(detailContext(), id),
        close: () => closeRequestDetail(detailContext()),
        reloadDetail: () => {
          const id = stateRef.current.selectedId;

          if (id !== null) void reloadRequest(detailContext(), id);
        },
        startEdit: () => startRequestEdit(sameDetail()),
        cancelEdit: () => cancelRequestEdit(sameDetail()),
        changeDraft: (changes) => dispatch({ type: "draft-changed", changes }),
        toggleField: (key) => {
          const draft = stateRef.current.draft;

          if (!draft) return;

          const selected = draft.published_fields.includes(key)
            ? draft.published_fields.filter((item) => item !== key)
            : [...draft.published_fields, key];

          dispatch({ type: "draft-changed", changes: { published_fields: selected } });
        },
        choosePhoto: (file) => chooseRequestPhoto(sameDetail(), file),
        clearPhoto: () => clearRequestPhoto(sameDetail()),
        save: () => void saveRequestEdit(sameDetail()),
        openDecision: (decision) => dispatch({ type: "decision-opened", decision }),
        closeDecision: () => dispatch({ type: "decision-closed" }),
        changeRejectReason: (reason) => dispatch({ type: "reject-reason-changed", reason }),
        confirmDecision: () => {
          const current = stateRef.current;

          if (current.pendingAction === "reject") {
            void rejectRequest(sameDetail(), current.rejectReason);
          } else if (current.pendingAction) {
            void acceptRequest(sameDetail(), current.pendingAction === "accept-publish");
          }
        },
        dismissNotice: () => dispatch({ type: "notice-dismissed" }),
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state],
  );
}
