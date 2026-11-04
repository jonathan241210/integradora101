/**
 * Tipos del contrato de venta de boletos que usan las vistas. Se reexportan
 * desde el ViewModel para que `views/`, `components/` y `sections/` no
 * importen `@arca/api-client` directamente (dashboard-005 CA-21).
 */
export type {
  PageMeta,
  TicketHistoryPage,
  TicketHistoryQuery,
  TicketHistoryRowDto,
  TicketPriceChangeDto,
  TicketPriceCurrentDto,
  TicketPriceMode,
  TicketPriceScheduleInput,
  TicketPriceTypeDto,
  TicketSaleDto,
  TicketSaleInput,
  TicketSalesApi,
  TicketStatus,
} from "@arca/api-client";
