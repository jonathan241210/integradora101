import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CancellationReviewDialog } from "../components/CancellationReviewDialog";
import { CancellationReviewHistory } from "../components/CancellationReviewHistory";
import {
  initialReviewDialogState,
  initialReviewHistoryState,
  loadCancellationReviewHistory,
  noteLengthMessage,
  noteLimitAnnouncement,
  reviewDialogReducer,
  reviewHistoryReducer,
  reviewTargetFor,
  submitCancellationReview,
  submitReviewAndRefresh,
  type ReviewDialogAction,
  type ReviewDialogState,
  type ReviewTarget,
} from "../viewmodels/cancellation-review";
import { apiError, createHarness } from "./admin-fixtures";
import { cashierDays, reviewDto, reviewVm } from "./cancellation-review-fixtures";

const read = (path: string) =>
  readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf8");

const target: ReviewTarget = { cashierId: 7, cashierName: "Laura Cruz", date: "2026-11-18" };
const goodNote = "Se comparó el neto con el dinero.";

function start(overrides: Partial<ReviewDialogState> = {}) {
  const h = createHarness<ReviewDialogState, ReviewDialogAction>(reviewDialogReducer, {
    ...initialReviewDialogState,
    target,
    status: "reviewed_ok",
    note: goodNote,
    ...overrides,
  });
  const api = {
    createCancellationReview: vi.fn(async (..._args: unknown[]) => reviewDto()),
    listCancellationReviews: vi.fn(async (..._args: unknown[]) => [reviewDto({ id: 2 }), reviewDto({ id: 1 })]),
  };

  return { h, api, submit: () => submitCancellationReview(api, h.dispatch, h.state) };
}

describe("CA-06 cancellation-review-signals", () => {
  it("test_ca06_review_dialog_options_and_local_length_check", async () => {
    const html = renderToStaticMarkup(<CancellationReviewDialog review={reviewVm({ target })} />);

    expect(html).toContain("Registrar revisión");
    expect(html).toContain("Revisado: todo en orden");
    expect(html).toContain("Requiere aclaración");
    expect(html).toContain(">Nota<");
    expect(html).toContain("0 / 255 caracteres (mínimo 15)");
    expect(html).toContain("Guardar revisión");
    expect(html).toContain("Cancelar");

    const short = start({ note: "  corta  " });
    expect(await short.submit()).toBe(false);
    expect(short.api.createCancellationReview).not.toHaveBeenCalled();
    expect(short.h.state.fieldErrors.note).toEqual([noteLengthMessage]);
    expect(noteLengthMessage).toBe("Escribe una nota de entre 15 y 255 caracteres.");
    // El foco pasa al campo mediante el contador de foco.
    expect(short.h.state.noteFocusNonce).toBe(1);
    expect(read("components/CancellationReviewDialog.tsx")).toContain("noteRef.current?.focus()");

    const long = start({ note: "x".repeat(256) });
    expect(await long.submit()).toBe(false);
    expect(long.api.createCancellationReview).not.toHaveBeenCalled();

    const noChoice = start({ status: "" });
    expect(await noChoice.submit()).toBe(false);
    expect(noChoice.h.state.fieldErrors.status).toHaveLength(1);

    const ok = start({ note: `  ${goodNote}  ` });
    expect(await ok.submit()).toBe(true);
    expect(ok.api.createCancellationReview).toHaveBeenCalledWith({
      cashier_id: 7,
      business_date: "2026-11-18",
      status: "reviewed_ok",
      note: goodNote,
    });
  });

  it("test_ca06_counter_is_not_live_and_only_crossing_15_and_255_is_announced", () => {
    const html = renderToStaticMarkup(<CancellationReviewDialog review={reviewVm({ target, note: "x".repeat(20) })} />);

    // El contador visible ya no anuncia cada pulsación.
    expect(html).toContain('<p class="cancellation-review-counter">20 / 255 caracteres (mínimo 15)</p>');
    expect(html).not.toMatch(/cancellation-review-counter"[^>]*aria-live/);
    // El anuncio cambia solo al cruzar los límites.
    expect(noteLimitAnnouncement("")).toBe("");
    expect(noteLimitAnnouncement("x".repeat(14))).toBe("");
    expect(noteLimitAnnouncement("x".repeat(15))).toBe("Ya alcanzaste el mínimo de 15 caracteres.");
    expect(noteLimitAnnouncement("x".repeat(255))).toBe(noteLimitAnnouncement("x".repeat(16)));
    expect(noteLimitAnnouncement("x".repeat(256))).toBe("Superaste el máximo de 255 caracteres.");
    expect(html).toContain('<p class="visually-hidden" role="status">Ya alcanzaste el mínimo de 15 caracteres.</p>');
  });

  it("solo hay destino de revisión con cajero y nivel", () => {
    const [attention, , , none] = cashierDays();

    expect(reviewTargetFor(attention)).toEqual(target);
    expect(reviewTargetFor(none)).toBeNull();
  });
});

describe("CA-07 cancellation-review-signals", () => {
  it("test_ca07_success_closes_dialog_and_refreshes_from_api", async () => {
    const { h, submit } = start();

    expect(await submit()).toBe(true);
    expect(h.state.target).toBeNull();
    expect(h.state.busy).toBe(false);
    expect(h.state.notice).toMatchObject({ tone: "success", message: "Revisión guardada." });

    const html = renderToStaticMarkup(<CancellationReviewDialog review={reviewVm({ notice: h.state.notice })} />);
    expect(html).toContain('role="status"');
    expect(html).toContain("Revisión guardada.");

    // El refresco del reporte (RN-05) lo dispara el hook; no se recalcula el nivel en el cliente.
    const hook = read("viewmodels/useCancellationReview.ts");
    expect(hook).toContain("submitReviewAndRefresh(");
    expect(read("viewmodels/cancellation-review.ts")).toContain("deps.onSaved()");
    expect(read("sections/CancellationReportSection.tsx")).toContain("useCancellationReview(viewModel.actions.reload)");
    expect(read("viewmodels/cancellation-review.ts")).not.toMatch(/traffic_light\s*=(?!=)/);
  });
});

describe("CA-07 cancellation-review-signals (refresco tras guardar)", () => {
  async function runSubmit(openKey: string | null) {
    const { h, api } = start();
    const onSaved = vi.fn();
    const history: unknown[] = [];
    const startHistoryLoad = vi.fn(() => () => true);
    const saved = await submitReviewAndRefresh({
      api,
      dispatchDialog: h.dispatch,
      dispatchHistory: (action) => history.push(action),
      dialog: h.state,
      getOpenHistoryKey: () => openKey,
      startHistoryLoad,
      onSaved,
    });

    return { saved, api, onSaved, history, startHistoryLoad, h };
  }

  it("test_ca07_submit_reloads_history_when_the_row_detail_is_still_open", async () => {
    const open = await runSubmit("7:2026-11-18");

    expect(open.saved).toBe(true);
    expect(open.onSaved).toHaveBeenCalledTimes(1);
    expect(open.api.listCancellationReviews).toHaveBeenCalledWith(7, "2026-11-18");
    expect(open.history).toEqual([
      { type: "load-started", key: "7:2026-11-18" },
      { type: "loaded", key: "7:2026-11-18", items: expect.any(Array) },
    ]);

    // Detalle cerrado u otro abierto: solo se refresca el reporte; no se toca el historial.
    for (const key of [null, "9:2026-11-18"]) {
      const other = await runSubmit(key);

      expect(other.onSaved).toHaveBeenCalledTimes(1);
      expect(other.api.listCancellationReviews).not.toHaveBeenCalled();
      expect(other.startHistoryLoad).not.toHaveBeenCalled();
    }

    // Si la API rechaza, no hay refresco.
    const failed = start();
    const onSaved = vi.fn();

    failed.api.createCancellationReview.mockRejectedValueOnce(apiError(500, "Error del servidor."));
    await expect(
      submitReviewAndRefresh({
        api: failed.api,
        dispatchDialog: failed.h.dispatch,
        dispatchHistory: () => undefined,
        dialog: failed.h.state,
        getOpenHistoryKey: () => "7:2026-11-18",
        startHistoryLoad: () => () => true,
        onSaved,
      }),
    ).resolves.toBe(false);
    expect(onSaved).not.toHaveBeenCalled();
  });
});

describe("CA-08 cancellation-review-signals", () => {
  it("test_ca08_review_errors_show_api_messages_without_retry", async () => {
    const field = start();
    field.api.createCancellationReview.mockRejectedValueOnce(
      apiError(422, "La nota es obligatoria.", { note: ["La nota debe tener entre 15 y 255 caracteres."] }),
    );
    await field.submit();
    expect(field.h.state.fieldErrors.note).toEqual(["La nota debe tener entre 15 y 255 caracteres."]);
    expect(field.h.state.error).toBe("");
    expect(field.h.state.target).not.toBeNull();

    const decision = start();
    decision.api.createCancellationReview.mockRejectedValueOnce(apiError(422, "El día ya tiene esa decisión."));
    await decision.submit();
    expect(decision.h.state.error).toBe("El día ya tiene esa decisión.");
    expect(renderToStaticMarkup(<CancellationReviewDialog review={reviewVm({ target, error: "El día ya tiene esa decisión." })} />)).toContain(
      "El día ya tiene esa decisión.",
    );

    const forbidden = start();
    forbidden.api.createCancellationReview.mockRejectedValueOnce(apiError(403, "No tienes permiso."));
    await forbidden.submit();
    expect(forbidden.h.state.target).toBeNull();
    expect(forbidden.h.state.notice).toMatchObject({ tone: "error", message: "No tienes permiso." });

    for (const [status, message] of [[429, "Demasiados intentos."], [500, "Error del servidor."]] as const) {
      const failed = start();
      failed.api.createCancellationReview.mockRejectedValueOnce(apiError(status, message));
      await failed.submit();
      expect(failed.h.state.error).toBe(message);
      expect(failed.h.state.busy).toBe(false);
      expect(failed.api.createCancellationReview).toHaveBeenCalledTimes(1);
    }

    const network = start();
    network.api.createCancellationReview.mockRejectedValueOnce(new TypeError("fetch failed"));
    await network.submit();
    expect(network.h.state.error).toContain("No fue posible conectar");
    expect(network.api.createCancellationReview).toHaveBeenCalledTimes(1);
  });
});

describe("CA-09 cancellation-review-signals", () => {
  it("test_ca09_history_is_loaded_from_api_newest_first", async () => {
    const h = createHarness(reviewHistoryReducer, initialReviewHistoryState);
    const api = {
      createCancellationReview: vi.fn(),
      listCancellationReviews: vi.fn(async (..._args: unknown[]) => [
        reviewDto({ id: 3, note: "Tercera nota de revisión." }),
        reviewDto({ id: 2, note: "Segunda nota de revisión." }),
        reviewDto({ id: 1, note: "Primera nota de revisión." }),
      ]),
    };

    await loadCancellationReviewHistory(api, h.dispatch, target);
    expect(api.listCancellationReviews).toHaveBeenCalledWith(7, "2026-11-18");
    expect(h.state.status).toBe("ready");

    const html = renderToStaticMarkup(<CancellationReviewHistory history={h.state} timezone="America/Mexico_City" />);
    // Mismo orden que la API: la más reciente primero, sin reordenar en el cliente.
    expect(html.indexOf("Tercera")).toBeLessThan(html.indexOf("Segunda"));
    expect(html.indexOf("Segunda")).toBeLessThan(html.indexOf("Primera"));
    expect(html).toContain("Ana Admin");
    expect(read("viewmodels/cancellation-review.ts")).not.toMatch(/\.sort\(/);

    expect(
      renderToStaticMarkup(
        <CancellationReviewHistory history={{ ...initialReviewHistoryState, key: "7:2026-11-18", status: "ready" }} timezone="America/Mexico_City" />,
      ),
    ).toContain("Sin revisiones registradas.");

    api.listCancellationReviews.mockRejectedValueOnce(apiError(500, "Error del servidor."));
    await loadCancellationReviewHistory(api, h.dispatch, target);
    expect(h.state.status).toBe("error");
    expect(h.state.error).toBe("Error del servidor.");
  });
});

describe("CA-14 cancellation-review-signals", () => {
  it("test_ca14_dialog_focus_and_escape_and_no_horizontal_overflow", () => {
    const dialog = read("components/CancellationReviewDialog.tsx");
    const html = renderToStaticMarkup(<CancellationReviewDialog review={reviewVm({ target })} />);
    const ui = read("../../../packages/ui/src/index.tsx");

    // Diálogo modal nativo: foco inicial en el primer control (la primera opción), Escape
    // cierra por `onCancel` y el navegador devuelve el foco al botón que lo abrió.
    expect(dialog).toContain("<Dialog");
    expect(ui).toContain("showModal()");
    expect(ui).toContain("onCancel");
    expect(html.indexOf('type="radio"')).toBeGreaterThan(-1);
    expect(html.indexOf('type="radio"')).toBeLessThan(html.indexOf("<textarea"));
    expect(html.indexOf("<textarea")).toBeLessThan(html.indexOf("Guardar revisión"));

    // Tabla con caption y desplazamiento propio; sin anchos fijos en px.
    const table = renderTrafficMarkup();
    expect(table).toContain('<caption class="visually-hidden">Semáforo por cajero y día</caption>');
    expect(table).toContain("table-scroll data-table-scroll");
    const styles = read("styles.css");
    const block = styles.slice(
      styles.indexOf("cancellation-review-signals:start"),
      styles.indexOf("cancellation-review-signals:end"),
    );
    expect(block).not.toMatch(/(?<![-\w])(?:width|min-width)\s*:\s*\d+px/);
    expect(block).not.toMatch(/overflow-x\s*:\s*scroll/);
  });
});

import { renderTraffic } from "./cancellation-review-fixtures";

function renderTrafficMarkup() {
  return renderTraffic();
}
