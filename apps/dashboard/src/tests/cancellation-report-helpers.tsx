import { renderToStaticMarkup } from "react-dom/server";
import { vi } from "vitest";
import { CancellationReportView } from "../views/CancellationReportView";
import {
  cancellationReportReducer,
  initialCancellationReportState,
  type CancellationReportState,
  type CancellationReportViewModel,
} from "../viewmodels/cancellation-report";
import { cancellationReport } from "./admin-fixtures";

export const reportActions: CancellationReportViewModel["actions"] = {
  applyFilters: vi.fn(),
  goToReferenceDate: vi.fn(),
  goToPage: vi.fn(),
  viewTickets: vi.fn(),
  clearTicketFocus: vi.fn(),
  reload: vi.fn(),
  exportAs: vi.fn(),
};

export function readyReportState(
  overrides: Partial<CancellationReportState> = {},
): CancellationReportState {
  return {
    ...initialCancellationReportState,
    status: "ready",
    report: cancellationReport(),
    cashiers: [
      { id: 4, name: "Caja Uno" },
      { id: 5, name: "Caja Dos" },
    ],
    ...overrides,
  };
}

export function renderReport(
  state: CancellationReportState,
  reasonOptions: CancellationReportViewModel["reasonOptions"] = [
    { code: "capture_error", label: "Error de captura" },
    { code: "other", label: "Otro" },
  ],
) {
  return renderToStaticMarkup(
    <CancellationReportView state={state} reasonOptions={reasonOptions} actions={reportActions} />,
  );
}

export { cancellationReportReducer };
