import type { PageMeta, Paginated } from "./admin-types";

/**
 * Contrato de `api-009` (venta de boletos, historial y precios). Los importes
 * son cadenas con dos decimales y las fechas llegan en ISO 8601 UTC. El
 * paquete no calcula totales, precios ni reglas de cancelación.
 */

export type TicketStatus = "completed" | "cancelled";

export type TicketSaleInput = {
  adult_quantity: number;
  child_quantity: number;
};

/** Cotización de `POST admin/tickets/quote` (`api-009` CA-46): importes calculados por la API. */
export type TicketQuoteDto = {
  adult_unit_price: string;
  child_unit_price: string;
  adult_subtotal: string;
  child_subtotal: string;
  total_amount: string;
};

export type TicketKind = "adult" | "child";

/** Un boleto individual de una venta (`api-009` CA-50): un folio y un QR por unidad. */
export type TicketSaleDto = {
  folio: number;
  ticket_type: TicketKind;
  unit_price: string;
  total_amount: string;
  purchased_at: string;
  cashier_name: string | null;
  /** SVG del QR generado por la API; nunca incluye el token `qr_code`. */
  qr_svg: string;
};

/** Respuesta de `POST admin/tickets`: datos de la compra y su lista de boletos. */
export type TicketSaleBatchDto = {
  adult_quantity: number;
  child_quantity: number;
  total_amount: string;
  purchased_at: string;
  cashier_name: string | null;
  tickets: TicketSaleDto[];
};

export type TicketHistoryRowDto = {
  folio: number;
  purchased_at: string;
  adult_quantity: number;
  child_quantity: number;
  total_amount: string;
  status: TicketStatus;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  cashier_name: string | null;
  /** La API decide si el boleto se puede cancelar; el cliente no lo calcula. */
  cancellable: boolean;
};

export type TicketHistoryQuery = {
  folio?: string;
  status?: TicketStatus | "";
  /** `AAAA-MM-DD`. */
  from?: string;
  /** `AAAA-MM-DD`. */
  to?: string;
  page?: number;
  per_page?: number;
  /** Zona IANA; por defecto la del dispositivo. */
  timezone?: string;
};

export type TicketHistoryPage = Paginated<TicketHistoryRowDto>;

export type TicketCancelInput = {
  reason: string;
};

export type TicketPriceNextDto = {
  amount: string;
  effective_at: string;
};

export type TicketPriceTypeDto = {
  amount: string | null;
  effective_at: string | null;
  message: string | null;
  next: TicketPriceNextDto | null;
};

export type TicketPriceCurrentDto = {
  adult: TicketPriceTypeDto;
  child: TicketPriceTypeDto;
};

export type TicketPriceMode = "immediate" | "scheduled";

export type TicketPriceScheduleInput = {
  adult_amount: string | number;
  child_amount: string | number;
  mode: TicketPriceMode;
  /** ISO 8601 con desfase horario o `Z`; obligatorio si `mode` es `scheduled`. */
  effective_at?: string;
};

export type TicketPriceRowDto = {
  id: number;
  ticket_type: string;
  amount: string;
  effective_at: string;
};

export type TicketPriceChangeDto = {
  prices: TicketPriceRowDto[];
  current: TicketPriceCurrentDto;
};

export type { PageMeta };
