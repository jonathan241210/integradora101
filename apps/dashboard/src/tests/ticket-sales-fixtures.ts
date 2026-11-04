import { vi } from "vitest";
import type { ApiError } from "@arca/api-client";
import type {
  TicketHistoryRowDto,
  TicketPriceCurrentDto,
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

export function saleDto(overrides: Partial<TicketSaleDto> = {}): TicketSaleDto {
  return {
    folio: 123,
    purchased_at: "2026-11-02T18:30:15Z",
    adult_quantity: 2,
    child_quantity: 1,
    adult_unit_price: "25.00",
    child_unit_price: "16.00",
    total_amount: "66.00",
    status: "completed",
    payment_method: "cash",
    cashier_name: "Caja Prueba",
    qr_svg: qrSvg,
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
    sales: { create: vi.fn(async (..._args: unknown[]) => saleDto()) },
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

  for (const name of ["dateTime", "quantities", "total", "cashier", "footer"] as const) {
    next = changeTicketPrintSettings(next, { type: "field", name, value });
  }

  return next;
}
