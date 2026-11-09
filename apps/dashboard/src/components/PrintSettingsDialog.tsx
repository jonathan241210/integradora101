import { Button, Dialog, Field, SelectField } from "@arca/ui";
import {
  MARGIN_RANGE_MM,
  MAX_TICKET_FOOTER_LENGTH,
  type TicketFontSize,
  type TicketPaperWidth,
  type TicketPrintChange,
  type TicketPrintFields,
  type TicketPrintFormat,
  type TicketPrintSettings,
} from "@/viewmodels/ticket-print-settings";

const optionalFields: { name: keyof TicketPrintFields; label: string }[] = [
  { name: "dateTime", label: "Fecha y hora" },
  { name: "cashier", label: "Cajero" },
  { name: "footer", label: "Pie de texto" },
];

/** Configuración de impresión por equipo (dashboard-005 CA-27). Sobre el `Dialog` de `@arca/ui`. */
export function PrintSettingsDialog({
  open,
  settings,
  onChange,
  onReset,
  onClose,
}: {
  open: boolean;
  settings: TicketPrintSettings;
  onChange: (change: TicketPrintChange) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const range = MARGIN_RANGE_MM[settings.format];

  return (
    <Dialog
      open={open}
      title="Configurar impresión"
      onClose={onClose}
      className="form-dialog print-settings-dialog"
    >
      <form
        className="dialog-form"
        onSubmit={(event) => {
          event.preventDefault();
          onClose();
        }}
      >
        <p className="dialog-copy">
          Esta configuración se guarda solo en este equipo. El folio, el tipo, el
          precio y el código QR siempre se imprimen.
        </p>
        <SelectField
          id="print-format"
          label="Formato"
          value={settings.format}
          onChange={(event) =>
            onChange({ type: "format", value: event.target.value as TicketPrintFormat })
          }
        >
          <option value="thermal">{`Térmica ${settings.paperWidth} mm`}</option>
          <option value="letter">Hoja carta</option>
        </SelectField>
        {settings.format === "thermal" && (
          <SelectField
            id="print-paper-width"
            label="Ancho de papel"
            value={String(settings.paperWidth)}
            onChange={(event) =>
              onChange({
                type: "paper-width",
                value: Number(event.target.value) as TicketPaperWidth,
              })
            }
          >
            <option value="58">58 mm</option>
            <option value="80">80 mm</option>
          </SelectField>
        )}
        <SelectField
          id="print-font-size"
          label="Tamaño de fuente"
          value={settings.fontSize}
          onChange={(event) =>
            onChange({ type: "font-size", value: event.target.value as TicketFontSize })
          }
        >
          <option value="small">Pequeño</option>
          <option value="normal">Normal</option>
          <option value="large">Grande</option>
        </SelectField>
        <Field
          id="print-margin"
          label="Márgenes (mm)"
          type="number"
          inputMode="decimal"
          min={range.min}
          max={range.max}
          step={1}
          hint={`De ${range.min} a ${range.max} mm`}
          value={settings.marginMm}
          onChange={(event) =>
            onChange({ type: "margin", value: event.target.valueAsNumber })
          }
        />
        <fieldset className="check-group">
          <legend>Campos visibles</legend>
          <p className="check-group__fixed">Tipo, precio, folio y QR: siempre visibles.</p>
          {optionalFields.map(({ name, label }) => (
            <label className="check-field" key={name}>
              <input
                type="checkbox"
                checked={settings.fields[name]}
                onChange={(event) =>
                  onChange({ type: "field", name, value: event.target.checked })
                }
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
        <Field
          id="print-footer"
          label="Pie del boleto"
          maxLength={MAX_TICKET_FOOTER_LENGTH}
          autoComplete="off"
          hint={`Hasta ${MAX_TICKET_FOOTER_LENGTH} caracteres`}
          value={settings.footer}
          onChange={(event) => onChange({ type: "footer", value: event.target.value })}
        />
        <div className="dialog-actions">
          <Button type="button" variant="secondary" onClick={onReset}>
            Restablecer valores
          </Button>
          <Button type="submit">Cerrar</Button>
        </div>
      </form>
    </Dialog>
  );
}
