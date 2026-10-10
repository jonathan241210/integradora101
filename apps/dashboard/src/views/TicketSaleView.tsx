import { useRef } from "react";
import { Badge, Button, Card, Dialog } from "@arca/ui";
import { DemoBanner } from "../components/DemoBanner";
import { Icon } from "../components/Icon";
import { SectionHeading } from "../components/SectionHeading";
import type { SaleStep } from "../viewmodels/dashboard-demo";

export function TicketSaleView({
  saleStep,
  onOpen,
  onCancel,
  onConfirm,
  onReset,
}: {
  saleStep: SaleStep;
  onOpen: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  onReset: () => void;
}) {
  const returnFocusRef = useRef<HTMLButtonElement>(null);
  const closeSale = () => {
    onCancel();
    window.requestAnimationFrame(() => returnFocusRef.current?.focus());
  };

  return (
    <>
      <SectionHeading
        eyebrow="Taquilla / Venta"
        title="Venta de boletos"
        description="Recorre el flujo visual de una venta ficticia sin realizar cobros."
      />
      <DemoBanner />
      <div className="ticket-type-grid">
        <Card className="ticket-type-card">
          <div className="ticket-type-card__header">
            <h2>Adulto</h2>
            <Badge tone="info">Ejemplo</Badge>
          </div>
          <strong className="ticket-price">$25.00</strong>
          <p>Precio ficticio · no es una tarifa vigente</p>
          <div className="ticket-quantity">
            <span>Cantidad de muestra</span>
            <strong>2</strong>
          </div>
        </Card>
        <Card className="ticket-type-card">
          <div className="ticket-type-card__header">
            <h2>Niño</h2>
            <Badge tone="info">Ejemplo</Badge>
          </div>
          <strong className="ticket-price">$16.20</strong>
          <p>Precio ficticio · no es una tarifa vigente</p>
          <div className="ticket-quantity">
            <span>Cantidad de muestra</span>
            <strong>3</strong>
          </div>
        </Card>
      </div>
      <Card className="ticket-total-card">
        <div>
          <span>Total recibido (dato ficticio)</span>
          <strong>$98.60</strong>
          <small>Importe fijo de muestra · no se calcula a partir de las cantidades</small>
        </div>
        <Badge tone="warning">Sin cobro real</Badge>
      </Card>
      <div className="ticket-actions">
        <Button ref={returnFocusRef} onClick={onOpen}>
          <Icon name="ticket" />
          Realizar venta de demostración
        </Button>
      </div>

      <Dialog
        open={saleStep !== "idle"}
        title={
          saleStep === "confirmation"
            ? "Confirmar venta de demostración"
            : saleStep === "processing"
              ? "Procesando demostración"
              : "Venta de demostración realizada"
        }
        onClose={closeSale}
        className="sale-dialog"
      >
        {saleStep === "confirmation" && (
          <>
            <p className="dialog-copy">
              Esta acción solo muestra el flujo visual. No se recibirá dinero ni
              se guardará ninguna venta.
            </p>
            <div className="dialog-sample-total">
              <span>Importe ficticio</span>
              <strong>$98.60</strong>
            </div>
            <div className="dialog-actions">
              <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
              <Button onClick={onConfirm}>Continuar demostración</Button>
            </div>
          </>
        )}
        {saleStep === "processing" && (
          <div className="processing-state" role="status" aria-live="polite">
            <span className="processing-spinner" aria-hidden="true" />
            <p>Simulando el procesamiento. No hay conexión con un proveedor de pago.</p>
          </div>
        )}
        {saleStep === "complete" && (
          <div className="sale-success">
            <span className="sale-success__icon"><Icon name="check" /></span>
            <h3>Venta de muestra finalizada</h3>
            <p>No se creó una transacción ni se cobró un pago.</p>
            <dl>
              <div><dt>Adultos</dt><dd>2</dd></div>
              <div><dt>Niños</dt><dd>3</dd></div>
              <div><dt>Importe de muestra</dt><dd>$98.60</dd></div>
            </dl>
            <Button className="sale-success__button" onClick={() => {
              onReset();
              window.requestAnimationFrame(() => returnFocusRef.current?.focus());
            }}>Aceptar</Button>
          </div>
        )}
      </Dialog>
    </>
  );
}
