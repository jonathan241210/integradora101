import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Alert, Button, Dialog } from "@arca/ui";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  QR_TEXTS,
  qrDialogButtons,
  qrDialogTitle,
  qrImageAlt,
  qrImageSource,
  regenerateConfirmation,
  type EnclosureQrFocus,
  type EnclosureQrIntent,
} from "@/viewmodels/enclosure-qr";
import { useEnclosureQr } from "@/viewmodels/useEnclosureQr";

type Qr = { code: string; svg: string };

/**
 * Hoja de impresión (CA-09): solo el nombre, el QR y el código en texto.
 * Se oculta en pantalla y `@media print` la deja como única parte visible.
 */
export function EnclosureQrSheet({ name, qr }: { name: string; qr: Qr }) {
  return (
    <section id="enclosure-qr-print" className="enclosure-qr-sheet">
      <h1 className="enclosure-qr-sheet__title">{name}</h1>
      <img className="enclosure-qr-sheet__image" src={qrImageSource(qr.svg)} alt={qrImageAlt(name)} />
      <p className="enclosure-qr-sheet__code">{qr.code}</p>
    </section>
  );
}

/**
 * Diálogo del QR de un recinto (dashboard-013). Solo presenta: el hook
 * `useEnclosureQr` consulta, genera y regenera. El SVG se pinta como
 * `<img>` con data URI y el nombre y el código como texto de React (RN-03, RN-05).
 */
export function EnclosureQrDialog({
  enclosure,
  intent,
  focus,
  onClose,
  onHasQr,
  onNotFound,
}: {
  enclosure: { id: number; name: string; is_active: boolean };
  intent: EnclosureQrIntent;
  focus: EnclosureQrFocus;
  onClose: () => void;
  onHasQr: (hasQr: boolean) => void;
  onNotFound: (message: string) => void;
}) {
  const { state, actions } = useEnclosureQr(enclosure, intent, { onHasQr, onNotFound });
  const buttons = qrDialogButtons(state);
  const name = state.data?.enclosure.name ?? enclosure.name;
  const qr = state.data?.qr ?? null;
  const printRef = useRef<HTMLButtonElement>(null);
  const regenerateRef = useRef<HTMLButtonElement>(null);
  const generateRef = useRef<HTMLButtonElement>(null);
  const focused = useRef(false);

  // Foco inicial en «Imprimir» (CA-15), o en «Regenerar QR» si el buscador lo pidió (CA-18).
  useEffect(() => {
    if (focused.current || state.status !== "ready" || state.busy) return;
    focused.current = true;
    const target = qr
      ? focus === "regenerate"
        ? regenerateRef.current
        : printRef.current
      : generateRef.current;

    target?.focus();
  }, [state.status, state.busy, qr, focus]);

  const sheet = qr ? <EnclosureQrSheet name={name} qr={qr} /> : null;

  return (
    <>
      <Dialog open title={qrDialogTitle(name)} onClose={onClose} className="enclosure-qr-dialog">
        <div className="enclosure-qr">
          {state.status === "loading" && (
            <p role="status" className="enclosure-qr__status">
              {QR_TEXTS.loading}
            </p>
          )}
          {state.status === "error" && (
            <div className="enclosure-qr__error">
              <Alert role="alert" aria-live="assertive">
                {state.loadError}
              </Alert>
              {state.canRetry && (
                <Button variant="secondary" onClick={actions.retry}>
                  {QR_TEXTS.retry}
                </Button>
              )}
            </div>
          )}
          {state.status === "ready" && (
            <>
              {buttons.showInactiveNotice && (
                <Alert role="note" className="enclosure-qr__inactive">
                  {QR_TEXTS.inactive}
                </Alert>
              )}
              {state.notice && (
                <Alert role="status" className="enclosure-qr__notice">
                  {state.notice}
                </Alert>
              )}
              {state.actionError && (
                <Alert role="alert" aria-live="assertive" className="enclosure-qr__action-error">
                  {state.actionError}
                </Alert>
              )}
              {qr ? (
                <div className="enclosure-qr__body">
                  <img
                    className="enclosure-qr__image"
                    src={qrImageSource(qr.svg)}
                    alt={qrImageAlt(name)}
                  />
                  <p className="enclosure-qr__code">{qr.code}</p>
                </div>
              ) : (
                <p className="enclosure-qr__status" role={state.busy ? "status" : undefined}>
                  {state.busy ? QR_TEXTS.generating : QR_TEXTS.noQr}
                </p>
              )}
            </>
          )}
          <div className="dialog-actions enclosure-qr__actions">
            {buttons.showPrint && (
              <Button ref={printRef} disabled={buttons.disabled} onClick={actions.print}>
                {QR_TEXTS.print}
              </Button>
            )}
            {buttons.showGenerate && (
              <Button ref={generateRef} disabled={buttons.disabled} onClick={actions.generate}>
                {QR_TEXTS.generate}
              </Button>
            )}
            {buttons.showRegenerate && (
              <Button
                ref={regenerateRef}
                variant="danger"
                disabled={buttons.disabled}
                onClick={actions.requestRegenerate}
              >
                {QR_TEXTS.regenerate}
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>
              {QR_TEXTS.close}
            </Button>
          </div>
        </div>
      </Dialog>
      <ConfirmDialog
        copy={state.confirmingRegenerate ? regenerateConfirmation(name) : null}
        idleTitle="Confirmar regeneración del QR"
        busy={state.busy}
        error=""
        onConfirm={actions.confirmRegenerate}
        onCancel={actions.cancelRegenerate}
      />
      {sheet && (typeof document === "undefined" ? sheet : createPortal(sheet, document.body))}
    </>
  );
}
