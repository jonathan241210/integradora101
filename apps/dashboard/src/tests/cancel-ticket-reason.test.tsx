import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CancelTicketDialog } from "../components/CancelTicketDialog";
import { TicketHistoryView } from "../views/TicketHistoryView";
import {
  cancelCommentRequiredMessage,
  cancelReasonRequiredMessage,
  cancelTicket,
  initialTicketHistoryState,
  ticketHistoryReducer,
  type TicketHistoryAction,
  type TicketHistoryState,
  type TicketHistoryViewModel,
} from "../viewmodels/ticket-history";
import { cancellationReasonsReducer, initialCancellationReasonsState } from "../viewmodels/cancellation-reasons";
import { apiError, createHarness } from "./admin-fixtures";
import {
  cancelInput,
  cancellationReasonsCatalog,
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
  changeReasonCode: noop,
  changeReason: noop,
  confirmCancel: noop,
  dismissNotice: noop,
};
const meta = { current_page: 1, last_page: 1, per_page: 25, total: 1 };
const target = historyRow({ folio: 7, cancellable: true });
const reasons = {
  state: { status: "ready" as const, reasons: cancellationReasonsCatalog, error: "" },
  reload: noop,
};

function openState(...list: TicketHistoryAction[]): TicketHistoryState {
  const steps: TicketHistoryAction[] = [
    { type: "loaded", rows: [target], meta },
    { type: "cancel-opened", target },
    ...list,
  ];

  return steps.reduce(ticketHistoryReducer, initialTicketHistoryState);
}

function renderDialog(state: TicketHistoryState) {
  return renderToStaticMarkup(
    <CancelTicketDialog
      cancel={state.cancel}
      reasons={reasons}
      onReasonCodeChange={noop}
      onReasonChange={noop}
      onConfirm={noop}
      onClose={noop}
    />,
  );
}

describe("CA-18 ticket-cancellation-report", () => {
  it("test_ca18_motivo_selector_uses_the_api_catalog", () => {
    const markup = renderDialog(openState());

    expect(markup).toContain('for="cancel-reason-code"');
    expect(markup).toContain('aria-required="true"');
    for (const option of cancellationReasonsCatalog) {
      expect(markup).toContain(`<option value="${option.code}">${option.label}</option>`);
    }
  });

  it("sin catálogo (API sin respuesta) el selector no ofrece etiquetas fijas", () => {
    const markup = renderToStaticMarkup(
      <CancelTicketDialog
        cancel={openState().cancel}
        reasons={{ state: initialCancellationReasonsState, reload: noop }}
        onReasonCodeChange={noop}
        onReasonChange={noop}
        onConfirm={noop}
        onClose={noop}
      />,
    );

    expect(markup).not.toContain("Error de captura");
    expect(markup).not.toContain("Cobro duplicado");
  });

  it("el catálogo se guarda tal como llega de la API", () => {
    const state = cancellationReasonsReducer(initialCancellationReasonsState, {
      type: "loaded",
      reasons: cancellationReasonsCatalog,
    });

    expect(state.reasons).toBe(cancellationReasonsCatalog);
  });
});

describe("CA-19 ticket-cancellation-report", () => {
  it("test_ca19_without_reason_does_not_call_api_and_shows_message_next_to_selector", async () => {
    const api = createTicketSalesApiMock();
    const h = createHarness(ticketHistoryReducer, openState());

    const ok = await cancelTicket(api, h.dispatch, target, cancelInput("", ""), h.state.query);

    expect(ok).toBe(false);
    expect(api.history.cancel).not.toHaveBeenCalled();
    expect(cancelReasonRequiredMessage).toBe("Elige un motivo de cancelación.");
    expect(renderDialog(h.state)).toContain('id="cancel-reason-code-error"');
    expect(renderDialog(h.state)).toContain("Elige un motivo de cancelación.");
  });
});

describe("CA-20 ticket-cancellation-report", () => {
  it("test_ca20_other_requires_describe_the_reason_and_others_are_optional", async () => {
    const other = openState({ type: "cancel-reason-code-changed", reasonCode: "other" });
    const optional = openState({ type: "cancel-reason-code-changed", reasonCode: "capture_error" });

    expect(renderDialog(other)).toContain("Describe el motivo");
    expect(renderDialog(other)).toMatch(/<textarea[^>]*aria-required="true"/);
    expect(renderDialog(optional)).toContain("Comentario (opcional)");
    expect(renderDialog(optional)).not.toMatch(/<textarea[^>]*aria-required/);

    const api = createTicketSalesApiMock();
    const h = createHarness(ticketHistoryReducer, other);
    const ok = await cancelTicket(api, h.dispatch, target, cancelInput("  ", "other"), h.state.query);

    expect(ok).toBe(false);
    expect(api.history.cancel).not.toHaveBeenCalled();
    expect(renderDialog(h.state)).toContain(cancelCommentRequiredMessage);
  });

  it("no fija un mínimo de caracteres: envía el texto y muestra el 422 de la API junto al campo", async () => {
    const message = "Describe el motivo con al menos 15 caracteres.";
    const api = createTicketSalesApiMock();
    api.history.cancel.mockRejectedValue(apiError(422, message, { reason: [message] }));
    const h = createHarness(ticketHistoryReducer, openState({ type: "cancel-reason-code-changed", reasonCode: "other" }));

    await cancelTicket(api, h.dispatch, target, cancelInput("corto", "other"), h.state.query);

    expect(api.history.cancel).toHaveBeenCalledWith(7, { reason_code: "other", reason: "corto" });
    expect(renderDialog(h.state)).toContain(message);
    expect(renderDialog(h.state)).toContain('id="cancel-reason-error"');
  });
});

describe("CA-21 ticket-cancellation-report", () => {
  it("test_ca21_200_refreshes_history_and_announces", async () => {
    const api = createTicketSalesApiMock();
    const h = createHarness(ticketHistoryReducer, openState());

    const ok = await cancelTicket(api, h.dispatch, target, cancelInput("Se cobró doble"), h.state.query);

    expect(ok).toBe(true);
    expect(api.history.cancel).toHaveBeenCalledWith(7, {
      reason_code: "capture_error",
      reason: "Se cobró doble",
    });
    expect(api.history.list).toHaveBeenCalledOnce();
    expect(h.state.cancel.target).toBeNull();
    expect(h.state.notice).toBe("El boleto 7 se canceló.");
  });

  it("un comentario vacío con motivo opcional se envía como null", async () => {
    const api = createTicketSalesApiMock();
    const h = createHarness(ticketHistoryReducer, openState());

    await cancelTicket(api, h.dispatch, target, cancelInput(""), h.state.query);

    expect(api.history.cancel).toHaveBeenCalledWith(7, { reason_code: "capture_error", reason: null });
  });

  it.each([
    [422, "El motivo elegido no es válido."],
    [403, "No tienes permiso para cancelar boletos."],
    [429, "Demasiados intentos de cancelación. Espera un momento e intenta de nuevo."],
  ])("un %i se muestra en el diálogo con el mensaje de la API, sin reintento", async (status, message) => {
    const api = createTicketSalesApiMock();
    api.history.cancel.mockRejectedValue(apiError(status, message));
    const h = createHarness(ticketHistoryReducer, openState());

    const ok = await cancelTicket(api, h.dispatch, target, cancelInput("x"), h.state.query);

    expect(ok).toBe(false);
    expect(api.history.cancel).toHaveBeenCalledOnce();
    expect(api.history.list).not.toHaveBeenCalled();
    expect(renderDialog(h.state)).toContain(message);
    expect(h.state.cancel.target).toEqual(target);
  });
});

describe("CA-26 ticket-cancellation-report", () => {
  const render = (row: ReturnType<typeof historyRow>) =>
    renderToStaticMarkup(
      <TicketHistoryView
        state={ticketHistoryReducer(initialTicketHistoryState, { type: "loaded", rows: [row], meta })}
        actions={actions}
      />,
    );

  it("test_ca26_history_shows_api_label_and_stored_comment", () => {
    const markup = render(
      historyRow({
        folio: 8,
        status: "cancelled",
        cancellable: false,
        cancellation_reason_code: "capture_error",
        cancellation_reason_label: "Error de captura",
        cancellation_reason: "Se cobró doble",
      }),
    );

    expect(markup).toContain("Error de captura · Se cobró doble");
  });

  it("muestra la etiqueta «Sin clasificar (anterior)» que devuelve la API y no la deriva del código", () => {
    const legacy = render(
      historyRow({
        folio: 9,
        status: "cancelled",
        cancellable: false,
        cancellation_reason_code: null,
        cancellation_reason_label: "Sin clasificar (anterior)",
        cancellation_reason: "Texto libre anterior",
      }),
    );
    const noLabel = render(
      historyRow({ folio: 10, status: "cancelled", cancellable: false, cancellation_reason_code: null }),
    );

    expect(legacy).toContain("Sin clasificar (anterior) · Texto libre anterior");
    expect(noLabel).not.toContain("Sin clasificar");
  });
});
