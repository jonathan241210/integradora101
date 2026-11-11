import type { HttpClient } from "./http";
import type { PageMeta } from "./admin-types";
import type {
  TicketCancelInput,
  TicketHistoryPage,
  TicketHistoryQuery,
  TicketHistoryRowDto,
  TicketPriceChangeDto,
  TicketPriceCurrentDto,
  TicketPriceScheduleInput,
  TicketQuoteDto,
  TicketSaleBatchDto,
  TicketSaleInput,
} from "./ticket-sales-types";

const base = "/api/v1/admin";

type Enveloped<T> = T | { data: T };

function unwrap<T>(response: Enveloped<T>): T {
  if (
    typeof response === "object" &&
    response !== null &&
    !Array.isArray(response) &&
    "data" in response
  ) {
    return (response as { data: T }).data;
  }

  return response as T;
}

function queryString(
  values: Record<string, string | number | undefined>,
): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === "") continue;
    params.set(key, String(value));
  }

  const text = params.toString();

  return text ? `?${text}` : "";
}

function normalizeHistory(
  response: Partial<TicketHistoryPage> | TicketHistoryRowDto[],
): TicketHistoryPage {
  const rows = Array.isArray(response) ? response : response.data;
  const data = Array.isArray(rows) ? rows : [];
  const meta: PageMeta =
    (!Array.isArray(response) && response.meta) || {
      current_page: 1,
      last_page: 1,
      per_page: data.length,
      total: data.length,
    };

  return { data, meta };
}

export type CreateTicketSalesApiOptions = {
  /** Zona horaria del dispositivo; por defecto la del navegador. */
  deviceTimeZone?: () => string | undefined;
};

function browserTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Cliente de venta, historial y precios de boletos (`api-009`). Solo usa
 * `http.get` y `http.post`. `timezone` se envía solo en el historial (presentación);
 * ni la venta ni la cancelación lo envían (la API compara el día en la zona del zoológico).
 */
export function createTicketSalesApi(
  http: Pick<HttpClient, "get" | "post">,
  options: CreateTicketSalesApiOptions = {},
) {
  const zone = () => (options.deviceTimeZone ?? browserTimeZone)() || undefined;

  return {
    sales: {
      /** Cotiza sin registrar venta; la API calcula todos los importes. */
      async quote(input: TicketSaleInput): Promise<TicketQuoteDto> {
        return unwrap(
          await http.post<Enveloped<TicketQuoteDto>>(`${base}/tickets/quote`, {
            adult_quantity: input.adult_quantity,
            child_quantity: input.child_quantity,
          }),
        );
      },
      async create(input: TicketSaleInput): Promise<TicketSaleBatchDto> {
        return unwrap(
          await http.post<Enveloped<TicketSaleBatchDto>>(`${base}/tickets`, {
            adult_quantity: input.adult_quantity,
            child_quantity: input.child_quantity,
          }),
        );
      },
    },
    history: {
      async list(query: TicketHistoryQuery = {}): Promise<TicketHistoryPage> {
        return normalizeHistory(
          await http.get<Partial<TicketHistoryPage>>(
            `${base}/tickets${queryString({
              folio: query.folio?.trim(),
              status: query.status,
              from: query.from,
              to: query.to,
              page: query.page,
              per_page: query.per_page,
              timezone: query.timezone || zone(),
            })}`,
          ),
        );
      },
      async cancel(
        id: number | string,
        input: TicketCancelInput,
      ): Promise<TicketHistoryRowDto> {
        return unwrap(
          await http.post<Enveloped<TicketHistoryRowDto>>(
            `${base}/tickets/${encodeURIComponent(String(id))}/cancel`,
            { reason: input.reason },
          ),
        );
      },
    },
    prices: {
      async current(): Promise<TicketPriceCurrentDto> {
        return unwrap(
          await http.get<Enveloped<TicketPriceCurrentDto>>(
            `${base}/ticket-prices/current`,
          ),
        );
      },
      async schedule(
        input: TicketPriceScheduleInput,
      ): Promise<TicketPriceChangeDto> {
        return unwrap(
          await http.post<Enveloped<TicketPriceChangeDto>>(
            `${base}/ticket-prices`,
            input,
          ),
        );
      },
    },
  };
}

export type TicketSalesApi = ReturnType<typeof createTicketSalesApi>;
