import { vi } from "vitest";
import type { ApiError } from "@arca/api-client";
import type { ImagePreview } from "../viewmodels/image-field";
import type {
  AdminApi,
  CancellationReportDto,
  ConsoleNoticeDto,
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
    managed_by_console: false,
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
    {
      name: "cashier",
      label: "Cajero",
      two_factor_required: false,
      permissions: [
        { name: "tickets.create", label: "Vender boletos" },
        { name: "tickets.view", label: "Ver historial de boletos" },
      ],
    },
    {
      name: "veterinarian",
      label: "Veterinario",
      two_factor_required: false,
      permissions: [],
    },
    {
      name: "executive",
      label: "Consulta directiva",
      two_factor_required: true,
      permissions: [
        { name: "dashboard.view", label: "Ver panel directivo" },
        { name: "reports.view", label: "Ver reporte de boletos" },
        { name: "public-content.view", label: "Ver contenido público" },
      ],
    },
    {
      name: "communications",
      label: "Comunicación",
      two_factor_required: true,
      permissions: [
        { name: "news.manage", label: "Gestionar noticias" },
        { name: "events.manage", label: "Gestionar eventos" },
        { name: "memories.review", label: "Revisar momentos" },
        { name: "species.review", label: "Revisar especies" },
        { name: "public-content.view", label: "Ver contenido público" },
      ],
    },
  ],
};

/** Cuenta `admin`: solo lectura, gestionada por consola (api-023 CA-13). */
export function adminAccount(overrides: Partial<StaffAccountDto> = {}): StaffAccountDto {
  return staffAccount({
    id: 1,
    full_name: "Rosa Presidencia",
    first_name: "Rosa",
    last_name: "Presidencia",
    second_last_name: null,
    email: "rosa@test.arca.invalid",
    role: { name: "admin", label: "Administrador de Presidencia" },
    managed_by_console: true,
    ...overrides,
  });
}

export function consoleNotice(overrides: Partial<ConsoleNoticeDto> = {}): ConsoleNoticeDto {
  return {
    id: 31,
    action: "Contraseña restablecida",
    account_email: "rosa@test.arca.invalid",
    origin: "consola",
    reason: "Solicitud de la titular",
    created_at: "2026-11-20T16:30:00+00:00",
    ...overrides,
  };
}

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
    image_url: null,
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
    image_url: null,
    ...overrides,
  };
}

export function enclosure(overrides: Partial<EnclosureDto> = {}): EnclosureDto {
  return { id: 5, name: "Zona de felinos", animals_count: 3, is_active: true, has_active_qr: true, ...overrides };
}

export function enclosureQr(
  qr: { code: string; svg: string } | null | { code: string } = {
    code: "ARCA-ABCD2345",
  },
  enclosureOverrides: Partial<{ id: number; name: string; is_active: boolean }> = {},
) {
  return {
    enclosure: { id: 5, name: "Zona de felinos", is_active: true, ...enclosureOverrides },
    qr: qr === null ? null : { svg: '<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>', ...qr },
  };
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
      timezone: "America/Mexico_City",
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

/** Respuesta de `api-022` simulada: todos los importes, minutos y alertas vienen de la API. */
export function cancellationReport(
  overrides: Partial<CancellationReportDto> = {},
): CancellationReportDto {
  return {
    period: {
      type: "week",
      from: "2026-11-16",
      to: "2026-11-22",
      label: "16 nov – 22 nov 2026",
      previous_date: "2026-11-09",
      next_date: null,
      timezone: "America/Mexico_City",
    },
    totals: {
      cancelled_tickets: 3,
      cancelled_amount: "198.00",
      by_cashier: [
        { cashier_id: 4, cashier_name: "Caja Uno", cancelled_tickets: 2, cancelled_amount: "132.00" },
        { cashier_id: 5, cashier_name: "Caja Dos", cancelled_tickets: 1, cancelled_amount: "66.00" },
      ],
      by_reason: [
        { reason_code: "capture_error", reason_label: "Error de captura", cancelled_tickets: 2, cancelled_amount: "132.00" },
        { reason_code: null, reason_label: "Sin clasificar (anterior)", cancelled_tickets: 1, cancelled_amount: "66.00" },
      ],
    },
    reconciliation: {
      days: [
        { date: "2026-11-17", gross: "500.00", cancelled: "132.00", net: "368.00", balanced: true },
        { date: "2026-11-18", gross: "300.00", cancelled: "66.00", net: "230.00", balanced: false },
      ],
      cashiers: [
        {
          cashier_id: 4,
          cashier_name: "Caja Uno",
          gross: "500.00",
          cancelled: "132.00",
          net: "368.00",
          balanced: true,
          active_days: ["2026-11-17"],
          sold_tickets: 25,
          cancel_percent: 12,
          days_to_review: { attention: 2, review: 3 },
        },
      ],
    },
    rows: [
      {
        folio: 101,
        adult_quantity: 2,
        child_quantity: 1,
        total_amount: "66.00",
        purchased_at: "2026-11-17T16:00:00Z",
        cancelled_at: "2026-11-17T16:45:00Z",
        cashier_name: "Caja Uno",
        cancelled_by_name: "Caja Uno",
        reason_code: "capture_error",
        reason_label: "Error de captura",
        comment: "Se cobró doble",
        minutes_to_cancel: 45,
        late_cancellation: true,
        signal_codes: ["late_cancellations", "over_limit_percent"],
      },
      {
        folio: 90,
        adult_quantity: 1,
        child_quantity: 0,
        total_amount: "25.00",
        purchased_at: "2026-11-18T01:00:00Z",
        cancelled_at: "2026-11-18T01:05:00Z",
        cashier_name: "Caja Dos",
        cancelled_by_name: "Caja Dos",
        reason_code: null,
        reason_label: "Sin clasificar (anterior)",
        comment: "Texto anterior guardado",
        minutes_to_cancel: 5,
        late_cancellation: false,
        signal_codes: [],
      },
    ],
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
    pendingCounts: vi.fn(async (..._args: unknown[]) => ({ species_requests: 0, memories: 0 })),
    consoleNotices: {
      list: vi.fn(async (..._args: unknown[]) => [consoleNotice()]),
      read: vi.fn(async (..._args: unknown[]) => undefined),
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
      setStatus: vi.fn(async (..._args: unknown[]) => enclosure()),
      remove: vi.fn(async (..._args: unknown[]) => undefined),
      qr: vi.fn(async (..._args: unknown[]) => enclosureQr()),
      generateQr: vi.fn(async (..._args: unknown[]) => enclosureQr()),
      regenerateQr: vi.fn(async (..._args: unknown[]) => ({ ...enclosureQr({ code: "ARCA-NEW23456" }), deactivated: 1 })),
    },
    search: vi.fn(async (..._args: unknown[]) => ({ groups: [] })),
    dashboard: { summary: vi.fn(async (..._args: unknown[]) => summary) },
    reports: {
      cancellations: vi.fn(async (..._args: unknown[]) => cancellationReport()),
      cancellationCashiers: vi.fn(async (..._args: unknown[]) => [
        { id: 4, name: "Caja Uno" },
        { id: 5, name: "Caja Dos" },
      ]),
      exportCancellations: vi.fn(async (..._args: unknown[]) => ({
        blob: new Blob(["folio\n"]),
        filename: "cancelaciones-2026-11-16.csv",
      })),
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

/** Servicio de vista previa simulado (`URL.createObjectURL` no existe en Node). */
export function createPreviewMock() {
  let counter = 0;

  return {
    create: vi.fn((_file: File) => `blob:preview-${(counter += 1)}`),
    revoke: vi.fn((_url: string) => undefined),
  } satisfies ImagePreview;
}

/** Archivo de prueba con tipo y tamaño controlados. */
export function imageFile(name = "foto.png", type = "image/png", size = 1024): File {
  const file = new File([new Uint8Array(Math.min(size, 16))], name, { type });

  Object.defineProperty(file, "size", { value: size });

  return file;
}
