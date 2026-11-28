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
  /** Zona de negocio de la API (`api-025` RN-13); si falta, el respaldo del dashboard. */
  timezone?: string;
};

export type TicketHistoryRowDto = {
  folio: number;
  purchased_at: string;
  adult_quantity: number;
  child_quantity: number;
  total_amount: string;
  status: TicketStatus;
  cancelled_at: string | null;
  /** Solo el comentario guardado (`api-022` RN-03); la etiqueta va en `cancellation_reason_label`. */
  cancellation_reason: string | null;
  /** Código del catálogo (`api-022`); `null` en cancelaciones anteriores a la feature. */
  cancellation_reason_code?: CancellationReasonCode | null;
  /** Etiqueta en español que deriva la API («Sin clasificar (anterior)» si no hay código). */
  cancellation_reason_label?: string | null;
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
};

/** Página del historial con la zona de negocio que informa la API (`api-025` CA-12). */
export type TicketHistoryPage = Paginated<TicketHistoryRowDto> & {
  timezone?: string;
};

/** Los cinco códigos cerrados de `api-022` RN-02. Las etiquetas las entrega la API. */
export type CancellationReasonCode =
  | "capture_error"
  | "duplicate_charge"
  | "wrong_ticket_type"
  | "visitor_withdrew"
  | "other";

/** Motivo del catálogo de `GET admin/tickets/cancellation-reasons` (`api-022` CA-10). */
export type CancellationReasonDto = {
  code: CancellationReasonCode;
  label: string;
  /** `required` obliga a escribir comentario (solo `other`); `optional` lo permite. */
  comment_policy: "required" | "optional";
};

/** Cuerpo de cancelar (`api-022` CA-11 a CA-13): código obligatorio y comentario. */
export type TicketCancelInput = {
  reason_code: CancellationReasonCode;
  reason?: string | null;
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
  /** Zona de negocio de la API (`api-025` RN-13); si falta, el respaldo del dashboard. */
  timezone?: string;
};

export type TicketPriceMode = "immediate" | "scheduled";

export type TicketPriceScheduleInput = {
  adult_amount: string | number;
  child_amount: string | number;
  mode: TicketPriceMode;
  /**
   * Fecha y hora `AAAA-MM-DDTHH:mm:ss` sin desfase: la API la interpreta en su zona de
   * negocio (`api-025` RN-12). Obligatorio si `mode` es `scheduled`.
   */
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
