import type { FormEvent } from "react";
import { Alert, Button, Card, Field, SelectField } from "@arca/ui";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FieldErrors, fieldErrorProps } from "@/components/FieldErrors";
import { ListStatusMessage } from "@/components/ListStatusMessage";
import { NoticeBar } from "@/components/NoticeBar";
import { SectionHeading } from "@/components/SectionHeading";
import { formatCurrency } from "@/viewmodels/formatters";
import { formatTicketDateTime } from "@/viewmodels/ticket-history";
import {
  priceConfirmationCopy,
  type TicketPricesViewModel,
} from "@/viewmodels/ticket-prices";
import type { TicketPriceMode, TicketPriceTypeDto } from "@/viewmodels/ticket-types";

function CurrentPrice({ title, price }: { title: string; price: TicketPriceTypeDto }) {
  return (
    <Card className="ticket-type-card">
      <h2>{title}</h2>
      {price.amount ? (
        <>
          <strong className="ticket-price">{formatCurrency(price.amount)}</strong>
          <p>Vigente desde el {formatTicketDateTime(price.effective_at)}</p>
        </>
      ) : (
        <p>{price.message ?? "No hay un precio vigente configurado."}</p>
      )}
      {price.next && (
        <p className="ticket-price-next">
          Próximo cambio programado: {formatCurrency(price.next.amount)} a partir del{" "}
          {formatTicketDateTime(price.next.effective_at)}
        </p>
      )}
    </Card>
  );
}

export function TicketPricesView({ state, actions }: TicketPricesViewModel) {
  const { form, fieldErrors } = state;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    actions.requestConfirmation();
  };

  return (
    <>
      <SectionHeading
        eyebrow="Administración / Precios"
        title="Precios de boletos"
        description="Consulta el precio vigente de adulto y niño y cámbialo de inmediato o en una fecha futura."
      />

      <NoticeBar message={state.notice} onDismiss={actions.dismissNotice} />

      {state.twoFactorRequired && (
        <Alert className="inline-alert" role="alert" aria-live="assertive">
          {state.error || state.actionError || "Configura el segundo factor de autenticación para cambiar los precios."}
        </Alert>
      )}

      {!state.twoFactorRequired && (
        <ListStatusMessage
          status={state.status}
          error={state.error}
          loadingText="Cargando los precios vigentes…"
          emptyText=""
          onRetry={actions.reload}
        />
      )}

      {state.current && (
        <div className="ticket-type-grid">
          <CurrentPrice title="Adulto" price={state.current.adult} />
          <CurrentPrice title="Niño" price={state.current.child} />
        </div>
      )}

      <Card className="form-card">
        <div className="card-heading">
          <div>
            <h2>Cambiar precios</h2>
            <p>Indica los dos montos y cuándo entran en vigor.</p>
          </div>
        </div>
        <form className="ticket-price-form" onSubmit={submit}>
          <Field
            id="price-adult"
            label="Precio de adulto (MXN)"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={form.adultAmount}
            onChange={(event) => actions.changeForm({ adultAmount: event.target.value })}
            {...fieldErrorProps("price-adult", fieldErrors, "adult_amount")}
          />
          <FieldErrors id="price-adult" errors={fieldErrors} name="adult_amount" />
          <Field
            id="price-child"
            label="Precio de niño (MXN)"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={form.childAmount}
            onChange={(event) => actions.changeForm({ childAmount: event.target.value })}
            {...fieldErrorProps("price-child", fieldErrors, "child_amount")}
          />
          <FieldErrors id="price-child" errors={fieldErrors} name="child_amount" />
          <SelectField
            id="price-mode"
            label="Entrada en vigor"
            value={form.mode}
            onChange={(event) =>
              actions.changeForm({ mode: event.target.value as TicketPriceMode })
            }
            {...fieldErrorProps("price-mode", fieldErrors, "mode")}
          >
            <option value="immediate">Aplicar ahora</option>
            <option value="scheduled">Programar</option>
          </SelectField>
          <FieldErrors id="price-mode" errors={fieldErrors} name="mode" />
          {form.mode === "scheduled" && (
            <>
              <Field
                id="price-effective-at"
                label="Fecha y hora de entrada en vigor"
                type="datetime-local"
                value={form.effectiveAt}
                onChange={(event) => actions.changeForm({ effectiveAt: event.target.value })}
                {...fieldErrorProps("price-effective-at", fieldErrors, "effective_at")}
              />
              <FieldErrors id="price-effective-at" errors={fieldErrors} name="effective_at" />
            </>
          )}
          {state.actionError && !state.twoFactorRequired && Object.keys(fieldErrors).length === 0 && (
            <Alert className="inline-alert" role="alert" aria-live="assertive">
              {state.actionError}
            </Alert>
          )}
          <div className="ticket-actions">
            <Button type="submit" disabled={state.saving || state.status === "loading"}>
              Revisar cambio
            </Button>
          </div>
        </form>
      </Card>

      <ConfirmDialog
        copy={priceConfirmationCopy(state.pending)}
        idleTitle="Confirmar cambio de precios"
        busy={state.saving}
        error=""
        onConfirm={actions.confirm}
        onCancel={actions.cancelConfirmation}
      />
    </>
  );
}
