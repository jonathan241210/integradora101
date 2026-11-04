/**
 * Configuración de impresión del boleto (dashboard-005 CA-27 a CA-29, RN-12).
 * Es una preferencia del equipo: se guarda en `localStorage` bajo
 * `arca:ticket-print-settings`. No contiene ventas, tokens ni SVG.
 */

export type TicketPrintFormat = "thermal" | "letter";
export type TicketPaperWidth = 58 | 80;
export type TicketFontSize = "small" | "normal" | "large";

/** Campos opcionales; el folio y el QR siempre se imprimen (CA-27). */
export type TicketPrintFields = {
  dateTime: boolean;
  quantities: boolean;
  total: boolean;
  cashier: boolean;
  footer: boolean;
};

export type TicketPrintSettings = {
  format: TicketPrintFormat;
  paperWidth: TicketPaperWidth;
  fontSize: TicketFontSize;
  marginMm: number;
  fields: TicketPrintFields;
  footer: string;
};

export const TICKET_PRINT_SETTINGS_KEY = "arca:ticket-print-settings";
export const DEFAULT_TICKET_FOOTER = "Zoológico Nicolás Bravo, Tulancingo";
export const MAX_TICKET_FOOTER_LENGTH = 80;

export const MARGIN_RANGE_MM: Record<
  TicketPrintFormat,
  { min: number; max: number; default: number }
> = {
  thermal: { min: 0, max: 10, default: 2 },
  letter: { min: 0, max: 20, default: 15 },
};

export const defaultTicketPrintSettings: TicketPrintSettings = {
  format: "thermal",
  paperWidth: 80,
  fontSize: "normal",
  marginMm: MARGIN_RANGE_MM.thermal.default,
  fields: {
    dateTime: true,
    quantities: true,
    total: true,
    cashier: true,
    footer: true,
  },
  footer: DEFAULT_TICKET_FOOTER,
};

const formats: TicketPrintFormat[] = ["thermal", "letter"];
const fontSizes: TicketFontSize[] = ["small", "normal", "large"];
const fieldNames = Object.keys(
  defaultTicketPrintSettings.fields,
) as (keyof TicketPrintFields)[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isMarginInRange(
  format: TicketPrintFormat,
  margin: number,
): boolean {
  const range = MARGIN_RANGE_MM[format];

  return Number.isFinite(margin) && margin >= range.min && margin <= range.max;
}

/**
 * Valida campo a campo: conserva los válidos y rellena los inválidos con su
 * valor por defecto (CA-28). Nunca lanza.
 */
export function parseTicketPrintSettings(raw: unknown): TicketPrintSettings {
  const defaults = defaultTicketPrintSettings;

  if (!isRecord(raw)) {
    return { ...defaults, fields: { ...defaults.fields } };
  }

  const format = formats.includes(raw.format as TicketPrintFormat)
    ? (raw.format as TicketPrintFormat)
    : defaults.format;
  const paperWidth =
    raw.paperWidth === 58 || raw.paperWidth === 80
      ? raw.paperWidth
      : defaults.paperWidth;
  const fontSize = fontSizes.includes(raw.fontSize as TicketFontSize)
    ? (raw.fontSize as TicketFontSize)
    : defaults.fontSize;
  const marginMm =
    typeof raw.marginMm === "number" && isMarginInRange(format, raw.marginMm)
      ? raw.marginMm
      : MARGIN_RANGE_MM[format].default;
  const footer =
    typeof raw.footer === "string" && raw.footer.length <= MAX_TICKET_FOOTER_LENGTH
      ? raw.footer
      : defaults.footer;
  const rawFields = isRecord(raw.fields) ? raw.fields : {};
  const fields = { ...defaults.fields };

  for (const name of fieldNames) {
    if (typeof rawFields[name] === "boolean") fields[name] = rawFields[name];
  }

  return { format, paperWidth, fontSize, marginMm, fields, footer };
}

/** Solo las claves conocidas: no se persiste nada que no sea configuración. */
export function serializeTicketPrintSettings(
  settings: TicketPrintSettings,
): string {
  const { format, paperWidth, fontSize, marginMm, fields, footer } = settings;

  return JSON.stringify({ format, paperWidth, fontSize, marginMm, fields, footer });
}

export type TicketPrintChange =
  | { type: "format"; value: TicketPrintFormat }
  | { type: "paper-width"; value: TicketPaperWidth }
  | { type: "font-size"; value: TicketFontSize }
  | { type: "margin"; value: number }
  | { type: "field"; name: keyof TicketPrintFields; value: boolean }
  | { type: "footer"; value: string };

/** Aplica un cambio respetando rangos y límites; los valores inválidos se ignoran o ajustan. */
export function changeTicketPrintSettings(
  settings: TicketPrintSettings,
  change: TicketPrintChange,
): TicketPrintSettings {
  switch (change.type) {
    case "format":
      return change.value === settings.format
        ? settings
        : {
            ...settings,
            format: change.value,
            marginMm: MARGIN_RANGE_MM[change.value].default,
          };
    case "paper-width":
      return { ...settings, paperWidth: change.value };
    case "font-size":
      return { ...settings, fontSize: change.value };
    case "margin": {
      if (!Number.isFinite(change.value)) return settings;
      const range = MARGIN_RANGE_MM[settings.format];

      return {
        ...settings,
        marginMm: Math.min(range.max, Math.max(range.min, change.value)),
      };
    }
    case "field":
      return {
        ...settings,
        fields: { ...settings.fields, [change.name]: change.value },
      };
    case "footer":
      return {
        ...settings,
        footer: change.value.slice(0, MAX_TICKET_FOOTER_LENGTH),
      };
  }
}

/** Variables CSS del boleto (`--ticket-width`, `--ticket-margin`, `--ticket-font`). */
export function ticketReceiptStyle(
  settings: TicketPrintSettings,
): Record<string, string> {
  const fontSize = { small: "10pt", normal: "12pt", large: "14pt" }[
    settings.fontSize
  ];

  return {
    "--ticket-width":
      settings.format === "thermal" ? `${settings.paperWidth}mm` : "100%",
    "--ticket-margin": `${settings.marginMm}mm`,
    "--ticket-font": fontSize,
  };
}

/** Adaptador mínimo de almacenamiento; inyectable en pruebas. */
export type SettingsStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

/**
 * Envuelve `localStorage` en `try/catch`: si no existe o lanza (modo privado,
 * cuota, política del navegador) lee `null` y escribe sin efecto.
 */
export function createSafeStorage(
  getStorage: () => SettingsStorage | undefined = () => window.localStorage,
): SettingsStorage {
  return {
    getItem(key) {
      try {
        return getStorage()?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      try {
        getStorage()?.setItem(key, value);
      } catch {
        // Sin almacenamiento disponible: la preferencia solo vive en memoria.
      }
    },
  };
}

export function loadTicketPrintSettings(
  storage: SettingsStorage = createSafeStorage(),
): TicketPrintSettings {
  let parsed: unknown;

  try {
    const stored = storage.getItem(TICKET_PRINT_SETTINGS_KEY);
    parsed = stored === null ? undefined : JSON.parse(stored);
  } catch {
    parsed = undefined;
  }

  return parseTicketPrintSettings(parsed);
}

export function saveTicketPrintSettings(
  settings: TicketPrintSettings,
  storage: SettingsStorage = createSafeStorage(),
): void {
  try {
    storage.setItem(
      TICKET_PRINT_SETTINGS_KEY,
      serializeTicketPrintSettings(settings),
    );
  } catch {
    // Nunca bloquea la venta por no poder guardar la preferencia.
  }
}
