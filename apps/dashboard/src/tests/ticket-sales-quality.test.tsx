import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TicketHistoryView } from "../views/TicketHistoryView";
import { TicketPricesView } from "../views/TicketPricesView";
import { TicketSaleView } from "../views/TicketSaleView";
import { authSessionReducer, initialAuthSessionState } from "../viewmodels/auth-session";
import {
  cancelTicket,
  initialTicketHistoryState,
  loadTicketHistory,
  ticketHistoryReducer,
  type TicketHistoryViewModel,
} from "../viewmodels/ticket-history";
import {
  initialTicketPricesState,
  loadTicketPrices,
  submitPriceChange,
  ticketPricesReducer,
  type TicketPricesViewModel,
} from "../viewmodels/ticket-prices";
import {
  initialTicketSaleState,
  requestSaleQuote,
  submitSale,
  ticketSaleReducer,
  type TicketSaleViewModel,
} from "../viewmodels/ticket-sale";
import { apiError, createHarness } from "./admin-fixtures";
import {
  createTicketSalesApiMock,
  historyRow,
  printSettingsViewModel,
  quoteDto,
} from "./ticket-sales-fixtures";

const srcDirectory = fileURLToPath(new URL("..", import.meta.url));
const read = (path: string) => readFileSync(`${srcDirectory}${path}`, "utf8");
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const presentationFiles = [
  "views/TicketSaleView.tsx",
  "views/TicketHistoryView.tsx",
  "views/TicketPricesView.tsx",
  "components/TicketReceipt.tsx",
  "components/PrintSettingsDialog.tsx",
  "components/CancelTicketDialog.tsx",
  "components/ConfirmDialog.tsx",
  "sections/TicketSaleSection.tsx",
  "sections/TicketHistorySection.tsx",
  "sections/TicketPricesSection.tsx",
].map((file) => ({ file, source: stripComments(read(file)) }));

const styles = read("styles.css");
const ticketStyles = styles.slice(styles.indexOf("dashboard-005 · ticket-sales"));

const noop = () => undefined;
const saleActions: TicketSaleViewModel["actions"] = {
  changeQuantity: noop,
  requestConfirmation: noop,
  cancelConfirmation: noop,
  confirm: noop,
  print: noop,
  newSale: noop,
  reloadPrices: noop,
};
const historyActions: TicketHistoryViewModel["actions"] = {
  applyFilters: noop,
  goToPage: noop,
  reload: noop,
  openCancel: noop,
  closeCancel: noop,
  changeReason: noop,
  confirmCancel: noop,
  dismissNotice: noop,
};
const pricesActions: TicketPricesViewModel["actions"] = {
  changeForm: noop,
  requestConfirmation: noop,
  cancelConfirmation: noop,
  confirm: noop,
  reload: noop,
  dismissNotice: noop,
};

describe("CA-21 ticket-sales", () => {
  it("views, components y sections no usan fetch, axios, servicios ni @arca/api-client", () => {
    expect(presentationFiles).toHaveLength(10);

    for (const { file, source } of presentationFiles) {
      expect(source, file).not.toMatch(/\bfetch\s*\(/);
      expect(source, file).not.toMatch(/\baxios\b/);
      expect(source, file).not.toMatch(/from\s+["']@arca\/api-client["']/);
      expect(source, file).not.toMatch(/from\s+["'](?:@|\.\.?)\/services\//);
      expect(source, file).not.toContain("dangerouslySetInnerHTML");
    }
  });

  it("no calculan totales, precios, permisos ni reglas de cancelación", () => {
    for (const { file, source } of presentationFiles) {
      expect(source, file).not.toMatch(/\.reduce\(/);
      expect(source, file).not.toMatch(/\bpermissions\b/);
      expect(source, file).not.toMatch(/\b(?:parseFloat|toFixed)\b/);
      expect(source, file).not.toMatch(/\w\s\*\s\w/);
      expect(source, file).not.toMatch(/\bnew Date\b|Date\.now/);
    }
  });

  it("hay un hook ViewModel por sección que usa ticketSalesApi", () => {
    for (const hook of ["useTicketSale", "useTicketHistory", "useTicketPrices"]) {
      const source = read(`viewmodels/${hook}.ts`);

      expect(source, hook).toContain('from "@/services/arca-api"');
      expect(source, hook).toContain("ticketSalesApi");
    }
    expect(read("services/arca-api.ts")).toContain("createTicketSalesApi");
  });

  it("los ViewModels reciben el cliente como parámetro y se prueban con un cliente simulado", async () => {
    const api = createTicketSalesApiMock();
    const history = createHarness(ticketHistoryReducer, initialTicketHistoryState);

    await loadTicketHistory(api, history.dispatch, { page: 1 });

    expect(history.state.status).toBe("ready");
  });

  it("(CA-08) ningún archivo de la venta fija el tope (50 o el 100 anterior) ni max en los controles de cantidad", () => {
    for (const { file, source } of presentationFiles) {
      expect(source, file).not.toMatch(/\b(?:100|50)\b/);
    }

    const saleFiles = presentationFiles.filter(({ file }) =>
      /TicketSale(?:View|Section)|TicketReceipt/.test(file),
    );

    expect(saleFiles.length).toBeGreaterThanOrEqual(3);

    for (const { file, source } of saleFiles) {
      expect(source, file).not.toMatch(/\bmax\s*=/);
      expect(source, file).not.toMatch(/\bmax\s*:/);
    }
  });
});

describe("CA-38 ticket-sales", () => {
  it("ningún archivo de la venta suma, multiplica ni reparte importes", () => {
    const saleFiles = presentationFiles.filter(({ file }) =>
      /TicketSale|TicketReceipt|ConfirmDialog/.test(file),
    );

    expect(saleFiles.length).toBeGreaterThanOrEqual(4);
    for (const { file, source } of saleFiles) {
      expect(source, file).not.toMatch(/\w\s[+*]\s\w/);
      expect(source, file).not.toMatch(/[+*/]=/);
      expect(source, file).not.toMatch(/\.reduce\(|\bparseFloat\b|\btoFixed\b|\bNumber\(/);
      expect(source, file).not.toMatch(/\bMath\./);
    }
  });
});

describe("CA-39 ticket-sales", () => {
  it("la lista de folios tiene desplazamiento propio y no desborda la página; la impresión no la recorta", () => {
    expect(ticketStyles).toMatch(/\.ticket-folio-list\s*\{[^}]*max-height:[^}]*overflow-y:\s*auto[^}]*overflow-x:\s*hidden/s);
    expect(ticketStyles).toMatch(/\.ticket-print-area\s*\{\s*display:\s*none/);
  });
});

describe("CA-22 ticket-sales", () => {
  it("un 401 en venta, historial, cancelación y precios no muestra error local", async () => {
    const api = createTicketSalesApiMock();
    const unauthorized = apiError(401, "Unauthenticated.");
    api.sales.create.mockRejectedValue(unauthorized);
    api.history.list.mockRejectedValue(unauthorized);
    api.history.cancel.mockRejectedValue(unauthorized);
    api.prices.current.mockRejectedValue(unauthorized);
    api.prices.schedule.mockRejectedValue(unauthorized);

    const sale = createHarness(ticketSaleReducer, initialTicketSaleState);
    for (const action of [
      { type: "quantity-changed", field: "adults", value: "1" },
      { type: "confirmation-requested" },
      { type: "quote-loaded", requestId: 1, quote: quoteDto() },
    ] as const) {
      sale.dispatch(action);
    }
    await submitSale(api, sale.dispatch, () => sale.state);

    const quoting = createHarness(ticketSaleReducer, initialTicketSaleState);
    quoting.dispatch({ type: "quantity-changed", field: "adults", value: "1" });
    api.sales.quote.mockRejectedValue(unauthorized);
    await requestSaleQuote(api, quoting.dispatch, () => quoting.state);

    expect(api.sales.create).toHaveBeenCalledOnce();
    expect(quoting.state.step).toBe("idle");
    expect(quoting.state.quote.error).toBe("");
    expect(quoting.state.error).toBe("");

    const history = createHarness(ticketHistoryReducer, initialTicketHistoryState);
    await loadTicketHistory(api, history.dispatch, { page: 1 });
    history.dispatch({ type: "cancel-opened", target: historyRow() });
    await cancelTicket(api, history.dispatch, historyRow(), "Motivo", { page: 1 });

    const prices = createHarness(ticketPricesReducer, initialTicketPricesState);
    await loadTicketPrices(api, prices.dispatch);
    await submitPriceChange(api, prices.dispatch, {
      adult_amount: "1",
      child_amount: "1",
      mode: "immediate",
    });

    expect(sale.state.error).toBe("");
    expect(history.state.status).toBe("loading");
    expect(history.state.cancel.error).toBe("");
    expect(prices.state.status).toBe("loading");
    expect(prices.state.actionError).toBe("");
  });

  it("el manejador global de sesión lleva al login con «Tu sesión expiró»", () => {
    const state = authSessionReducer(initialAuthSessionState, {
      type: "unauthorized",
      sessionExpired: true,
    });

    expect(state.status).toBe("anonymous");
    expect(state.error).toContain("Tu sesión expiró");
    expect(read("services/arca-api.ts")).toContain("onUnauthorized");
    expect(read("viewmodels/useAuthSession.ts")).toContain("setUnauthorizedHandler");
  });
});

describe("CA-23 ticket-sales", () => {
  const sale = renderToStaticMarkup(
    <TicketSaleView
      state={initialTicketSaleState}
      actions={saleActions}
      printSettings={printSettingsViewModel()}
    />,
  );
  const history = renderToStaticMarkup(
    <TicketHistoryView
      state={ticketHistoryReducer(initialTicketHistoryState, {
        type: "loaded",
        rows: [historyRow()],
        meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 },
      })}
      actions={historyActions}
    />,
  );
  const prices = renderToStaticMarkup(
    <TicketPricesView state={initialTicketPricesState} actions={pricesActions} />,
  );

  it("los diálogos tienen aria-labelledby y título", () => {
    for (const markup of [sale, history, prices]) {
      const dialogs = markup.match(/<dialog[^>]*>/g) ?? [];

      expect(dialogs.length).toBeGreaterThan(0);
      for (const dialog of dialogs) {
        const id = /aria-labelledby="([^"]+)"/.exec(dialog)?.[1];

        expect(id).toBeTruthy();
        expect(markup).toContain(`id="${id}"`);
      }
    }
  });

  it("cada control tiene etiqueta en español", () => {
    for (const markup of [sale, history, prices]) {
      const ids = [...markup.matchAll(/<(?:input|select|textarea)[^>]*\sid="([^"]+)"[^>]*>/g)].map(
        (match) => match[1],
      );

      for (const id of ids) {
        expect(markup, id).toContain(`for="${id}"`);
      }
    }
  });

  it("la tabla del historial tiene contenedor desplazable con etiqueta y teclado", () => {
    expect(history).toContain('class="table-scroll data-table-scroll"');
    expect(history).toContain('role="region"');
    expect(history).toContain('tabindex="0"');
    expect(ticketStyles + styles).toMatch(/\.table-scroll\s*\{[^}]*overflow-x:\s*auto/s);
  });

  it("usa role=alert para errores y role=status para avisos", () => {
    const errorSale = renderToStaticMarkup(
      <TicketSaleView
        state={{ ...initialTicketSaleState, step: "error", error: "Falló." }}
        actions={saleActions}
        printSettings={printSettingsViewModel()}
      />,
    );
    const notice = renderToStaticMarkup(
      <TicketPricesView
        state={{ ...initialTicketPricesState, notice: "Listo." }}
        actions={pricesActions}
      />,
    );

    expect(errorSale).toMatch(/role="alert"[^>]*>Falló\./);
    expect(notice).toMatch(/role="status"[^>]*>Listo\./);
  });

  it("define diseño de una columna en pantallas angostas y boleto sin desbordamiento", () => {
    expect(ticketStyles).toMatch(/@media \(max-width: 820px\)[\s\S]*\.ticket-sale-form/);
    expect(ticketStyles).toMatch(/\.ticket-receipt\s*\{[^}]*max-width:\s*100%/s);
    expect(styles).toMatch(/:focus-visible/);
    // El recorrido con teclado y los anchos de 360, 768 y 1366 px se revisan a mano (tasks T-39).
  });
});

describe("CA-24 ticket-sales", () => {
  it("el bloque ticket-sales de styles.css usa solo tokens y no fija hex de marca", () => {
    expect(ticketStyles.length).toBeGreaterThan(500);
    expect(ticketStyles).not.toMatch(/#[\da-f]{3,8}\b/i);
    expect(ticketStyles).not.toMatch(/\b(?:rgb|rgba|hsl)\(/i);
    expect(ticketStyles).toContain("var(--border)");
    expect(ticketStyles).toContain("var(--surface)");
  });

  it("CA-37: el modo de impresión deja los boletos en flujo normal, sin position absolute ni salto forzado", () => {
    const printBlock = ticketStyles.slice(ticketStyles.indexOf("@media print"));

    expect(printBlock).toMatch(/\.ticket-sale-screen--printable[^{]*\{[^}]*display:\s*none/s);
    // El ocultamiento solo aplica con área de impresión: sin venta no se imprime una hoja en blanco.
    expect(printBlock).not.toMatch(/\.ticket-sale-screen\s*[,{]/);
    // Reinicio de mínimos del body para que el rollo no se desplace ni agregue hoja (CA-37).
    expect(printBlock).toMatch(/html,\s*body,\s*\.dashboard-app\s*\{[^}]*min-width:\s*0[^}]*min-height:\s*0/s);
    expect(printBlock).toMatch(/\.ticket-print-area\s*\{[^}]*display:\s*block/s);
    expect(printBlock).toMatch(/\.ticket-receipt\s*\{[^}]*break-inside:\s*avoid/s);
    expect(printBlock).not.toMatch(/position:\s*absolute/);
    expect(printBlock).not.toMatch(/break-(?:before|after)\s*:\s*(?:page|always)/);
    expect(printBlock).not.toMatch(/page-break-(?:before|after)\s*:\s*always/);
    expect(printBlock).not.toMatch(/\.ticket-folio-list/);
    expect(printBlock).not.toMatch(/overflow(?:-y)?:\s*(?:hidden|auto|scroll)/);
    expect(printBlock).not.toMatch(/#[\da-f]{3,8}\b/i);
    expect(printBlock).toContain("var(--surface)");
    expect(ticketStyles).toContain("var(--ticket-width");
    expect(ticketStyles).toContain("var(--ticket-margin");
    expect(ticketStyles).toContain("var(--ticket-font");
  });

  it("los componentes del boleto no fijan colores", () => {
    for (const { file, source } of presentationFiles) {
      expect(source, file).not.toMatch(/#[\da-f]{3,8}\b/i);
      expect(source, file).not.toMatch(/style=\{\{[^}]*color/i);
    }
  });
});
