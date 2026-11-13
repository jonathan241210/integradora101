import { useState } from "react";
import { Alert, Badge, Button, Card, Field } from "@arca/ui";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FieldErrors, fieldErrorProps } from "@/components/FieldErrors";
import { Icon } from "@/components/Icon";
import { PrintSettingsDialog } from "@/components/PrintSettingsDialog";
import { SectionHeading } from "@/components/SectionHeading";
import { TicketReceipt } from "@/components/TicketReceipt";
import { formatCurrency } from "@/viewmodels/formatters";
import type { TicketPrintSettingsViewModel } from "@/viewmodels/useTicketPrintSettings";
import {
  canConfirmSale,
  canRegisterSale,
  isSaleBusy,
  ticketKindLabel,
  saleConfirmationCopy,
  type TicketSaleViewModel,
} from "@/viewmodels/ticket-sale";
import type { TicketPriceTypeDto } from "@/viewmodels/ticket-types";

function PriceCard({
  title,
  price,
  loading,
}: {
  title: string;
  price: TicketPriceTypeDto | undefined;
  loading: boolean;
}) {
  return (
    <div className="ticket-price-card">
      <div className="ticket-price-card__heading">
        <span className="ticket-price-card__icon"><Icon name="ticket" /></span>
        <h2>{title}</h2>
      </div>
      {price?.amount ? (
        <strong className="ticket-price">{formatCurrency(price.amount)}</strong>
      ) : (
        <strong className="ticket-price ticket-price--missing">
          {loading ? "Cargando…" : "Sin precio"}
        </strong>
      )}
      <p>
        {price?.amount
          ? "Precio unitario vigente"
          : price?.message ?? "Precio unitario"}
      </p>
    </div>
  );
}

export function TicketSaleView({
  state,
  actions,
  printSettings,
}: TicketSaleViewModel & { printSettings: TicketPrintSettingsViewModel }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const busy = isSaleBusy(state);
  const sold = state.step === "done" && state.sale;
  const copy = saleConfirmationCopy(state);
  const loadingPrices = state.prices.status === "loading";

  return (
    <>
      <div
        className={`ticket-sale-screen${sold ? " ticket-sale-screen--printable" : ""}`}
      >
      <SectionHeading
        eyebrow="Taquilla / Venta"
        title="Venta de boletos"
        description="Registra una venta en efectivo e imprime los boletos, cada uno con su folio y código QR."
      />

      <div className="ticket-sale-toolbar">
        <Button variant="secondary" onClick={() => setSettingsOpen(true)}>
          Configurar impresión
        </Button>
      </div>

      {sold && state.sale ? (
        <Card className="ticket-sale-result">
          <div className="card-heading">
            <div className="ticket-sale-result__heading">
              <span className="ticket-sale-result__check" aria-hidden="true">
                <Icon name="ticket" className="ticket-sale-result__ticket" />
                <Icon name="check" className="ticket-sale-result__check-mark" />
              </span>
              <div>
                <h2>Venta registrada</h2>
                <p>Pago en efectivo</p>
              </div>
            </div>
            <Badge tone="success">Registrada</Badge>
          </div>
          <dl className="sale-summary">
            <div>
              <dt>Total de la compra</dt>
              <dd>
                <strong>{formatCurrency(state.sale.total_amount)}</strong>
              </dd>
            </div>
            <div>
              <dt>Boletos</dt>
              <dd>{state.sale.tickets.length}</dd>
            </div>
          </dl>
          <ul
            className="ticket-folio-list"
            aria-label="Boletos de la venta"
            tabIndex={0}
          >
            {state.sale.tickets.map((ticket) => (
              <li key={ticket.folio}>
                <span>Folio {ticket.folio}</span>
                <span>{ticketKindLabel(ticket.ticket_type)}</span>
                <span>{formatCurrency(ticket.unit_price)}</span>
              </li>
            ))}
          </ul>
          <div className="ticket-actions">
            <Button variant="secondary" onClick={actions.newSale}>
              Nueva venta
            </Button>
            <Button onClick={actions.print}>
              <Icon name="ticket" />
              Imprimir boletos
            </Button>
          </div>
        </Card>
      ) : (
        <form
          className="ticket-sale-form"
          onSubmit={(event) => {
            event.preventDefault();
            actions.requestConfirmation();
          }}
        >
          <Card className="ticket-type-card ticket-sale-card">
            <PriceCard
              title="Adulto"
              price={state.prices.current?.adult}
              loading={loadingPrices}
            />
            <Field
              id="sale-adults"
              label="Adultos"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              disabled={busy}
              value={state.adults}
              onChange={(event) => actions.changeQuantity("adults", event.target.value)}
              {...fieldErrorProps("sale-adults", state.fieldErrors, "adult_quantity")}
            />
            <FieldErrors id="sale-adults" errors={state.fieldErrors} name="adult_quantity" />
          </Card>
          <Card className="ticket-type-card ticket-sale-card">
            <PriceCard
              title="Niño"
              price={state.prices.current?.child}
              loading={loadingPrices}
            />
            <Field
              id="sale-children"
              label="Niños"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              disabled={busy}
              value={state.children}
              onChange={(event) => actions.changeQuantity("children", event.target.value)}
              {...fieldErrorProps("sale-children", state.fieldErrors, "child_quantity")}
            />
            <FieldErrors id="sale-children" errors={state.fieldErrors} name="child_quantity" />
          </Card>

          {state.prices.status === "error" && (
            <Alert className="inline-alert" role="alert" aria-live="assertive">
              {state.prices.error}{" "}
              <Button type="button" variant="secondary" onClick={actions.reloadPrices}>
                Reintentar precios
              </Button>
            </Alert>
          )}
          {state.error && (
            <Alert className="inline-alert" role="alert" aria-live="assertive">
              {state.error}
            </Alert>
          )}
          <div className="ticket-actions">
            <Button type="submit" disabled={busy || !canRegisterSale(state)}>
              <Icon name="ticket" />
              Registrar venta
            </Button>
          </div>
        </form>
      )}

      <ConfirmDialog
        copy={copy}
        idleTitle="Confirmar venta"
        busy={busy}
        confirmDisabled={!canConfirmSale(state)}
        error={state.quote.status === "error" ? state.quote.error : ""}
        onConfirm={actions.confirm}
        onCancel={actions.cancelConfirmation}
      >
        <p className="sale-quote-status" role="status" aria-live="polite">
          {state.quote.status === "loading" && "Calculando el total…"}
          {state.quote.status === "ready" &&
            state.quote.quote &&
            `Total calculado: ${formatCurrency(state.quote.quote.total_amount)}`}
        </p>
        {state.quote.status === "ready" && state.quote.quote && (
          <dl className="sale-summary">
            <div>
              <dt>Adultos</dt>
              <dd>
                {state.quote.adults} × {formatCurrency(state.quote.quote.adult_unit_price)} ={" "}
                {formatCurrency(state.quote.quote.adult_subtotal)}
              </dd>
            </div>
            <div>
              <dt>Niños</dt>
              <dd>
                {state.quote.children} × {formatCurrency(state.quote.quote.child_unit_price)} ={" "}
                {formatCurrency(state.quote.quote.child_subtotal)}
              </dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd>
                <strong>{formatCurrency(state.quote.quote.total_amount)}</strong>
              </dd>
            </div>
          </dl>
        )}
      </ConfirmDialog>

      <PrintSettingsDialog
        open={settingsOpen}
        settings={printSettings.settings}
        onChange={printSettings.change}
        onReset={printSettings.reset}
        onClose={() => setSettingsOpen(false)}
      />
      </div>

      {sold && state.sale && (
        <div className="ticket-print-area" aria-hidden="true">
          {state.sale.tickets.map((ticket) => (
            <TicketReceipt
              key={ticket.folio}
              ticket={ticket}
              settings={printSettings.settings}
            />
          ))}
        </div>
      )}
    </>
  );
}
