import type { HttpClient } from "./http";
import type { PageMeta } from "./admin-types";
import type {
  CancellationReasonDto,
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

  const timezone =
    !Array.isArray(response) && typeof response.timezone === "string" && response.timezone
      ? response.timezone
      : undefined;

  return timezone ? { data, meta, timezone } : { data, meta };
}

/**
 * Cliente de venta, historial y precios de boletos (`api-009`). Solo usa
 * `http.get` y `http.post`. Ninguna petición envía `timezone` (`dashboard-019`): la API
 * decide el día con su zona de negocio y la informa en la respuesta.
 */
export function createTicketSalesApi(
  http: Pick<HttpClient, "get" | "post">,
) {
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
            { reason_code: input.reason_code, reason: input.reason ?? null },
          ),
        );
      },
    },
    tickets: {
      /** Catálogo cerrado de motivos de cancelación (`api-022` CA-10). */
      async cancellationReasons(): Promise<CancellationReasonDto[]> {
        const list = unwrap(
          await http.get<Enveloped<CancellationReasonDto[]>>(
            `${base}/tickets/cancellation-reasons`,
          ),
        );

        return Array.isArray(list) ? list : [];
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
        input: TicketPriceScheduleInput & { password?: string },
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
