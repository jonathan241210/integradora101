import { renderToStaticMarkup } from "react-dom/server";
import { vi } from "vitest";
import type {
  CancellationReviewDto,
  CancellationTrafficLightDto,
} from "../viewmodels/admin-types";
import {
  initialReviewDialogState,
  initialReviewHistoryState,
  type CancellationReviewViewModel,
  type ReviewDialogState,
  type ReviewHistoryState,
} from "../viewmodels/cancellation-review";
import { CancellationReportView } from "../views/CancellationReportView";
import { cancellationReport } from "./admin-fixtures";
import { readyReportState, reportActions } from "./cancellation-report-helpers";

export function reviewDto(overrides: Partial<CancellationReviewDto> = {}): CancellationReviewDto {
  return {
    id: 1,
    status: "reviewed_ok",
    status_label: "Revisado: todo en orden",
    note: "Se comparó el neto con el dinero entregado.",
    reviewed_by_name: "Ana Admin",
    reviewed_at: "2026-11-19 10:30:00",
    ...overrides,
  };
}

/** Filas de `reconciliation.cashier_days` con la forma de `api-027`. */
export function cashierDays(): CancellationTrafficLightDto[] {
  return [
    {
      cashier_id: 7,
      cashier_name: "Laura Cruz",
      date: "2026-11-18",
      traffic_light: "attention",
      traffic_light_label: "Atención",
      signals_count: 3,
      sold_tickets: 25,
      cancelled_tickets: 4,
      cancel_percent: 16,
      reasons: [
        { code: "over_limit_percent", label: "Porcentaje de cancelación alto", count: 4, detail: "16 % de 25 boletos", folios: ["101", "102", "103", "104"] },
        { code: "late_cancellations", label: "Cancelaciones más de 30 min después de la venta", count: 1, detail: "1 boleto", folios: ["101"] },
      ],
      reason_sentence: "3 señales: 16 % cancelado frente a 3 % habitual.",
      action: "Compara el neto con el dinero entregado.",
      review: null,
    },
    {
      cashier_id: 8,
      cashier_name: "Mario Ruiz",
      date: "2026-11-18",
      traffic_light: "review",
      traffic_light_label: "Revisar",
      signals_count: 1,
      sold_tickets: 40,
      cancelled_tickets: 3,
      cancel_percent: 7.5,
      reasons: [],
      reason_sentence: "1 señal: 3 cancelaciones con motivo «Otro».",
      action: "Revisa las cancelaciones marcadas.",
      review: reviewDto({ id: 9, status: "clarification_required", status_label: "Requiere aclaración", note: "Falta aclarar el motivo Otro." }),
    },
    {
      cashier_id: 9,
      cashier_name: "Sofía Paz",
      date: "2026-11-18",
      traffic_light: "normal",
      traffic_light_label: "Normal",
      signals_count: 0,
      sold_tickets: 30,
      cancelled_tickets: 0,
      cancel_percent: 0,
      reasons: [],
      reason_sentence: null,
      action: "Sin acciones.",
      review: null,
    },
    {
      cashier_id: null,
      cashier_name: "Sin cajero registrado",
      date: "2026-11-18",
      traffic_light: null,
      traffic_light_label: null,
      signals_count: 0,
      sold_tickets: 12,
      cancelled_tickets: 1,
      cancel_percent: 8.33,
      reasons: [],
      reason_sentence: null,
      action: "No aplica: el día no tiene cajero registrado.",
      review: null,
    },
  ];
}

export const legendItems = [
  { code: "over_limit_percent", label: "Porcentaje de cancelación alto", explanation: "El porcentaje supera el límite.", limit: "Límite: 10 %." },
  { code: "late_cancellations", label: "Cancelaciones más de 30 min después de la venta", explanation: "Se cancelaron mucho después de la venta.", limit: "Límite: 30 minutos." },
  { code: "own_baseline", label: "Por encima de su promedio", explanation: "Compara contra sus 4 semanas.", limit: "Necesita al menos 4 semanas." },
];

/** Niveles como los envía la API en `data.levels[]` (umbral configurable en la API). */
export const levelItems = [
  { code: "normal" as const, label: "Normal", condition: "0 señales" },
  { code: "review" as const, label: "Revisar", condition: "1 señal" },
  { code: "attention" as const, label: "Atención", condition: "2 o más señales" },
];

export const disclaimerText = "Una alerta no prueba nada: solo indica qué revisar.";

export function trafficReport() {
  const base = cancellationReport();

  return cancellationReport({
    reconciliation: { ...base.reconciliation, cashier_days: cashierDays() },
    legend: legendItems,
    levels: levelItems,
    disclaimer: disclaimerText,
  });
}

export function reviewVm(
  dialog: Partial<ReviewDialogState> = {},
  history: Partial<ReviewHistoryState> = {},
): CancellationReviewViewModel {
  return {
    dialog: { ...initialReviewDialogState, ...dialog },
    history: { ...initialReviewHistoryState, ...history },
    actions: {
      open: vi.fn(),
      close: vi.fn(),
      setStatus: vi.fn(),
      setNote: vi.fn(),
      submit: vi.fn(),
      toggleHistory: vi.fn(),
    },
  };
}

export function renderTraffic(options: {
  canReview?: boolean;
  review?: CancellationReviewViewModel;
} = {}) {
  return renderToStaticMarkup(
    <CancellationReportView
      state={readyReportState({ report: trafficReport() })}
      reasonOptions={[]}
      actions={reportActions}
      canReview={options.canReview ?? true}
      review={options.review ?? reviewVm()}
    />,
  );
}
