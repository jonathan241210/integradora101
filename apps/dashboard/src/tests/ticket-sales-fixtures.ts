import { vi } from "vitest";
import type { ApiError } from "@arca/api-client";
import type {
  TicketHistoryRowDto,
  TicketPriceCurrentDto,
  TicketQuoteDto,
  TicketSaleBatchDto,
  TicketSaleDto,
  TicketSalesApi,
} from "../viewmodels/ticket-types";
import {
  changeTicketPrintSettings,
  defaultTicketPrintSettings,
  type TicketPrintSettings,
} from "../viewmodels/ticket-print-settings";
import type { TicketPrintSettingsViewModel } from "../viewmodels/useTicketPrintSettings";
import { apiError } from "./admin-fixtures";

/** Fixtures y cliente simulado de `TicketSalesApi` (dashboard-005 RN-08). */

export const qrSvg =
  '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>';

export function codedApiError(
  status: number,
  message: string,
  code?: string,
  errors?: Record<string, string[]>,
): ApiError {
  return Object.assign(apiError(status, message, errors), code ? { code } : {});
}

/** Un boleto individual (`api-009` CA-50). */
export function ticketDto(overrides: Partial<TicketSaleDto> = {}): TicketSaleDto {
  return {
    folio: 101,
    ticket_type: "adult",
    unit_price: "25.00",
    total_amount: "25.00",
    purchased_at: "2026-11-02T18:30:15Z",
    cashier_name: "Caja Prueba",
    qr_svg: qrSvg,
    ...overrides,
  };
}

/** Compra de ejemplo: 1 adulto y 3 niños = 4 boletos y $73.00. */
export function saleDto(overrides: Partial<TicketSaleBatchDto> = {}): TicketSaleBatchDto {
  return {
    adult_quantity: 1,
    child_quantity: 3,
    total_amount: "73.00",
    purchased_at: "2026-11-02T18:30:15Z",
    cashier_name: "Caja Prueba",
    tickets: [
      ticketDto(),
      ...[102, 103, 104].map((folio) =>
        ticketDto({ folio, ticket_type: "child", unit_price: "16.00", total_amount: "16.00" }),
      ),
    ],
    ...overrides,
  };
}

export function quoteDto(overrides: Partial<TicketQuoteDto> = {}): TicketQuoteDto {
  return {
    adult_unit_price: "25.00",
    child_unit_price: "16.00",
    adult_subtotal: "50.00",
    child_subtotal: "16.00",
    total_amount: "66.00",
    ...overrides,
  };
}

export function historyRow(
  overrides: Partial<TicketHistoryRowDto> = {},
): TicketHistoryRowDto {
  return {
    folio: 7,
    purchased_at: "2026-11-02T18:30:15Z",
    adult_quantity: 2,
    child_quantity: 1,
    total_amount: "66.00",
    status: "completed",
    cancelled_at: null,
    cancellation_reason: null,
    cashier_name: "Caja Prueba",
    cancellable: true,
    ...overrides,
  };
}

export function priceCurrent(
  overrides: Partial<TicketPriceCurrentDto> = {},
): TicketPriceCurrentDto {
  return {
    adult: { amount: "25.00", effective_at: "2026-01-01T00:00:00Z", message: null, next: null },
    child: { amount: "16.00", effective_at: "2026-01-01T00:00:00Z", message: null, next: null },
    ...overrides,
  };
}

export const historyPage = (rows: TicketHistoryRowDto[]) => ({
  data: rows,
  meta: { current_page: 1, last_page: 1, per_page: 25, total: rows.length },
});

export function createTicketSalesApiMock() {
  const mock = {
    sales: {
      quote: vi.fn(async (..._args: unknown[]) => quoteDto()),
      create: vi.fn(async (..._args: unknown[]) => saleDto()),
    },
    history: {
      list: vi.fn(async (..._args: unknown[]) => historyPage([historyRow()])),
      cancel: vi.fn(async (..._args: unknown[]) =>
        historyRow({ status: "cancelled", cancellable: false }),
      ),
    },
    prices: {
      current: vi.fn(async (..._args: unknown[]) => priceCurrent()),
      schedule: vi.fn(async (..._args: unknown[]) => ({
        prices: [],
        current: priceCurrent(),
      })),
    },
  };

  return mock as unknown as TicketSalesApi & typeof mock;
}

export function printSettingsViewModel(
  settings: TicketPrintSettings = defaultTicketPrintSettings,
): TicketPrintSettingsViewModel {
  return { settings, change: vi.fn(), reset: vi.fn() };
}

export function withFields(
  settings: TicketPrintSettings,
  value: boolean,
): TicketPrintSettings {
  let next = settings;

  for (const name of ["dateTime", "cashier", "footer"] as const) {
    next = changeTicketPrintSettings(next, { type: "field", name, value });
  }

  return next;
}
