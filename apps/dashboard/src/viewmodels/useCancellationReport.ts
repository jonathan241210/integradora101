import { useEffect, useReducer, useRef } from "react";
import { adminApi } from "@/services/arca-api";
import { saveFile } from "@/services/save-file";
import {
  buildCancellationQuery,
  cancellationReportReducer,
  exportCancellationReport,
  filtersFromQuery,
  initialCancellationReportState,
  loadCancellationCashiers,
  loadCancellationReport,
  reasonFilterOptions,
  type CancellationReportViewModel,
} from "./cancellation-report";
import { useCancellationReasons } from "./useCancellationReasons";

/** ViewModel de la página Cancelaciones (dashboard-016). Solo consulta y exporta. */
export function useCancellationReport(): CancellationReportViewModel {
  const [state, dispatch] = useReducer(
    cancellationReportReducer,
    initialCancellationReportState,
  );
  // El catálogo lo lee quien tenga permiso; si no, se usan los motivos del reporte.
  const reasons = useCancellationReasons(true);
  const generation = useRef(0);

  useEffect(() => {
    const mine = ++generation.current;

    void loadCancellationReport(
      adminApi,
      dispatch,
      state.query,
      () => generation.current === mine,
    );

    return () => {
      generation.current += 1;
    };
  }, [state.query]);

  useEffect(() => {
    let active = true;

    void loadCancellationCashiers(adminApi, dispatch, () => active);

    return () => {
      active = false;
    };
  }, []);

  return {
    state,
    reasonOptions: reasonFilterOptions(reasons.state.reasons, state.report),
    actions: {
      applyFilters: (filters) =>
        dispatch({ type: "query-changed", query: buildCancellationQuery(filters) }),
      goToReferenceDate: (date) =>
        dispatch({
          type: "query-changed",
          query: buildCancellationQuery({ ...filtersFromQuery(state.query), date }),
        }),
      goToPage: (page) =>
        dispatch({ type: "query-changed", query: { ...state.query, page } }),
      viewTickets: (target) => dispatch({ type: "ticket-focus-applied", target }),
      clearTicketFocus: () => dispatch({ type: "ticket-focus-cleared" }),
      reload: () => {
        const mine = ++generation.current;

        void loadCancellationReport(
          adminApi,
          dispatch,
          state.query,
          () => generation.current === mine,
        );
      },
      exportAs: (format) =>
        void exportCancellationReport(adminApi, dispatch, state.query, format, saveFile),
    },
  };
}
