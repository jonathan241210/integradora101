import { useEffect, useState, type FormEvent } from "react";
import { Button, Field } from "@arca/ui";
import { FieldErrors, fieldErrorProps, type FieldErrorMap } from "@/components/FieldErrors";
import type { ReportPeriodType } from "@/viewmodels/admin-types";
import { reportPeriodOptions } from "@/viewmodels/report-period";

/**
 * Selector de periodo compartido por Boletos y Cancelaciones (dashboard-020 CA-15). No
 * calcula periodos ni fechas: entrega lo elegido y la API resuelve el periodo (RN-02).
 * Los 422 de periodo se muestran junto a los controles.
 */
export function ReportPeriodControls({
  period,
  from = "",
  to = "",
  periodLabel,
  previousDate,
  nextDate,
  busy = false,
  errors = {},
  onSelectPeriod,
  onApplyRange,
  onGoToDate,
}: {
  period: ReportPeriodType;
  from?: string;
  to?: string;
  periodLabel?: string;
  previousDate?: string | null;
  nextDate?: string | null;
  busy?: boolean;
  errors?: FieldErrorMap;
  onSelectPeriod: (period: "week" | "month") => void;
  onApplyRange: (from: string, to: string) => void;
  onGoToDate: (date: string) => void;
}) {
  const [customOpen, setCustomOpen] = useState(period === "custom");
  const [rangeFrom, setRangeFrom] = useState(from);
  const [rangeTo, setRangeTo] = useState(to);

  useEffect(() => {
    setRangeFrom(from);
    setRangeTo(to);
  }, [from, to]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onApplyRange(rangeFrom, rangeTo);
  };
  const messages = [errors.period, errors.date].flat().filter(Boolean) as string[];

  return (
    <>
      <div className="report-controls__row">
        <div className="report-controls__group" role="group" aria-label="Tipo de periodo">
          {reportPeriodOptions.map((option) => {
            if (option.value === "custom") {
              return (
                <Button
                  key={option.value}
                  variant={period === "custom" ? "primary" : "ghost"}
                  aria-pressed={period === "custom"}
                  aria-expanded={customOpen}
                  aria-controls="report-custom-range"
                  onClick={() => setCustomOpen((open) => !open)}
                >
                  {option.label}
                </Button>
              );
            }

            const value = option.value as "week" | "month";

            return (
              <Button
                key={option.value}
                variant={period === value ? "primary" : "secondary"}
                aria-pressed={period === value}
                onClick={() => {
                  setCustomOpen(false);
                  onSelectPeriod(value);
                }}
              >
                {option.label}
              </Button>
            );
          })}
        </div>
        <div className="report-controls__group" role="group" aria-label="Navegación entre periodos">
          <Button
            variant="secondary"
            disabled={!previousDate || busy}
            onClick={() => previousDate && onGoToDate(previousDate)}
          >
            Periodo anterior
          </Button>
          <Button
            variant="secondary"
            disabled={!nextDate || busy}
            onClick={() => nextDate && onGoToDate(nextDate)}
          >
            Periodo siguiente
          </Button>
        </div>
      </div>
      {messages.length > 0 && (
        <p className="field-error" id="report-period-error">
          {messages.join(" ")}
        </p>
      )}
      {customOpen && (
        <form id="report-custom-range" className="filter-form filter-form--range" onSubmit={submit}>
          <Field
            id="report-from"
            label="Fecha desde"
            type="date"
            required
            value={rangeFrom}
            onChange={(event) => setRangeFrom(event.target.value)}
            {...fieldErrorProps("report-from", errors, "from")}
          />
          <FieldErrors id="report-from" errors={errors} name="from" />
          <Field
            id="report-to"
            label="Fecha hasta"
            type="date"
            required
            value={rangeTo}
            onChange={(event) => setRangeTo(event.target.value)}
            {...fieldErrorProps("report-to", errors, "to")}
          />
          <FieldErrors id="report-to" errors={errors} name="to" />
          <div className="filter-actions">
            <Button type="submit" disabled={!rangeFrom || !rangeTo}>
              Aplicar rango
            </Button>
          </div>
        </form>
      )}
      {periodLabel && (
        <p className="report-period-label" aria-live="polite">
          <strong>{periodLabel}</strong>
        </p>
      )}
    </>
  );
}
