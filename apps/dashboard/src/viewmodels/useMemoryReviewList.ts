import { useEffect, useMemo, useReducer, useRef } from "react";
import { adminApi } from "@/services/arca-api";
import {
  changeFilter,
  changePage,
  initialMemoryListState,
  loadList,
  memoryListReducer,
  type MemoryListContext,
  type MemoryListViewModel,
} from "./memory-review";
import { createGeneration } from "./memory-review-shared";

/**
 * ViewModel de la lista de «Momentos». El contador de generación descarta la
 * respuesta tardía al cambiar de filtro o de página (CA-02, CA-03).
 */
export function useMemoryReviewList(): MemoryListViewModel {
  const [state, dispatch] = useReducer(memoryListReducer, initialMemoryListState);
  const stateRef = useRef(state);
  const generation = useRef(createGeneration());

  stateRef.current = state;

  const context = (): MemoryListContext => {
    const token = generation.current.next();

    return { api: adminApi, dispatch, isCurrent: () => generation.current.isCurrent(token) };
  };

  useEffect(() => {
    void loadList(context(), { filter: state.filter, page: state.page });

    return () => generation.current.invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.filter, state.page]);

  return useMemo(
    () => ({
      state,
      actions: {
        changeFilter: (filter) => changeFilter({ dispatch }, filter),
        goToPage: (page) => changePage({ dispatch }, page),
        reload: () =>
          void loadList(context(), {
            filter: stateRef.current.filter,
            page: stateRef.current.page,
          }),
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state],
  );
}
