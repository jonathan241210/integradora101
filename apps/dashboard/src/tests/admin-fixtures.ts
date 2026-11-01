import { vi } from "vitest";
import type { ApiError } from "@arca/api-client";
import type {
  AdminApi,
  DashboardSummaryDto,
  EnclosureDto,
  EventDto,
  NewsDto,
  StaffAccountDto,
  StaffOptionsDto,
  TicketReportDto,
} from "../viewmodels/admin-types";

/** Fixtures y cliente simulado de `AdminApi` (RN-08: api-007 se simula en pruebas). */

export function apiError(
  status: number,
  message: string,
  errors?: Record<string, string[]>,
): ApiError {
  return Object.assign(new Error(message), {
    name: "ApiError",
    status,
    message,
    ...(errors ? { errors } : {}),
  }) as ApiError;
}

export function staffAccount(overrides: Partial<StaffAccountDto> = {}): StaffAccountDto {
  return {
    id: 7,
    first_name: "Ana",
    last_name: "López",
    second_last_name: "Pérez",
    full_name: "Ana López Pérez",
    email: "ana@test.arca.invalid",
    department: { id: 2, code: "ticketing", name: "Taquilla" },
    role: { name: "cashier", label: "Cajero" },
    is_active: true,
    last_login_at: "2026-10-29T15:30:00+00:00",
    two_factor_confirmed: false,
    ...overrides,
  };
}

export const staffOptions: StaffOptionsDto = {
  departments: [
    { id: 2, code: "ticketing", name: "Taquilla", suggested_role: "cashier" },
    { id: 3, code: "veterinary", name: "Veterinaria", suggested_role: "veterinarian" },
    { id: 4, code: "presidency", name: "Presidencia", suggested_role: null },
  ],
  roles: [
    { name: "cashier", label: "Cajero" },
    { name: "veterinarian", label: "Veterinario" },
  ],
};

export function newsItem(overrides: Partial<NewsDto> = {}): NewsDto {
  return {
    id: 11,
    title: "Nace una cría de jaguar",
    description: "Resumen breve",
    content: "Contenido completo",
    category: "Conservación",
    published_date: "2026-10-12",
    start_date: null,
    end_date: null,
    is_active: true,
    ...overrides,
  };
}

export function eventItem(overrides: Partial<EventDto> = {}): EventDto {
  return {
    id: 21,
    name: "Noche de safari",
    description: "Recorrido nocturno",
    location: "Sendero principal",
    start_date: "2026-11-20",
    end_date: null,
    start_time: "19:00:00",
    end_time: "22:00:00",
    is_active: false,
    ...overrides,
  };
}

export function enclosure(overrides: Partial<EnclosureDto> = {}): EnclosureDto {
  return { id: 5, name: "Zona de felinos", animals_count: 3, ...overrides };
}

export const summary: DashboardSummaryDto = {
  today: { tickets: 12, adults: 7, children: 5, revenue: "1234.50" },
  last_7_days: { tickets: 80, adults: 50, children: 30, revenue: "9876.00" },
  series: [
    { date: "2026-10-24", revenue: "100.00" },
    { date: "2026-10-25", revenue: "200.00" },
    { date: "2026-10-26", revenue: "0.00" },
  ],
};

export const emptySummary: DashboardSummaryDto = {
  today: { tickets: 0, adults: 0, children: 0, revenue: "0.00" },
  last_7_days: { tickets: 0, adults: 0, children: 0, revenue: "0.00" },
  series: [{ date: "2026-10-26", revenue: "0.00" }],
};

export function ticketReport(overrides: Partial<TicketReportDto> = {}): TicketReportDto {
  return {
    period: {
      type: "week",
      from: "2026-10-26",
      to: "2026-11-01",
      label: "26 oct – 1 nov 2026",
      previous_date: "2026-10-19",
      next_date: null,
    },
    totals: { tickets: 9, adults: 6, children: 3, revenue: "450.00" },
    daily: [
      { date: "2026-10-26", tickets: 4, adults: 3, children: 1, revenue: "200.00" },
      { date: "2026-10-27", tickets: 5, adults: 3, children: 2, revenue: "250.00" },
    ],
    tickets: [
      { folio: "F-0001", purchased_at: "2026-10-26T10:15:00", adults: 2, children: 1, total: "150.00" },
    ],
    meta: { current_page: 1, last_page: 2, per_page: 50, total: 9 },
    ...overrides,
  };
}

/** Cliente `AdminApi` donde cada método es un `vi.fn` configurable. */
export function createAdminApiMock(overrides: Partial<Record<string, unknown>> = {}) {
  const mock = {
    users: {
      list: vi.fn(async (..._args: unknown[]) => ({
        data: [staffAccount()],
        meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 },
      })),
      options: vi.fn(async (..._args: unknown[]) => staffOptions),
      create: vi.fn(async (..._args: unknown[]) => staffAccount()),
      get: vi.fn(async (..._args: unknown[]) => staffAccount()),
      update: vi.fn(async (..._args: unknown[]) => staffAccount()),
      setStatus: vi.fn(async (..._args: unknown[]) => undefined),
      remove: vi.fn(async (..._args: unknown[]) => undefined),
      resetPassword: vi.fn(async (..._args: unknown[]) => undefined),
      resetTwoFactor: vi.fn(async (..._args: unknown[]) => undefined),
    },
    news: {
      list: vi.fn(async (..._args: unknown[]) => [newsItem()]),
      create: vi.fn(async (..._args: unknown[]) => newsItem()),
      update: vi.fn(async (..._args: unknown[]) => newsItem()),
      setStatus: vi.fn(async (..._args: unknown[]) => undefined),
      remove: vi.fn(async (..._args: unknown[]) => undefined),
    },
    events: {
      list: vi.fn(async (..._args: unknown[]) => [eventItem()]),
      create: vi.fn(async (..._args: unknown[]) => eventItem()),
      update: vi.fn(async (..._args: unknown[]) => eventItem()),
      setStatus: vi.fn(async (..._args: unknown[]) => undefined),
      remove: vi.fn(async (..._args: unknown[]) => undefined),
    },
    enclosures: {
      list: vi.fn(async (..._args: unknown[]) => [enclosure()]),
      create: vi.fn(async (..._args: unknown[]) => enclosure()),
      rename: vi.fn(async (..._args: unknown[]) => enclosure()),
    },
    dashboard: { summary: vi.fn(async (..._args: unknown[]) => summary) },
    reports: {
      tickets: vi.fn(async (..._args: unknown[]) => ticketReport()),
      exportTickets: vi.fn(async (..._args: unknown[]) => ({
        blob: new Blob(["folio\n"]),
        filename: "reporte-boletos.csv",
      })),
    },
    ...overrides,
  };

  return mock as unknown as AdminApi & typeof mock;
}

/** Aplica un reducer a las acciones enviadas por un ViewModel. */
export function createHarness<State, Action>(
  reducer: (state: State, action: Action) => State,
  initial: State,
) {
  let state = initial;
  const actions: Action[] = [];
  const dispatch = (action: Action) => {
    actions.push(action);
    state = reducer(state, action);
  };

  return {
    dispatch,
    actions,
    get state() {
      return state;
    },
  };
}
