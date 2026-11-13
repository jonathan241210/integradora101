import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TicketSaleView } from "../views/TicketSaleView";
import {
  canRegisterSale,
  initialTicketSaleState,
  loadSalePrices,
  printTickets,
  quoteUncertainMessage,
  requestSaleQuote,
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
  ticketDto,
  quoteDto,
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
  { type: "quote-loaded", requestId: 1, quote: quoteDto() },
];

describe("CA-08 collapsible-menu-event-pagination", () => {
  it("destaca ambas tarjetas sin alterar los precios ni los campos de venta", () => {
    const markup = render(withPrices(initialTicketSaleState));

    expect(markup.match(/class="ticket-price-card__icon"/g)).toHaveLength(2);
    expect(markup).toContain("$25.00");
    expect(markup).toContain("$16.00");
    expect(markup).toContain('id="sale-adults"');
    expect(markup).toContain('id="sale-children"');
    expect(markup).toContain("Registrar venta");
  });
});

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
    expect(markup).not.toContain("$50.00");
    expect(markup).not.toMatch(/Total\s*<strong>/);
    expect(markup).not.toContain("<dt>Total</dt>");
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
  it("al pulsar «Registrar venta» cotiza y el diálogo muestra cantidad, precio, subtotal y total de la API", async () => {
    const api = createTicketSalesApiMock();
    const h = harness(
      { type: "quantity-changed", field: "adults", value: "2" },
      { type: "quantity-changed", field: "children", value: "1" },
    );

    await requestSaleQuote(api, h.dispatch, () => h.state);

    const markup = render(h.state);

    expect(api.sales.quote).toHaveBeenCalledOnce();
    expect(api.sales.quote).toHaveBeenCalledWith({ adult_quantity: 2, child_quantity: 1 });
    expect(api.sales.create).not.toHaveBeenCalled();
    expect(h.state.step).toBe("confirming");
    expect(markup).toContain("Confirmar venta");
    expect(markup).toMatch(/<dt>Adultos<\/dt><dd>2 × \$25\.00 = (?:<!-- -->)?\$50\.00<\/dd>/);
    expect(markup).toMatch(/<dt>Niños<\/dt><dd>1 × \$16\.00 = (?:<!-- -->)?\$16\.00<\/dd>/);
    expect(markup).toContain("<dt>Total</dt>");
    expect(markup).toContain("$66.00");
  });

  it("solo llama a la API de venta al confirmar", async () => {
    const api = createTicketSalesApiMock();
    const h = harness(...readyToConfirm);

    expect(api.sales.create).not.toHaveBeenCalled();

    await submitSale(api, h.dispatch, () => h.state);

    expect(api.sales.create).toHaveBeenCalledOnce();
    expect(api.sales.create).toHaveBeenCalledWith({ adult_quantity: 2, child_quantity: 1 });
  });

  it("Escape (cerrar el diálogo) vuelve a idle sin llamar a la API de venta", async () => {
    const api = createTicketSalesApiMock();
    const h = harness(...readyToConfirm);

    h.dispatch({ type: "confirmation-cancelled" });
    await submitSale(api, h.dispatch, () => h.state);

    expect(h.state.step).toBe("idle");
    expect(api.sales.create).not.toHaveBeenCalled();
  });
});

const confirmDisabled = /<button(?=[^>]*type="submit")(?=[^>]*disabled="")[^>]*>Confirmar venta<\/button>/;
const confirmDisabledWhileProcessing = /<button(?=[^>]*type="submit")(?=[^>]*disabled="")[^>]*>Procesando…<\/button>/;

describe("CA-31 ticket-sales", () => {
  it("mientras cotiza muestra un indicador anunciado, sin importes y con «Confirmar venta» deshabilitado", () => {
    const h = harness(
      { type: "quantity-changed", field: "adults", value: "2" },
      { type: "confirmation-requested" },
    );
    const markup = render(h.state);

    expect(h.state.quote.status).toBe("loading");
    expect(markup).toContain("Calculando el total…");
    expect(markup).toMatch(/role="status"[^>]*aria-live="polite"/);
    expect(markup).not.toContain("<dt>Total</dt>");
    expect(markup).toMatch(confirmDisabled);
  });

  it("no envía la venta mientras la cotización está en curso", async () => {
    const api = createTicketSalesApiMock();
    const h = harness(
      { type: "quantity-changed", field: "adults", value: "2" },
      { type: "confirmation-requested" },
    );

    await submitSale(api, h.dispatch, () => h.state);

    expect(api.sales.create).not.toHaveBeenCalled();
    expect(confirmDisabledWhileProcessing.test(render(h.state))).toBe(false);
  });
});

describe("CA-32 ticket-sales", () => {
  it.each([
    ["422 con campo", apiError(422, "x", { adult_quantity: ["Cantidad inválida."] }), "Cantidad inválida."],
    ["403", apiError(403, "No tienes permiso para realizar esta acción."), "No tienes permiso para realizar esta acción."],
    ["429", apiError(429, "Demasiadas solicitudes. Espera un momento."), "Demasiadas solicitudes. Espera un momento."],
    ["red", new TypeError("fetch failed"), quoteUncertainMessage],
    ["5xx", apiError(500, "Error interno."), quoteUncertainMessage],
  ])("en %s muestra el error, deshabilita confirmar, no vende y cotiza una sola vez", async (_n, failure, message) => {
    const api = createTicketSalesApiMock();
    api.sales.quote.mockRejectedValue(failure);
    const h = harness({ type: "quantity-changed", field: "adults", value: "2" });

    await requestSaleQuote(api, h.dispatch, () => h.state);
    await submitSale(api, h.dispatch, () => h.state);

    const markup = render(h.state);

    expect(api.sales.quote).toHaveBeenCalledOnce();
    expect(api.sales.create).not.toHaveBeenCalled();
    expect(h.state.quote.status).toBe("error");
    expect(markup).toContain(message);
    expect(markup).toContain('role="alert"');
    expect(markup).toMatch(confirmDisabled);
    expect(markup).not.toContain("Reintentar cotización");
  });

  it("tras un fallo se cancela y «Registrar venta» cotiza de nuevo conservando las cantidades", async () => {
    const api = createTicketSalesApiMock();
    api.sales.quote.mockRejectedValueOnce(apiError(500, "Error interno."));
    const h = harness(
      { type: "quantity-changed", field: "adults", value: "2" },
      { type: "quantity-changed", field: "children", value: "1" },
    );

    await requestSaleQuote(api, h.dispatch, () => h.state);
    h.dispatch({ type: "confirmation-cancelled" });

    expect(h.state.adults).toBe("2");
    expect(h.state.children).toBe("1");

    await requestSaleQuote(api, h.dispatch, () => h.state);

    expect(api.sales.quote).toHaveBeenCalledTimes(2);
    expect(h.state.quote.status).toBe("ready");
  });

  it("un 401 cierra el diálogo sin mostrar error (flujo de sesión expirada)", async () => {
    const api = createTicketSalesApiMock();
    api.sales.quote.mockRejectedValue(apiError(401, "Unauthenticated."));
    const h = harness({ type: "quantity-changed", field: "adults", value: "2" });

    await requestSaleQuote(api, h.dispatch, () => h.state);

    expect(h.state.step).toBe("idle");
    expect(h.state.quote.error).toBe("");
  });
});

describe("CA-32 ticket-sales (campos, botones y reintento)", () => {
  it("el 422 con campo queda junto al control y sobrevive a cancelar", async () => {
    const api = createTicketSalesApiMock();
    api.sales.quote.mockRejectedValue(
      apiError(422, "x", {
        adult_quantity: ["Adultos inválidos."],
        child_quantity: ["Niños inválidos."],
      }),
    );
    const h = harness({ type: "quantity-changed", field: "adults", value: "2" });

    await requestSaleQuote(api, h.dispatch, () => h.state);
    h.dispatch({ type: "confirmation-cancelled" });

    const markup = render(h.state);

    expect(markup).toMatch(/id="sale-adults-error"[^>]*>Adultos inválidos\.<\/p>/);
    expect(markup).toMatch(/id="sale-children-error"[^>]*>Niños inválidos\.<\/p>/);

    h.dispatch({ type: "quantity-changed", field: "adults", value: "1" });

    expect(h.state.fieldErrors).toEqual({});
  });

  it("«Reintentar precios» es type=button y no envía el formulario", () => {
    const state = ticketSaleReducer(initialTicketSaleState, {
      type: "prices-failed",
      message: "No se pudieron cargar los precios.",
    });

    expect(render(state)).toMatch(
      /<button[^>]*type="button"[^>]*>Reintentar precios<\/button>/,
    );
    const form = render(state).match(/<form class="ticket-sale-form"[\s\S]*?<\/form>/)?.[0] ?? "";

    expect(form).toContain("Reintentar precios");
    expect(form.match(/<button[^>]*>/g)?.filter((b) => !/type="/.test(b))).toEqual([]);
  });
});

describe("CA-31 ticket-sales (ciclo)", () => {
  it("lista, cancelar y reabrir vuelve a cargando sin importes previos", async () => {
    const api = createTicketSalesApiMock();
    const h = harness({ type: "quantity-changed", field: "adults", value: "2" });

    await requestSaleQuote(api, h.dispatch, () => h.state);
    expect(h.state.quote.status).toBe("ready");

    h.dispatch({ type: "confirmation-cancelled" });
    h.dispatch({ type: "confirmation-requested" });

    const markup = render(h.state);

    expect(h.state.quote.status).toBe("loading");
    expect(h.state.quote.quote).toBeNull();
    expect(markup).toContain("Calculando el total…");
    expect(markup).not.toContain("Total calculado");
    expect(markup).toMatch(confirmDisabled);
  });

  it("anuncia el total en el contenedor de estado cuando llega", async () => {
    const api = createTicketSalesApiMock();
    const h = harness({ type: "quantity-changed", field: "adults", value: "2" });

    await requestSaleQuote(api, h.dispatch, () => h.state);

    expect(render(h.state)).toMatch(/role="status"[^>]*>Total calculado: \$66\.00<\/p>/);
  });

  it("una doble llamada sin esperar cotiza una sola vez", async () => {
    const api = createTicketSalesApiMock();
    const h = harness({ type: "quantity-changed", field: "adults", value: "2" });

    const first = requestSaleQuote(api, h.dispatch, () => h.state);
    const second = requestSaleQuote(api, h.dispatch, () => h.state);
    await Promise.all([first, second]);

    expect(api.sales.quote).toHaveBeenCalledOnce();
    expect(h.state.quote.status).toBe("ready");
  });
});

describe("CA-34 ticket-sales (limpieza de la cotización)", () => {
  it("submit-failed y submit-aborted limpian la cotización y conservan el error de venta", async () => {
    const api = createTicketSalesApiMock();
    api.sales.create.mockRejectedValue(apiError(422, "Cantidad no válida."));
    const failed = harness(...readyToConfirm);

    await submitSale(api, failed.dispatch, () => failed.state);

    expect(failed.state.quote.status).toBe("idle");
    expect(failed.state.quote.quote).toBeNull();
    expect(failed.state.quote.requestId).toBeGreaterThan(1);
    expect(render(failed.state)).toContain("Cantidad no válida.");

    api.sales.create.mockRejectedValue(apiError(401, "Unauthenticated."));
    const aborted = harness(...readyToConfirm);

    await submitSale(api, aborted.dispatch, () => aborted.state);

    expect(aborted.state.step).toBe("idle");
    expect(aborted.state.quote.status).toBe("idle");
    expect(aborted.state.quote.requestId).toBeGreaterThan(1);
  });

  it("new-sale limpia la cotización", async () => {
    const api = createTicketSalesApiMock();
    const h = harness(...readyToConfirm);

    await submitSale(api, h.dispatch, () => h.state);
    h.dispatch({ type: "new-sale" });

    expect(h.state.quote.status).toBe("idle");
    expect(h.state.quote.quote).toBeNull();
  });
});

describe("CA-33 ticket-sales", () => {
  function deferred() {
    let resolve: (value: ReturnType<typeof quoteDto>) => void = () => undefined;
    const promise = new Promise<ReturnType<typeof quoteDto>>((r) => { resolve = r; });

    return { promise, resolve };
  }

  it("ignora la respuesta que llega tras cerrar el diálogo", async () => {
    const api = createTicketSalesApiMock();
    const late = deferred();
    api.sales.quote.mockImplementation(() => late.promise);
    const h = harness({ type: "quantity-changed", field: "adults", value: "2" });

    const pending = requestSaleQuote(api, h.dispatch, () => h.state);
    h.dispatch({ type: "confirmation-cancelled" });
    late.resolve(quoteDto());
    await pending;

    expect(h.state.step).toBe("idle");
    expect(h.state.quote.status).toBe("idle");
    expect(h.state.quote.quote).toBeNull();
  });

  it("ignora la respuesta de una cotización anterior tras cerrar y reabrir", async () => {
    const api = createTicketSalesApiMock();
    const first = deferred();
    const second = deferred();
    api.sales.quote
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const h = harness({ type: "quantity-changed", field: "adults", value: "2" });

    const one = requestSaleQuote(api, h.dispatch, () => h.state);
    h.dispatch({ type: "confirmation-cancelled" });
    const two = requestSaleQuote(api, h.dispatch, () => h.state);

    first.resolve(quoteDto({ total_amount: "999.00" }));
    await one;
    expect(h.state.quote.status).toBe("loading");

    second.resolve(quoteDto());
    await two;

    expect(h.state.quote.status).toBe("ready");
    expect(h.state.quote.quote?.total_amount).toBe("66.00");
  });

  it("ignora un fallo tardío de un diálogo cerrado", async () => {
    const api = createTicketSalesApiMock();
    let fail: (reason: unknown) => void = () => undefined;
    api.sales.quote.mockImplementation(() => new Promise((_, reject) => { fail = reject; }));
    const h = harness({ type: "quantity-changed", field: "adults", value: "2" });

    const pending = requestSaleQuote(api, h.dispatch, () => h.state);
    h.dispatch({ type: "confirmation-cancelled" });
    fail(apiError(500, "Error interno."));
    await pending;

    expect(h.state.quote.status).toBe("idle");
    expect(h.state.quote.error).toBe("");
  });
});

describe("CA-34 ticket-sales", () => {
  it("la confirmación envía las cantidades cotizadas y muestra el importe real del boleto", async () => {
    const api = createTicketSalesApiMock();
    api.sales.create.mockResolvedValue(saleDto({ total_amount: "70.00" }));
    const h = harness(
      { type: "quantity-changed", field: "adults", value: "2" },
      { type: "quantity-changed", field: "children", value: "1" },
    );

    await requestSaleQuote(api, h.dispatch, () => h.state);
    await submitSale(api, h.dispatch, () => h.state);

    expect(api.sales.quote).toHaveBeenCalledWith({ adult_quantity: 2, child_quantity: 1 });
    expect(api.sales.create).toHaveBeenCalledWith({ adult_quantity: 2, child_quantity: 1 });
    expect(h.state.step).toBe("done");
    expect(render(h.state)).toContain("$70.00");
  });

  it("las cantidades no cambian con el diálogo abierto", async () => {
    const h = harness(...readyToConfirm);

    h.dispatch({ type: "quantity-changed", field: "adults", value: "9" });

    expect(h.state.adults).toBe("2");
    expect(h.state.quote.adults).toBe(2);
  });
});

describe("CA-06 ticket-sales", () => {
  it("tras el 201 muestra la venta y «Imprimir boletos» que llama a la impresión", async () => {
    const api = createTicketSalesApiMock();
    const h = harness(...readyToConfirm);

    await submitSale(api, h.dispatch, () => h.state);

    const markup = render(h.state);
    const printer = { print: vi.fn() };

    expect(h.state.step).toBe("done");
    expect(markup).toContain("Venta registrada");
    expect(markup).toContain("Imprimir boletos");
    expect(markup).not.toContain("Imprimir boleto<");
    expect(printTickets(printer, h.state)).toBe(true);
    expect(printer.print).toHaveBeenCalledOnce();
    expect(printTickets(printer, initialTicketSaleState)).toBe(false);
    expect(printer.print).toHaveBeenCalledOnce();
  });
});

describe("CA-35 ticket-sales", () => {
  it("1 adulto y 3 niños: 4 boletos, total $73.00 de la API y lista de folios sin QR en pantalla", async () => {
    const api = createTicketSalesApiMock();
    const h = harness(
      { type: "quantity-changed", field: "adults", value: "1" },
      { type: "quantity-changed", field: "children", value: "3" },
    );

    await requestSaleQuote(api, h.dispatch, () => h.state);
    await submitSale(api, h.dispatch, () => h.state);

    const markup = render(h.state);
    const screen = markup.slice(0, markup.indexOf('class="ticket-print-area"'));

    expect(api.sales.create).toHaveBeenCalledWith({ adult_quantity: 1, child_quantity: 3 });
    expect(h.state.sale?.tickets).toHaveLength(4);
    expect(screen).toContain("Venta registrada");
    expect(screen).toContain("$73.00");
    expect(screen).toMatch(/<dt>Boletos<\/dt><dd>4<\/dd>/);
    expect(screen.match(/<li>/g)).toHaveLength(4);
    expect(screen).toMatch(/<li><span>Folio 101<\/span><span>Adulto<\/span><span>\$25\.00<\/span><\/li>/);
    expect(screen).toMatch(/<li><span>Folio 104<\/span><span>Niño<\/span><span>\$16\.00<\/span><\/li>/);
    expect(screen).not.toContain("<img");
    expect(screen).not.toContain("ticket-receipt");
  });
});

describe("CA-35 ticket-sales (accesibilidad y alcance de impresión)", () => {
  it("la lista desplazable de folios es enfocable y tiene nombre accesible", async () => {
    const api = createTicketSalesApiMock();
    const h = harness(...readyToConfirm);

    await submitSale(api, h.dispatch, () => h.state);

    expect(render(h.state)).toMatch(
      /<ul[^>]*class="ticket-folio-list"[^>]*aria-label="Boletos de la venta"[^>]*tabindex="0"|<ul[^>]*tabindex="0"[^>]*aria-label="Boletos de la venta"/,
    );
  });

  it("el ocultamiento de impresión de la pantalla solo existe con venta registrada", async () => {
    const api = createTicketSalesApiMock();
    const h = harness(...readyToConfirm);

    expect(render(initialTicketSaleState)).not.toContain("ticket-sale-screen--printable");
    expect(render(initialTicketSaleState)).not.toContain("ticket-print-area");

    await submitSale(api, h.dispatch, () => h.state);

    expect(render(h.state)).toContain("ticket-sale-screen--printable");
  });

  it("el encabezado habla de boletos en plural", () => {
    expect(render(initialTicketSaleState)).toContain("imprime los boletos");
  });
});

describe("CA-36 ticket-sales", () => {
  it("cada boleto impreso trae tipo, precio, folio, fecha, cajero, QR y pie, sin total de la compra", async () => {
    const api = createTicketSalesApiMock();
    const h = harness(...readyToConfirm);

    await submitSale(api, h.dispatch, () => h.state);

    const markup = render(h.state);
    const printArea = markup.slice(markup.indexOf('class="ticket-print-area"'));
    const receipts = printArea.match(/<article[\s\S]*?<\/article>/g) ?? [];

    expect(receipts).toHaveLength(4);
    for (const receipt of receipts) {
      expect(receipt).toMatch(/Folio <strong>10\d<\/strong>/);
      expect(receipt).toMatch(/Adulto|Niño/);
      expect(receipt).toMatch(/Precio <strong>\$(?:25|16)\.00<\/strong>/);
      expect(receipt).toContain("Cajero: Caja Prueba");
      expect(receipt).toMatch(/<img[^>]*src="data:image\/svg\+xml;charset=utf-8,/);
      expect(receipt).toContain("Zoológico Nicolás Bravo, Tulancingo");
      expect(receipt).not.toContain("$73.00");
      expect(receipt).not.toContain("Total");
    }
    expect(markup).not.toContain("<svg xmlns");
  });
});

describe("CA-37 ticket-sales", () => {
  it("«Imprimir boletos» imprime una sola vez todos los boletos de la venta", async () => {
    const api = createTicketSalesApiMock();
    const h = harness(...readyToConfirm);
    const printer = { print: vi.fn() };

    await submitSale(api, h.dispatch, () => h.state);

    expect(render(h.state).match(/<article/g)).toHaveLength(4);
    expect(printTickets(printer, h.state)).toBe(true);
    expect(printer.print).toHaveBeenCalledOnce();
  });
});

describe("CA-39 ticket-sales", () => {
  it("una venta de 50 boletos lista todos los folios con desplazamiento propio y los imprime con QR", async () => {
    const api = createTicketSalesApiMock();
    const tickets = Array.from({ length: 50 }, (_, index) =>
      ticketDto({ folio: 200 + index, ticket_type: "child", unit_price: "16.00", total_amount: "16.00" }),
    );
    api.sales.create.mockResolvedValue(
      saleDto({ adult_quantity: 0, child_quantity: 50, total_amount: "800.00", tickets }),
    );
    const h = harness(...readyToConfirm);

    await submitSale(api, h.dispatch, () => h.state);

    const markup = render(h.state);
    const printArea = markup.slice(markup.indexOf('class="ticket-print-area"'));

    expect(markup.slice(0, markup.indexOf('class="ticket-print-area"')).match(/<li>/g)).toHaveLength(50);
    expect(printArea.match(/<article/g)).toHaveLength(50);
    expect(printArea.match(/<img/g)).toHaveLength(50);
    expect(markup).toContain("ticket-folio-list");
    expect(markup).toContain("$800.00");
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
    expect(h.state.sale).toBeNull();
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
    expect(h.state.sale).toBeNull();
    expect(markup).toContain(saleUncertainMessage);
    expect(markup).toContain("Consulta el Historial");
    expect(markup).not.toContain("Imprimir boletos");
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

describe("CA-08 ticket-sales (429 y tope total de la API)", () => {
  it("un 429 muestra el mensaje de la API, llama una sola vez y no muestra boleto", async () => {
    const api = createTicketSalesApiMock();
    const message = "Demasiadas ventas en poco tiempo. Espera un momento e intenta de nuevo.";
    api.sales.create.mockRejectedValue(apiError(429, message));
    const h = harness(...readyToConfirm);

    await submitSale(api, h.dispatch, () => h.state);

    const markup = render(h.state);

    expect(api.sales.create).toHaveBeenCalledOnce();
    expect(h.state.step).toBe("error");
    expect(h.state.sale).toBeNull();
    expect(h.state.adults).toBe("2");
    expect(h.state.children).toBe("1");
    expect(markup).toContain(message);
    expect(markup).toContain('role="alert"');
    expect(markup).not.toContain("Consulta el Historial");
    expect(markup).not.toContain("Imprimir boletos");
    expect(markup).not.toMatch(/id="sale-(?:adults|children)"[^>]*disabled/);
  });

  const capMessage = "No puedes vender más de 50 boletos en una misma venta.";

  it("el 422 del tope total de la API (en adult_quantity) aparece junto a Adultos, sin max fijo", async () => {
    const api = createTicketSalesApiMock();
    api.sales.create.mockRejectedValue(
      apiError(422, capMessage, { adult_quantity: [capMessage] }),
    );
    const h = harness(...readyToConfirm);

    await submitSale(api, h.dispatch, () => h.state);

    const markup = render(h.state);

    expect(markup).toMatch(new RegExp(`id="sale-adults-error"[^>]*>${capMessage}</p>`));
    expect(markup).not.toMatch(/id="sale-(?:adults|children)"[^>]*\smax=/);
  });

  it("26 adultos + 25 niños: la cotización muestra el 422 en el diálogo, deshabilita confirmar y deja el mensaje bajo Adultos al cancelar", async () => {
    const api = createTicketSalesApiMock();
    api.sales.quote.mockRejectedValue(
      apiError(422, capMessage, { adult_quantity: [capMessage] }),
    );
    const h = harness(
      { type: "quantity-changed", field: "adults", value: "26" },
      { type: "quantity-changed", field: "children", value: "25" },
    );

    await requestSaleQuote(api, h.dispatch, () => h.state);

    const open = render(h.state);

    expect(api.sales.quote).toHaveBeenCalledWith({ adult_quantity: 26, child_quantity: 25 });
    expect(open).toContain(capMessage);
    expect(open).toContain('role="alert"');
    expect(open).toMatch(confirmDisabled);

    h.dispatch({ type: "confirmation-cancelled" });

    expect(render(h.state)).toMatch(
      new RegExp(`id="sale-adults-error"[^>]*>${capMessage}</p>`),
    );
    expect(api.sales.create).not.toHaveBeenCalled();
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
    expect(h.state.sale).toBeNull();
    expect(h.state.prices.current?.adult.amount).toBe("25.00");
  });
});
