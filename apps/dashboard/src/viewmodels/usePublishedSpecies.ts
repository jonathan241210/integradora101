import { useEffect, useMemo, useReducer, useRef } from "react";
import { adminApi } from "@/services/arca-api";
import { imagePreview } from "@/services/image-preview";
import {
  cancelPublishedEdit,
  choosePublishedPhoto,
  clearPublishedPhoto,
  closePublishedDetail,
  initialPublishedSpeciesState,
  loadPublishedList,
  openPublished,
  publishedIsDirty,
  publishedSpeciesReducer,
  releasePublishedDetailUrls,
  releaseThumbs,
  reloadPublished,
  removePublication,
  republishSpecies,
  savePublishedEdit,
  startPublishedEdit,
  unpublishSpecies,
  type PublishedContext,
  type PublishedSpeciesViewModel,
} from "./published-species";
import { createGeneration } from "./species-publication-shared";

/**
 * ViewModel de «Especies publicadas». Lista y detalle tienen contador de
 * generación propio: una respuesta tardía no escribe en el estado.
 */
export function usePublishedSpecies(): PublishedSpeciesViewModel {
  const [state, dispatch] = useReducer(publishedSpeciesReducer, initialPublishedSpeciesState);
  const stateRef = useRef(state);
  const listGeneration = useRef(createGeneration());
  const detailGeneration = useRef(createGeneration());

  stateRef.current = state;

  const loadList = () =>
    void loadPublishedList(context(listGeneration.current), {
      status: stateRef.current.statusFilter,
      category: stateRef.current.category,
      page: stateRef.current.page,
    });

  const context = (
    generation: ReturnType<typeof createGeneration>,
    supersede = true,
  ): PublishedContext => {
    const token = supersede ? generation.next() : generation.peek();

    return {
      api: adminApi,
      dispatch,
      preview: imagePreview,
      getState: () => stateRef.current,
      isCurrent: () => generation.isCurrent(token),
      refreshList: loadList,
    };
  };
  const detailContext = () => context(detailGeneration.current);
  const sameDetail = () => context(detailGeneration.current, false);

  useEffect(() => {
    loadList();

    return () => listGeneration.current.invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.statusFilter, state.category, state.page]);

  // Al desmontar la sección se revocan las URL `blob:` (RN-10).
  useEffect(
    () => () => {
      detailGeneration.current.invalidate();
      releasePublishedDetailUrls(imagePreview, stateRef.current);
      releaseThumbs(imagePreview, stateRef.current);
    },
    [],
  );

  return useMemo(
    () => ({
      state,
      dirty: publishedIsDirty(state),
      actions: {
        changeStatus: (status) => dispatch({ type: "status-changed", status }),
        changeCategory: (category) => dispatch({ type: "category-changed", category }),
        goToPage: (page) => dispatch({ type: "page-changed", page }),
        reload: loadList,
        open: (id) => void openPublished(detailContext(), id),
        close: () => closePublishedDetail(detailContext()),
        reloadDetail: () => {
          const id = stateRef.current.selectedId;

          if (id !== null) void reloadPublished(detailContext(), id);
        },
        startEdit: () => startPublishedEdit(sameDetail()),
        cancelEdit: () => cancelPublishedEdit(sameDetail()),
        changeDraft: (changes) => dispatch({ type: "draft-changed", changes }),
        toggleField: (key) => {
          const draft = stateRef.current.draft;

          if (!draft) return;

          const selected = draft.published_fields.includes(key)
            ? draft.published_fields.filter((item) => item !== key)
            : [...draft.published_fields, key];

          dispatch({ type: "draft-changed", changes: { published_fields: selected } });
        },
        choosePhoto: (file) => choosePublishedPhoto(sameDetail(), file),
        clearPhoto: () => clearPublishedPhoto(sameDetail()),
        save: () => void savePublishedEdit(sameDetail()),
        openAction: (action) => dispatch({ type: "action-opened", action }),
        closeAction: () => dispatch({ type: "action-closed" }),
        confirmAction: () => {
          const action = stateRef.current.pendingAction;

          if (action === "unpublish") void unpublishSpecies(sameDetail());
          else if (action === "republish") void republishSpecies(sameDetail());
          else if (action === "remove") void removePublication(sameDetail());
        },
        dismissNotice: () => dispatch({ type: "notice-dismissed" }),
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state],
  );
}
