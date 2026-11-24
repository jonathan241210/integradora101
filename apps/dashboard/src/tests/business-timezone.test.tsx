import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TicketReceipt } from "../components/TicketReceipt";
import { TicketHistoryView } from "../views/TicketHistoryView";
import { TicketReportView } from "../views/TicketReportView";
import { BUSINESS_TIMEZONE_FALLBACK } from "../viewmodels/formatters";
import {
  formatTicketDateTime,
  initialTicketHistoryState,
  loadTicketHistory,
  ticketHistoryReducer,
  type TicketHistoryViewModel,
} from "../viewmodels/ticket-history";
import { defaultTicketPrintSettings } from "../viewmodels/ticket-print-settings";
import {
  initialTicketReportState,
  type TicketReportViewModel,
} from "../viewmodels/ticket-report";
import { formatBusinessLocalDateTime } from "../viewmodels/ticket-prices";
import { createHarness, ticketReport } from "./admin-fixtures";
import {
  createTicketSalesApiMock,
  historyPage,
  historyRow,
  saleDto,
} from "./ticket-sales-fixtures";

/** dashboard-019: la presentación usa la zona de la API, nunca la del navegador. */

const PURCHASED = "2026-11-07T05:30:00Z";
const originalTz = process.env.TZ;

afterEach(() => {
  if (originalTz === undefined) delete process.env.TZ;
  else process.env.TZ = originalTz;
  vi.restoreAllMocks();
});

const historyActions: TicketHistoryViewModel["actions"] = {
  applyFilters: vi.fn(),
  goToPage: vi.fn(),
  reload: vi.fn(),
  openCancel: vi.fn(),
  closeCancel: vi.fn(),
  changeReasonCode: vi.fn(),
  changeReason: vi.fn(),
  confirmCancel: vi.fn(),
  dismissNotice: vi.fn(),
};

function renderHistory(timezone: string) {
  const state = ticketHistoryReducer(initialTicketHistoryState, {
    type: "loaded",
    rows: [historyRow({ purchased_at: PURCHASED })],
    meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 },
    timezone,
  });

  return renderToStaticMarkup(<TicketHistoryView state={state} actions={historyActions} />);
}

describe("dashboard-019 single-business-timezone", () => {
  it("CA-01 single-business-timezone: fecha de compra en la zona de la API aunque el navegador esté en America/Tijuana", () => {
    process.env.TZ = "America/Tijuana";

    expect(renderHistory("America/Mexico_City")).toContain("06/11/2026 23:30");
    expect(formatTicketDateTime(PURCHASED, "America/Mexico_City")).toBe("06/11/2026 23:30");
  });

  it("CA-02 single-business-timezone: el navegador no cambia la presentación", () => {
    const texts = ["Europe/Madrid", "America/Mexico_City"].map((browser) => {
      process.env.TZ = browser;

      return formatTicketDateTime(PURCHASED, "America/Mexico_City");
    });

    expect(texts).toEqual(["06/11/2026 23:30", "06/11/2026 23:30"]);
  });

  it("CA-01 single-business-timezone: el historial guarda la zona de la respuesta y usa el respaldo fijo si falta", async () => {
    const api = createTicketSalesApiMock();
    api.history.list.mockResolvedValueOnce({ ...historyPage([historyRow()]), timezone: "America/Tijuana" });
    const h = createHarness(ticketHistoryReducer, initialTicketHistoryState);

    await loadTicketHistory(api, h.dispatch, { page: 1 });
    expect(h.state.timezone).toBe("America/Tijuana");

    const { timezone: _omitted, ...withoutZone } = historyPage([historyRow()]);
    api.history.list.mockResolvedValueOnce(withoutZone);
    await loadTicketHistory(api, h.dispatch, { page: 1 });
    expect(h.state.timezone).toBe(BUSINESS_TIMEZONE_FALLBACK);
    expect(BUSINESS_TIMEZONE_FALLBACK).toBe("America/Mexico_City");
  });

  it("CA-01 single-business-timezone: el recibo de venta presenta la hora en la zona de la respuesta (D-02)", () => {
    process.env.TZ = "Asia/Tokyo";
    const ticket = saleDto().tickets[0];
    const markup = renderToStaticMarkup(
      <TicketReceipt
        ticket={{ ...ticket, purchased_at: PURCHASED }}
        timezone="America/Mexico_City"
        settings={defaultTicketPrintSettings}
      />,
    );

    expect(markup).toContain("06/11/2026 23:30");
  });

  it("CA-03 single-business-timezone: panel y reporte presentan con su zona sin recalcular", () => {
    process.env.TZ = "Asia/Tokyo";
    const report = ticketReport({
      period: { ...ticketReport().period, timezone: "America/Mexico_City" },
    });
    const actions: TicketReportViewModel["actions"] = {
      selectPeriod: vi.fn(),
      applyCustomRange: vi.fn(),
      goToReferenceDate: vi.fn(),
      goToPage: vi.fn(),
      reload: vi.fn(),
      exportAs: vi.fn(),
    };
    const markup = renderToStaticMarkup(
      <TicketReportView
        state={{ ...initialTicketReportState, status: "ready", report }}
        actions={actions}
      />,
    );

    // La hora de la fila llega ya en la zona de la API (`Y-m-d H:i:s`) y no se desplaza.
    expect(markup).toContain("26 oct 2026, 10:15");
    expect(markup).toContain("26 oct – 1 nov 2026");
    expect(markup).toContain("$450.00");
    expect(markup).toContain("$200.00");
    // El «hoy» del panel viene de la API; las series por día se leen sin zona.
    expect(report.period.timezone).toBe("America/Mexico_City");
  });

  it("CA-03 single-business-timezone: la fecha de un precio programado sin desfase se muestra tal cual", () => {
    process.env.TZ = "Asia/Tokyo";

    expect(formatBusinessLocalDateTime("2026-11-07T00:00:00")).toBe("07/11/2026 00:00");
    expect(formatBusinessLocalDateTime("2026-11-07T05:30:00Z")).toBe("06/11/2026 23:30");
  });

  it("CA-06 single-business-timezone: el código de src y api-client no usa resolvedOptions ni getTimezoneOffset", () => {
    const roots = [
      fileURLToPath(new URL("..", import.meta.url)),
      fileURLToPath(new URL("../../../../packages/api-client", import.meta.url)),
    ];
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (name === "node_modules" || name === "tests") continue;
        const path = join(dir, name);

        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|tsx)$/.test(name)) files.push(path);
      }
    };

    roots.forEach(walk);
    expect(files.length).toBeGreaterThan(20);

    for (const file of files) {
      const source = readFileSync(file, "utf8");

      expect(source, file).not.toMatch(/resolvedOptions|getTimezoneOffset/);
    }
  });
});

describe("CA-09 single-business-timezone", () => {
  it("CA-09 single-business-timezone: cada CA-01 a CA-08 de dashboard-019 aparece nombrado en algún test", () => {
    const folder = fileURLToPath(new URL(".", import.meta.url));
    const source = readdirSync(folder)
      .filter((name) => name.endsWith(".test.tsx"))
      .map((name) => readFileSync(join(folder, name), "utf8"))
      .join("\n");
    const missing: string[] = [];

    for (let number = 1; number <= 8; number += 1) {
      const tag = `CA-${String(number).padStart(2, "0")} single-business-timezone`;

      if (!source.includes(tag)) missing.push(tag);
    }

    expect(missing).toEqual([]);
  });
});
