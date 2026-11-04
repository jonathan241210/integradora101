import type { CSSProperties } from "react";
import { formatCurrency } from "@/viewmodels/formatters";
import { qrSvgDataUri } from "@/viewmodels/ticket-sale";
import { formatTicketDateTime } from "@/viewmodels/ticket-history";
import {
  ticketReceiptStyle,
  type TicketPrintSettings,
} from "@/viewmodels/ticket-print-settings";
import type { TicketSaleDto } from "@/viewmodels/ticket-types";

/**
 * Boleto imprimible (dashboard-005 CA-06, CA-29). El folio y el QR aparecen
 * siempre; el resto depende de la configuración del equipo. Importes y total
 * vienen de la API: aquí solo se muestran. El QR es un `<img>` con data URI;
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
      {fields.quantities && (
        <dl className="ticket-receipt__quantities">
          <div>
            <dt>Adultos</dt>
            <dd>
              {ticket.adult_quantity} × {formatCurrency(ticket.adult_unit_price)}
            </dd>
          </div>
          <div>
            <dt>Niños</dt>
            <dd>
              {ticket.child_quantity} × {formatCurrency(ticket.child_unit_price)}
            </dd>
          </div>
        </dl>
      )}
      {fields.total && (
        <p className="ticket-receipt__total">
          Total <strong>{formatCurrency(ticket.total_amount)}</strong>
        </p>
      )}
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
