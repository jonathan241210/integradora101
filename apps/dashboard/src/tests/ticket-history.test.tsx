import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TicketHistoryView } from "../views/TicketHistoryView";
import {
  cancelReasonRequiredMessage,
  cancelTicket,
  formatTicketDateTime,
  initialTicketHistoryState,
  loadTicketHistory,
  ticketHistoryReducer,
  type TicketHistoryAction,
  type TicketHistoryState,
  type TicketHistoryViewModel,
} from "../viewmodels/ticket-history";
import { apiError, createHarness } from "./admin-fixtures";
import {
  createTicketSalesApiMock,
  historyRow,
} from "./ticket-sales-fixtures";

const noop = () => undefined;
const actions: TicketHistoryViewModel["actions"] = {
  applyFilters: noop,
  goToPage: noop,
  reload: noop,
  openCancel: noop,
  closeCancel: noop,
  changeReason: noop,
  confirmCancel: noop,
  dismissNotice: noop,
};

const render = (state: TicketHistoryState) =>
  renderToStaticMarkup(<TicketHistoryView state={state} actions={actions} />);

function stateWith(...list: TicketHistoryAction[]): TicketHistoryState {
  return list.reduce(ticketHistoryReducer, initialTicketHistoryState);
}

const completed = historyRow({ folio: 7, cancellable: true });
const cancelled = historyRow({
  folio: 8,
  status: "cancelled",
  cancelled_at: "2026-11-02T19:00:00Z",
  cancellation_reason: "Error de captura",
  cancellable: false,
});
const meta = { current_page: 1, last_page: 3, per_page: 25, total: 60 };

describe("CA-10 ticket-sales (registros)", () => {
  it("rotula el conteo como registros porque la API no devuelve la suma de boletos", () => {
    const markup = render(
      stateWith({
        type: "loaded",
        rows: [completed],
        meta: { current_page: 1, last_page: 1, per_page: 25, total: 5 },
      }),
    );

    expect(markup).toContain("5 registros");
    expect(markup).not.toContain("5 boletos");
  });
});

describe("CA-10 ticket-sales", () => {
  it("lista folio, fecha local, cantidades, total, estado y motivo de los cancelados", () => {
    const markup = render(stateWith({ type: "loaded", rows: [completed, cancelled], meta }));

    expect(markup).toContain("Historial de boletos");
    expect(markup).toContain(">7<");
    expect(markup).toContain(">8<");
    expect(markup).toContain(formatTicketDateTime(completed.purchased_at));
    expect(markup).toContain("$66.00");
    expect(markup).toContain("Completado");
    expect(markup).toContain("Cancelado");
    expect(markup).toContain("Error de captura");
    expect(markup).toContain("Página 1 de 3");
    expect(markup).not.toContain("MUESTRA-");
    expect(markup).not.toContain("ficticio");
  });

  it("presenta los estados de carga, vacío y error en español con role=alert", () => {
    expect(render(initialTicketHistoryState)).toContain("Cargando el historial…");
    expect(
      render(stateWith({ type: "loaded", rows: [], meta: { ...meta, total: 0, last_page: 1 } })),
    ).toContain("No hay boletos que coincidan con los filtros.");

    const failed = render(stateWith({ type: "load-failed", message: "No fue posible cargar." }));

    expect(failed).toContain('role="alert"');
    expect(failed).toContain("No fue posible cargar.");
  });
});

describe("CA-11 ticket-sales", () => {
  it("vuelve a consultar la API con folio, estado, rango y página, sin filtrar en el cliente", async () => {
    const api = createTicketSalesApiMock();
    const rows = [historyRow({ folio: 1 }), historyRow({ folio: 2 })];
    api.history.list.mockResolvedValue({ data: rows, meta });
    const h = createHarness(ticketHistoryReducer, initialTicketHistoryState);

    h.dispatch({
      type: "query-changed",
      changes: { folio: "99", status: "cancelled", from: "2026-11-01", to: "2026-11-02", page: 1 },
    });
    await loadTicketHistory(api, h.dispatch, h.state.query);

    expect(api.history.list).toHaveBeenCalledWith({
      page: 1,
      folio: "99",
      status: "cancelled",
      from: "2026-11-01",
      to: "2026-11-02",
    });
    // La API devolvió filas que no coinciden con el folio y se muestran todas.
    expect(h.state.rows).toHaveLength(2);
  });

  it("el filtro de formulario ofrece folio, estado y fechas", () => {
    const markup = render(initialTicketHistoryState);

    expect(markup).toContain('for="history-folio"');
    expect(markup).toContain('for="history-status"');
    expect(markup).toContain('for="history-from"');
    expect(markup).toContain('for="history-to"');
  });
});

describe("CA-12 ticket-sales", () => {
  it("muestra «Cancelar» solo en boletos con cancellable", () => {
    const markup = render(stateWith({ type: "loaded", rows: [completed, cancelled], meta }));

    expect(markup).toContain("Cancelar boleto 7");
    expect(markup).not.toContain("Cancelar boleto 8");
  });

  it("sin motivo no llama a la API y muestra el error en español en el diálogo", async () => {
    const api = createTicketSalesApiMock();
    const h = createHarness(ticketHistoryReducer, stateWith({ type: "loaded", rows: [completed], meta }));

    h.dispatch({ type: "cancel-opened", target: completed });
    const ok = await cancelTicket(api, h.dispatch, completed, "   ", h.state.query);

    expect(ok).toBe(false);
    expect(api.history.cancel).not.toHaveBeenCalled();
    expect(render(h.state)).toContain(cancelReasonRequiredMessage);
    expect(render(h.state)).toContain('id="cancel-reason"');
  });

  it("con motivo cancela, refresca la lista y avisa de forma accesible", async () => {
    const api = createTicketSalesApiMock();
    const h = createHarness(ticketHistoryReducer, stateWith({ type: "loaded", rows: [completed], meta }));

    h.dispatch({ type: "cancel-opened", target: completed });
    const ok = await cancelTicket(api, h.dispatch, completed, " Error de captura ", h.state.query);

    expect(ok).toBe(true);
    expect(api.history.cancel).toHaveBeenCalledWith(7, { reason: "Error de captura" });
    expect(api.history.list).toHaveBeenCalledOnce();
    expect(h.state.cancel.target).toBeNull();
    expect(render(h.state)).toMatch(/role="status"[^>]*>El boleto 7 se canceló\./);
  });

  it("muestra en el diálogo el 422 de la API sin cambiar la lista", async () => {
    const api = createTicketSalesApiMock();
    const message = "Solo se pueden cancelar boletos el mismo día en que se vendieron.";
    api.history.cancel.mockRejectedValue(apiError(422, message));
    const h = createHarness(ticketHistoryReducer, stateWith({ type: "loaded", rows: [completed], meta }));

    h.dispatch({ type: "cancel-opened", target: completed });
    await cancelTicket(api, h.dispatch, completed, "Motivo", h.state.query);

    expect(h.state.rows).toEqual([completed]);
    expect(api.history.list).not.toHaveBeenCalled();
    expect(render(h.state)).toContain(message);
    expect(h.state.cancel.target).toEqual(completed);
  });
});

describe("CA-12 ticket-sales (revisión 2026-11-02: 429)", () => {
  it("un 429 mantiene el diálogo abierto con el mensaje de la API, conserva el motivo y llama una vez", async () => {
    const api = createTicketSalesApiMock();
    const message = "Demasiados intentos de cancelación. Espera un momento e intenta de nuevo.";
    api.history.cancel.mockRejectedValue(apiError(429, message));
    const h = createHarness(ticketHistoryReducer, stateWith({ type: "loaded", rows: [completed], meta }));

    h.dispatch({ type: "cancel-opened", target: completed });
    h.dispatch({ type: "cancel-reason-changed", reason: "Error de captura" });
    const ok = await cancelTicket(api, h.dispatch, completed, "Error de captura", h.state.query);

    expect(ok).toBe(false);
    expect(api.history.cancel).toHaveBeenCalledOnce();
    expect(api.history.list).not.toHaveBeenCalled();
    expect(h.state.cancel.target).toEqual(completed);
    expect(h.state.cancel.reason).toBe("Error de captura");
    expect(h.state.cancel.busy).toBe(false);
    expect(h.state.rows).toEqual([completed]);
    expect(render(h.state)).toContain(message);
    expect(render(h.state)).toContain("Error de captura");
  });
});

describe("CA-13 ticket-sales", () => {
  it("convierte la hora UTC de la API a la zona indicada en dd/mm/aaaa HH:mm", () => {
    expect(formatTicketDateTime("2026-11-02T18:30:15Z", "UTC")).toBe("02/11/2026 18:30");
    expect(formatTicketDateTime("2026-11-02T18:30:15Z", "America/Mexico_City")).toBe(
      "02/11/2026 12:30",
    );
    expect(formatTicketDateTime("2026-11-02T18:30:15Z", "Asia/Tokyo")).toBe("03/11/2026 03:30");
    expect(formatTicketDateTime("2026-11-02T06:05:00Z", "America/Mexico_City")).toBe(
      "02/11/2026 00:05",
    );
  });

  it("tolera valores vacíos o inválidos sin lanzar", () => {
    expect(formatTicketDateTime(null)).toBe("—");
    expect(formatTicketDateTime("no-es-fecha")).toBe("no-es-fecha");
  });

  it("usa un formateador propio y no el de los reportes (formato Y-m-d H:i:s)", () => {
    const source = readFileSync(
      fileURLToPath(new URL("../viewmodels/ticket-history.ts", import.meta.url)),
      "utf8",
    );

    expect(source).not.toMatch(/import[^;]*formatDateTime[^;]*from/);
  });
});
