import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PrintSettingsDialog } from "../components/PrintSettingsDialog";
import { TicketReceipt } from "../components/TicketReceipt";
import {
  DEFAULT_TICKET_FOOTER,
  MAX_TICKET_FOOTER_LENGTH,
  TICKET_PRINT_SETTINGS_KEY,
  changeTicketPrintSettings,
  createSafeStorage,
  defaultTicketPrintSettings,
  loadTicketPrintSettings,
  parseTicketPrintSettings,
  saveTicketPrintSettings,
  serializeTicketPrintSettings,
  ticketReceiptStyle,
  type SettingsStorage,
  type TicketPrintSettings,
} from "../viewmodels/ticket-print-settings";
import { saleDto, withFields } from "./ticket-sales-fixtures";

function memoryStorage(initial?: string) {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set(TICKET_PRINT_SETTINGS_KEY, initial);

  const storage: SettingsStorage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => void values.set(key, value)),
  };

  return { storage, values };
}

const throwingStorage: SettingsStorage = {
  getItem: () => {
    throw new DOMException("denegado", "SecurityError");
  },
  setItem: () => {
    throw new DOMException("cuota", "QuotaExceededError");
  },
};

const letter = changeTicketPrintSettings(defaultTicketPrintSettings, {
  type: "format",
  value: "letter",
});

function renderDialog(settings: TicketPrintSettings) {
  return renderToStaticMarkup(
    <PrintSettingsDialog
      open
      settings={settings}
      onChange={() => undefined}
      onReset={() => undefined}
      onClose={() => undefined}
    />,
  );
}

describe("CA-27 ticket-sales", () => {
  it("define los valores por defecto: térmica 80 mm, fuente normal, campos activos y pie predeterminado", () => {
    expect(defaultTicketPrintSettings).toMatchObject({
      format: "thermal",
      paperWidth: 80,
      fontSize: "normal",
      marginMm: 2,
      footer: "Zoológico Nicolás Bravo, Tulancingo",
    });
    expect(DEFAULT_TICKET_FOOTER).toBe("Zoológico Nicolás Bravo, Tulancingo");
    expect(Object.values(defaultTicketPrintSettings.fields).every(Boolean)).toBe(true);
  });

  it("márgenes por defecto de 2 mm en térmica y 15 mm en carta con rangos de 0 a 10 y de 0 a 20", () => {
    expect(letter.marginMm).toBe(15);
    expect(changeTicketPrintSettings(defaultTicketPrintSettings, { type: "margin", value: 50 }).marginMm).toBe(10);
    expect(changeTicketPrintSettings(letter, { type: "margin", value: 20 }).marginMm).toBe(20);
    expect(changeTicketPrintSettings(letter, { type: "margin", value: 99 }).marginMm).toBe(20);
    expect(changeTicketPrintSettings(letter, { type: "margin", value: -3 }).marginMm).toBe(0);
    expect(parseTicketPrintSettings({ format: "thermal", marginMm: 15 }).marginMm).toBe(2);
    expect(parseTicketPrintSettings({ format: "letter", marginMm: 15 }).marginMm).toBe(15);
  });

  it("limita el pie a 80 caracteres y permite dejarlo vacío", () => {
    const long = changeTicketPrintSettings(defaultTicketPrintSettings, {
      type: "footer",
      value: "x".repeat(200),
    });

    expect(long.footer).toHaveLength(MAX_TICKET_FOOTER_LENGTH);
    expect(changeTicketPrintSettings(long, { type: "footer", value: "" }).footer).toBe("");
    expect(parseTicketPrintSettings({ footer: "" }).footer).toBe("");
    expect(parseTicketPrintSettings({ footer: "y".repeat(81) }).footer).toBe(DEFAULT_TICKET_FOOTER);
  });

  it("ofrece formato, ancho (solo térmica), fuente, márgenes, campos y pie con etiquetas en español", () => {
    const thermal = renderDialog(defaultTicketPrintSettings);
    const paper = renderDialog(letter);

    for (const label of ["Formato", "Ancho de papel", "Tamaño de fuente", "Márgenes (mm)", "Pie del boleto"]) {
      expect(thermal).toContain(label);
    }
    expect(thermal).toContain("Hoja carta");
    expect(thermal).toContain("58 mm");
    expect(thermal).toMatch(/id="print-margin"[^>]*min="0" max="10"/);
    expect(paper).not.toContain("Ancho de papel");
    expect(paper).toMatch(/id="print-margin"[^>]*min="0" max="20"/);
    expect(thermal).toMatch(/id="print-footer"[^>]*maxLength="80"/);
    expect(thermal.match(/type="checkbox"/g)).toHaveLength(5);
    expect(thermal).toContain("Folio y QR: siempre visibles.");
    expect(thermal).toContain("Configurar impresión");
  });

  it("expone las variables CSS del boleto según el formato", () => {
    expect(ticketReceiptStyle(defaultTicketPrintSettings)).toEqual({
      "--ticket-width": "80mm",
      "--ticket-margin": "2mm",
      "--ticket-font": "12pt",
    });
    expect(
      ticketReceiptStyle(changeTicketPrintSettings(defaultTicketPrintSettings, { type: "paper-width", value: 58 }))["--ticket-width"],
    ).toBe("58mm");
    expect(ticketReceiptStyle(letter)["--ticket-width"]).toBe("100%");
  });
});

describe("CA-28 ticket-sales", () => {
  it("guarda en arca:ticket-print-settings solo la configuración, sin ventas, tokens ni SVG", () => {
    const { storage, values } = memoryStorage();
    const changed = changeTicketPrintSettings(defaultTicketPrintSettings, { type: "font-size", value: "large" });

    saveTicketPrintSettings(changed, storage);

    expect(storage.setItem).toHaveBeenCalledWith("arca:ticket-print-settings", expect.any(String));
    expect(Object.keys(JSON.parse(values.get("arca:ticket-print-settings") as string))).toEqual([
      "format",
      "paperWidth",
      "fontSize",
      "marginMm",
      "fields",
      "footer",
    ]);
    expect(serializeTicketPrintSettings(changed)).not.toMatch(/qr|token|folio|svg/i);
    expect(loadTicketPrintSettings(storage).fontSize).toBe("large");
  });

  it("si localStorage lanza una excepción usa los valores por defecto sin error", () => {
    expect(loadTicketPrintSettings(throwingStorage)).toEqual(defaultTicketPrintSettings);
    expect(() => saveTicketPrintSettings(letter, throwingStorage)).not.toThrow();

    const safe = createSafeStorage(() => {
      throw new Error("localStorage no disponible");
    });

    expect(safe.getItem("k")).toBeNull();
    expect(() => safe.setItem("k", "v")).not.toThrow();
    expect(loadTicketPrintSettings(safe)).toEqual(defaultTicketPrintSettings);
  });

  it("un JSON inválido produce los valores por defecto", () => {
    expect(loadTicketPrintSettings(memoryStorage("{no-json").storage)).toEqual(defaultTicketPrintSettings);
    expect(loadTicketPrintSettings(memoryStorage('"texto"').storage)).toEqual(defaultTicketPrintSettings);
  });

  it("un campo inválido se reemplaza por su valor por defecto y se conservan los válidos", () => {
    const stored = JSON.stringify({
      format: "letter",
      paperWidth: 70,
      fontSize: "large",
      marginMm: 500,
      fields: { total: false, cashier: "sí" },
      footer: "Pie propio",
    });
    const result = loadTicketPrintSettings(memoryStorage(stored).storage);

    expect(result.format).toBe("letter");
    expect(result.fontSize).toBe("large");
    expect(result.footer).toBe("Pie propio");
    expect(result.fields.total).toBe(false);
    expect(result.paperWidth).toBe(80);
    expect(result.marginMm).toBe(15);
    expect(result.fields.cashier).toBe(true);
  });
});

describe("CA-29 ticket-sales", () => {
  const settingsList: [string, TicketPrintSettings][] = [
    ["térmica", withFields(defaultTicketPrintSettings, false)],
    ["carta", withFields(letter, false)],
  ];

  it.each(settingsList)(
    "muestra folio y QR en %s incluso con todos los opcionales desactivados",
    (_name, settings) => {
      const markup = renderToStaticMarkup(<TicketReceipt ticket={saleDto()} settings={settings} />);

      expect(markup).toContain("Folio <strong>123</strong>");
      expect(markup).toMatch(/<img[^>]*src="data:image\/svg\+xml/);
      expect(markup).not.toContain("Total");
      expect(markup).not.toContain("Cajero");
      expect(markup).not.toContain("Adultos");
      expect(markup).not.toContain(DEFAULT_TICKET_FOOTER);
      expect(markup).toContain(`ticket-receipt--${settings.format}`);
    },
  );

  it("muestra solo los campos activados y no cambia cantidades, total ni QR", () => {
    const full = renderToStaticMarkup(<TicketReceipt ticket={saleDto()} settings={defaultTicketPrintSettings} />);
    const letterFull = renderToStaticMarkup(<TicketReceipt ticket={saleDto()} settings={letter} />);
    const onlyTotal = renderToStaticMarkup(
      <TicketReceipt
        ticket={saleDto()}
        settings={changeTicketPrintSettings(withFields(defaultTicketPrintSettings, false), {
          type: "field",
          name: "total",
          value: true,
        })}
      />,
    );
    const qr = (markup: string) => /src="(data:image[^"]+)"/.exec(markup)?.[1];

    expect(full).toContain("$66.00");
    expect(full).toContain("2 × $25.00");
    expect(full).toContain(DEFAULT_TICKET_FOOTER);
    expect(letterFull).toContain("$66.00");
    expect(letterFull).toContain("2 × $25.00");
    expect(onlyTotal).toContain("$66.00");
    expect(onlyTotal).not.toContain("2 × $25.00");
    expect(qr(full)).toBe(qr(letterFull));
    expect(qr(full)).toBe(qr(onlyTotal));
    expect(full).toContain('style="--ticket-width:80mm;--ticket-margin:2mm;--ticket-font:12pt"');
  });
});
