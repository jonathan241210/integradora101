import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TicketSaleView } from "../views/TicketSaleView";
import {
  canRegisterSale,
  initialTicketSaleState,
  loadSalePrices,
  printTicket,
  saleUncertainMessage,
  submitSale,
  ticketSaleReducer,
  type TicketSaleAction,
  type TicketSaleState,
  type TicketSaleViewModel,
} from "../viewmodels/ticket-sale";
import { apiError, createHarness } from "./admin-fixtures";
import {
  codedApiError,
  createTicketSalesApiMock,
  priceCurrent,
  printSettingsViewModel,
  saleDto,
} from "./ticket-sales-fixtures";

const noop = () => undefined;
const actions: TicketSaleViewModel["actions"] = {
  changeQuantity: noop,
  requestConfirmation: noop,
  cancelConfirmation: noop,
  confirm: noop,
  print: noop,
  newSale: noop,
  reloadPrices: noop,
};

function render(state: TicketSaleState): string {
  return renderToStaticMarkup(
    <TicketSaleView
      state={state}
      actions={actions}
      printSettings={printSettingsViewModel()}
    />,
  );
}

function stateWith(...list: TicketSaleAction[]): TicketSaleState {
  return list.reduce(ticketSaleReducer, initialTicketSaleState);
}

const withPrices = (state: TicketSaleState): TicketSaleState =>
  ticketSaleReducer(state, { type: "prices-loaded", current: priceCurrent() });

function harness(...initial: TicketSaleAction[]) {
  return createHarness(ticketSaleReducer, stateWith(...initial));
}

const readyToConfirm: TicketSaleAction[] = [
  { type: "quantity-changed", field: "adults", value: "2" },
  { type: "quantity-changed", field: "children", value: "1" },
  { type: "confirmation-requested" },
];

describe("CA-03 ticket-sales", () => {
  it("ofrece campos «Adultos» y «Niños» numéricos con etiqueta y teclado", () => {
    const markup = render(initialTicketSaleState);

    expect(markup).toMatch(/<label[^>]*for="sale-adults"[^>]*>Adultos<\/label>/);
    expect(markup).toMatch(/<label[^>]*for="sale-children"[^>]*>Niños<\/label>/);
    expect(markup.match(/id="sale-(?:adults|children)"[^>]*type="number"[^>]*min="0"/g)).toHaveLength(2);
    expect(markup).toContain("Registrar venta");
  });

  it("deshabilita «Registrar venta» con ambas cantidades en cero y lo habilita con una", () => {
    const disabledSubmit = /<button(?=[^>]*type="submit")(?=[^>]*disabled="")[^>]*>/;

    expect(render(initialTicketSaleState)).toMatch(disabledSubmit);

    const ready = stateWith({ type: "quantity-changed", field: "children", value: "1" });

    expect(canRegisterSale(ready)).toBe(true);
    expect(render(ready)).not.toMatch(disabledSubmit);
    expect(
      canRegisterSale(stateWith({ type: "quantity-changed", field: "adults", value: "-1" })),
    ).toBe(false);
    expect(
      canRegisterSale(stateWith({ type: "quantity-changed", field: "adults", value: "1.5" })),
    ).toBe(false);
  });
});

describe("CA-04 ticket-sales", () => {
  it("muestra los precios unitarios de la API y ningún total antes de registrar", () => {
    const state = withPrices(
      stateWith(
        { type: "quantity-changed", field: "adults", value: "2" },
        { type: "quantity-changed", field: "children", value: "1" },
      ),
    );
    const markup = render(state);

    expect(markup).toContain("$25.00");
    expect(markup).toContain("$16.00");
    expect(markup).not.toContain("$66.00");
    expect(markup).not.toMatch(/Total\s*<strong>/);
    expect(markup).not.toContain("ticket-receipt");
  });

  it("consulta los precios vigentes a la API al cargar la vista", async () => {
    const api = createTicketSalesApiMock();
    const h = harness();

    await loadSalePrices(api, h.dispatch);

    expect(api.prices.current).toHaveBeenCalledOnce();
    expect(api.sales.create).not.toHaveBeenCalled();
    expect(h.state.prices.status).toBe("ready");
    expect(h.state.prices.current?.adult.amount).toBe("25.00");
  });
});

describe("CA-05 ticket-sales", () => {
  it("abre un diálogo con las cantidades y solo llama a la API al confirmar", async () => {
    const api = createTicketSalesApiMock();
    const h = harness(...readyToConfirm);
    const markup = render(h.state);

    expect(h.state.step).toBe("confirming");
    expect(markup).toContain("Confirmar venta");
    expect(markup).toMatch(/<dt>Adultos<\/dt><dd>2<\/dd>/);
    expect(markup).toMatch(/<dt>Niños<\/dt><dd>1<\/dd>/);
    expect(api.sales.create).not.toHaveBeenCalled();

    await submitSale(api, h.dispatch, () => h.state);

    expect(api.sales.create).toHaveBeenCalledOnce();
    expect(api.sales.create).toHaveBeenCalledWith({ adult_quantity: 2, child_quantity: 1 });
  });

  it("Escape (cerrar el diálogo) vuelve a idle sin llamar a la API", async () => {
    const api = createTicketSalesApiMock();
    const h = harness(...readyToConfirm);

    h.dispatch({ type: "confirmation-cancelled" });
    await submitSale(api, h.dispatch, () => h.state);

    expect(h.state.step).toBe("idle");
    expect(api.sales.create).not.toHaveBeenCalled();
  });
});

describe("CA-06 ticket-sales", () => {
  it("muestra el boleto con folio, QR como imagen e «Imprimir boleto» que llama a la impresión", async () => {
    const api = createTicketSalesApiMock();
    const h = harness(...readyToConfirm);

    await submitSale(api, h.dispatch, () => h.state);

    const markup = render(h.state);
    const printer = { print: vi.fn() };

    expect(h.state.step).toBe("done");
    expect(markup).toContain("Folio <strong>123</strong>");
    expect(markup).toContain("$66.00");
    expect(markup).toMatch(/<img[^>]*src="data:image\/svg\+xml;charset=utf-8,/);
    expect(markup).not.toContain("<svg xmlns");
    expect(markup).toContain("Imprimir boleto");
    expect(printTicket(printer, h.state)).toBe(true);
    expect(printer.print).toHaveBeenCalledOnce();
    expect(printTicket(printer, initialTicketSaleState)).toBe(false);
    expect(printer.print).toHaveBeenCalledOnce();
  });
});

describe("CA-07 ticket-sales", () => {
  it("deshabilita los controles en submitting e ignora un segundo envío", async () => {
    const api = createTicketSalesApiMock();
    let finish: (value: ReturnType<typeof saleDto>) => void = () => undefined;
    api.sales.create.mockImplementation(
      () => new Promise((resolve) => { finish = resolve as typeof finish; }),
    );
    const h = harness(...readyToConfirm);

    const first = submitSale(api, h.dispatch, () => h.state);
    const second = submitSale(api, h.dispatch, () => h.state);

    expect(h.state.step).toBe("submitting");
    expect(render(h.state).match(/disabled=""/g)?.length).toBeGreaterThanOrEqual(3);

    finish(saleDto());
    await Promise.all([first, second]);

    expect(api.sales.create).toHaveBeenCalledOnce();
    expect(h.state.step).toBe("done");
  });
});

describe("CA-08 ticket-sales", () => {
  it("muestra el 422 junto a su campo", async () => {
    const api = createTicketSalesApiMock();
    api.sales.create.mockRejectedValue(
      apiError(422, "La cantidad de adultos no es válida.", {
        adult_quantity: ["La cantidad de adultos no es válida."],
      }),
    );
    const h = harness(...readyToConfirm);

    await submitSale(api, h.dispatch, () => h.state);

    expect(h.state.step).toBe("error");
    expect(render(h.state)).toMatch(
      /id="sale-adults-error"[^>]*>La cantidad de adultos no es válida\.<\/p>/,
    );
  });

  it("muestra el mensaje de la API en un 403", async () => {
    const api = createTicketSalesApiMock();
    api.sales.create.mockRejectedValue(
      codedApiError(403, "No tienes permiso para realizar esta acción."),
    );
    const h = harness(...readyToConfirm);

    await submitSale(api, h.dispatch, () => h.state);

    expect(render(h.state)).toContain("No tienes permiso para realizar esta acción.");
    expect(h.state.ticket).toBeNull();
  });

  it.each([
    ["fallo de red", new TypeError("fetch failed")],
    ["5xx", apiError(500, "Error interno.")],
  ])("en %s remite al Historial, sin reintento y sin boleto", async (_name, failure) => {
    const api = createTicketSalesApiMock();
    api.sales.create.mockRejectedValue(failure);
    const h = harness(...readyToConfirm);

    await submitSale(api, h.dispatch, () => h.state);

    const markup = render(h.state);

    expect(api.sales.create).toHaveBeenCalledOnce();
    expect(h.state.ticket).toBeNull();
    expect(markup).toContain(saleUncertainMessage);
    expect(markup).toContain("Consulta el Historial");
    expect(markup).not.toContain("Imprimir boleto");
    expect(markup).toContain('role="alert"');
  });

  it("un 401 lo gestiona el manejador global: no muestra error ni boleto", async () => {
    const api = createTicketSalesApiMock();
    api.sales.create.mockRejectedValue(apiError(401, "Unauthenticated."));
    const h = harness(...readyToConfirm);

    await submitSale(api, h.dispatch, () => h.state);

    expect(h.state.step).toBe("idle");
    expect(h.state.error).toBe("");
  });
});

describe("CA-08 ticket-sales (revisión 2026-11-02: 429 y tope por tipo)", () => {
  it("un 429 muestra el mensaje de la API, llama una sola vez y no muestra boleto", async () => {
    const api = createTicketSalesApiMock();
    const message = "Demasiadas ventas en poco tiempo. Espera un momento e intenta de nuevo.";
    api.sales.create.mockRejectedValue(apiError(429, message));
    const h = harness(...readyToConfirm);

    await submitSale(api, h.dispatch, () => h.state);

    const markup = render(h.state);

    expect(api.sales.create).toHaveBeenCalledOnce();
    expect(h.state.step).toBe("error");
    expect(h.state.ticket).toBeNull();
    expect(h.state.adults).toBe("2");
    expect(h.state.children).toBe("1");
    expect(markup).toContain(message);
    expect(markup).toContain('role="alert"');
    expect(markup).not.toContain("Consulta el Historial");
    expect(markup).not.toContain("Imprimir boleto");
    expect(markup).not.toMatch(/id="sale-(?:adults|children)"[^>]*disabled/);
  });

  it("el 422 del tope por tipo aparece junto al campo con el texto de la API y sin max fijo", async () => {
    const api = createTicketSalesApiMock();
    const message = "No se pueden vender más boletos de este tipo en una sola venta.";
    api.sales.create.mockRejectedValue(
      apiError(422, message, { child_quantity: [message] }),
    );
    const h = harness(...readyToConfirm);

    await submitSale(api, h.dispatch, () => h.state);

    const markup = render(h.state);

    expect(markup).toMatch(new RegExp(`id="sale-children-error"[^>]*>${message}</p>`));
    expect(markup).not.toMatch(/id="sale-(?:adults|children)"[^>]*\smax=/);
  });
});

describe("CA-09 ticket-sales", () => {
  it("«Nueva venta» limpia el formulario y vuelve a idle conservando los precios", async () => {
    const api = createTicketSalesApiMock();
    const h = harness(...readyToConfirm);

    h.dispatch({ type: "prices-loaded", current: priceCurrent() });
    await submitSale(api, h.dispatch, () => h.state);
    expect(h.state.step).toBe("done");
    expect(render(h.state)).toContain("Nueva venta");

    h.dispatch({ type: "new-sale" });

    expect(h.state.step).toBe("idle");
    expect(h.state.adults).toBe("0");
    expect(h.state.children).toBe("0");
    expect(h.state.ticket).toBeNull();
    expect(h.state.prices.current?.adult.amount).toBe("25.00");
  });
});
