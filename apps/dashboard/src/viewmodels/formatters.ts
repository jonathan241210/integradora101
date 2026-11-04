/**
 * Formato de presentación. No calcula nada: las cifras llegan de la API y
 * los importes son cadenas que solo se muestran como moneda.
 */
const currency = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export function formatCurrency(amount: string | number): string {
  const value = typeof amount === "number" ? amount : Number(amount);

  return Number.isFinite(value) ? currency.format(value) : String(amount);
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("es-MX").format(value);
}

const shortDate = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** Fecha `YYYY-MM-DD` sin desplazarla por la zona horaria del navegador. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));

  return Number.isNaN(date.getTime()) ? value : shortDate.format(date);
}

const zonedDateTime = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Mexico_City",
});

/** Fecha y hora; sin desfase si la API envía hora local sin zona. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Nunca";

  if (/(?:Z|[+-]\d{2}:?\d{2})$/.test(value)) {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? value : zonedDateTime.format(date);
  }

  const match = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/.exec(value);

  return match ? `${formatDate(match[1])}, ${match[2]}` : value;
}

/** Hora `HH:MM[:SS]` recortada a `HH:MM`. */
export function formatTime(value: string | null | undefined): string {
  return value ? value.slice(0, 5) : "";
}

const weekday = new Intl.DateTimeFormat("es-MX", {
  weekday: "short",
  timeZone: "UTC",
});

/** Día de la semana abreviado de una fecha `YYYY-MM-DD`. */
export function formatWeekday(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));

  return Number.isNaN(date.getTime()) ? value : weekday.format(date);
}
