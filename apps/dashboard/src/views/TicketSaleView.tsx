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
  canRegisterSale,
  isSaleBusy,
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
      <h2>{title}</h2>
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
  const sold = state.step === "done" && state.ticket;
  const copy = saleConfirmationCopy(state);
  const loadingPrices = state.prices.status === "loading";

  return (
    <>
      <SectionHeading
        eyebrow="Taquilla / Venta"
        title="Venta de boletos"
        description="Registra una venta en efectivo e imprime el boleto con folio y código QR."
      />

      <div className="ticket-sale-toolbar">
        <Button variant="secondary" onClick={() => setSettingsOpen(true)}>
          Configurar impresión
        </Button>
      </div>

      {sold ? (
        <Card className="ticket-sale-result">
          <div className="card-heading">
            <div>
              <h2>Venta registrada</h2>
              <p>Folio {state.ticket?.folio} · pago en efectivo</p>
            </div>
            <Badge tone="success">Registrada</Badge>
          </div>
          {state.ticket && (
            <TicketReceipt ticket={state.ticket} settings={printSettings.settings} />
          )}
          <div className="ticket-actions">
            <Button variant="secondary" onClick={actions.newSale}>
              Nueva venta
            </Button>
            <Button onClick={actions.print}>
              <Icon name="ticket" />
              Imprimir boleto
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
              <Button variant="secondary" onClick={actions.reloadPrices}>
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
        error=""
        onConfirm={actions.confirm}
        onCancel={actions.cancelConfirmation}
      >
        <dl className="sale-summary">
          <div>
            <dt>Adultos</dt>
            <dd>{state.adults}</dd>
          </div>
          <div>
            <dt>Niños</dt>
            <dd>{state.children}</dd>
          </div>
        </dl>
      </ConfirmDialog>

      <PrintSettingsDialog
        open={settingsOpen}
        settings={printSettings.settings}
        onChange={printSettings.change}
        onReset={printSettings.reset}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
