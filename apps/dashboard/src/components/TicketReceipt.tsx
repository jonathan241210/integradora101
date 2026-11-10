import type { CSSProperties } from "react";
import { formatCurrency } from "@/viewmodels/formatters";
import { qrSvgDataUri, ticketKindLabel } from "@/viewmodels/ticket-sale";
import { formatTicketDateTime } from "@/viewmodels/ticket-history";
import {
  ticketReceiptStyle,
  type TicketPrintSettings,
} from "@/viewmodels/ticket-print-settings";
import type { TicketSaleDto } from "@/viewmodels/ticket-types";

/**
 * Boleto individual imprimible (dashboard-005 CA-36, CA-29). Folio, tipo,
 * precio y QR aparecen siempre; el resto depende de la configuración del
 * equipo. No muestra total ni cantidades de la compra. Los importes vienen de
 * la API: aquí solo se muestran. El QR es un `<img>` con data URI;
 * el SVG no se inyecta en el DOM.
 */
export function TicketReceipt({
  ticket,
  settings,
}: {
  ticket: TicketSaleDto;
  settings: TicketPrintSettings;
}) {
  const { fields } = settings;
  const footer = settings.footer.trim();

  return (
    <article
      className={`ticket-receipt ticket-receipt--${settings.format}`}
      style={ticketReceiptStyle(settings) as CSSProperties}
      aria-label={`Boleto ${ticket.folio}`}
    >
      <p className="ticket-receipt__title">Boleto de entrada</p>
      <p className="ticket-receipt__folio">
        Folio <strong>{ticket.folio}</strong>
      </p>
      {fields.dateTime && (
        <p className="ticket-receipt__line">
          {formatTicketDateTime(ticket.purchased_at)}
        </p>
      )}
      <p className="ticket-receipt__kind">{ticketKindLabel(ticket.ticket_type)}</p>
      <p className="ticket-receipt__price">
        Precio <strong>{formatCurrency(ticket.unit_price)}</strong>
      </p>
      {fields.cashier && ticket.cashier_name && (
        <p className="ticket-receipt__line">Cajero: {ticket.cashier_name}</p>
      )}
      <img
        className="ticket-receipt__qr"
        src={qrSvgDataUri(ticket.qr_svg)}
        alt={`Código QR del boleto con folio ${ticket.folio}`}
      />
      {fields.footer && footer && (
        <p className="ticket-receipt__footer">{footer}</p>
      )}
    </article>
  );
}
