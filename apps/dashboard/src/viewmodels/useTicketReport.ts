import { useEffect, useReducer, useRef } from "react";
import { adminApi } from "@/services/arca-api";
import { saveFile } from "@/services/save-file";
import {
  customRange,
  exportTicketReport,
  initialTicketReportState,
  loadTicketReport,
  referenceDateChange,
  selectPeriod,
  ticketReportReducer,
  type TicketReportViewModel,
} from "./ticket-report";

export function useTicketReport(): TicketReportViewModel {
  const [state, dispatch] = useReducer(
    ticketReportReducer,
    initialTicketReportState,
  );

  const generation = useRef(0);

  useEffect(() => {
    const mine = ++generation.current;

    void loadTicketReport(
      adminApi,
      dispatch,
      state.query,
      () => generation.current === mine,
    );

    return () => {
      generation.current += 1;
    };
  }, [state.query]);

  return {
    state,
    actions: {
      selectPeriod: (period) =>
        dispatch({ type: "query-changed", changes: selectPeriod(period) }),
      applyCustomRange: (from, to) =>
        dispatch({ type: "query-changed", changes: customRange(from, to) }),
      goToReferenceDate: (date) =>
        dispatch({
          type: "query-changed",
          changes: referenceDateChange(state.query, date),
        }),
      goToPage: (page) =>
        dispatch({ type: "query-changed", changes: { page } }),
      reload: () => {
        const mine = ++generation.current;

        void loadTicketReport(
          adminApi,
          dispatch,
          state.query,
          () => generation.current === mine,
        );
      },
      exportAs: (format) =>
        void exportTicketReport(adminApi, dispatch, state.query, format, saveFile, state.report),
    },
  };
}
