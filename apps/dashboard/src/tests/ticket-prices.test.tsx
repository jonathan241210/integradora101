import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { StaffProfile } from "@arca/api-client";
import { TicketPricesView } from "../views/TicketPricesView";
import { getNavigationForProfile } from "../viewmodels/navigation";
import {
  buildPriceInput,
  initialTicketPricesState,
  loadTicketPrices,
  localDateTimeToIso,
  priceConfirmationCopy,
  requestPriceConfirmation,
  submitPriceChange,
  ticketPricesReducer,
  twoFactorRequiredMessage,
  type TicketPricesAction,
  type TicketPricesState,
  type TicketPricesViewModel,
} from "../viewmodels/ticket-prices";
import { apiError, createHarness } from "./admin-fixtures";
import {
  codedApiError,
  createTicketSalesApiMock,
  priceCurrent,
} from "./ticket-sales-fixtures";

const noop = () => undefined;
const actions: TicketPricesViewModel["actions"] = {
  changeForm: noop,
  requestConfirmation: noop,
  cancelConfirmation: noop,
  confirm: noop,
  reload: noop,
  dismissNotice: noop,
};

const render = (state: TicketPricesState) =>
  renderToStaticMarkup(<TicketPricesView state={state} actions={actions} />);

function stateWith(...list: TicketPricesAction[]): TicketPricesState {
  return list.reduce(ticketPricesReducer, initialTicketPricesState);
}

function profile(permissions: string[]): StaffProfile {
  return {
    id: 1,
    first_name: "Personal",
    last_name: "Prueba",
    second_last_name: null,
    full_name: "Personal Prueba",
    email: "personal@test.arca.invalid",
    department: null,
    roles: ["admin"],
    permissions,
    home: "administration",
    pwa_url: null,
    two_factor_setup_required: false,
  };
}

const filled = {
  adultAmount: "30",
  childAmount: "20.50",
};

describe("CA-14 ticket-sales", () => {
  it("la sección «Precios» aparece solo con ticket-prices.manage", () => {
    const labels = (permissions: string[]) =>
      getNavigationForProfile(profile(permissions)).map((item) => item.label);

    expect(labels(["dashboard.view", "ticket-prices.manage"])).toContain("Precios");
    expect(labels(["dashboard.view", "tickets.view"])).not.toContain("Precios");
  });

  it("muestra el precio vigente de adulto y niño devuelto por la API", async () => {
    const api = createTicketSalesApiMock();
    const h = createHarness(ticketPricesReducer, initialTicketPricesState);

    await loadTicketPrices(api, h.dispatch);

    const markup = render(h.state);

    expect(api.prices.current).toHaveBeenCalledOnce();
    expect(markup).toContain("$25.00");
    expect(markup).toContain("$16.00");
  });
});

describe("CA-15 ticket-sales", () => {
  it("el formulario tiene montos, selector «Aplicar ahora» o «Programar» y fecha solo al programar", () => {
    const immediate = render(stateWith({ type: "form-changed", changes: { mode: "immediate" } }));
    const scheduled = render(stateWith({ type: "form-changed", changes: { mode: "scheduled" } }));

    expect(immediate).toContain('for="price-adult"');
    expect(immediate).toContain('for="price-child"');
    expect(immediate).toContain("Aplicar ahora");
    expect(immediate).toContain("Programar");
    expect(immediate).not.toContain('id="price-effective-at"');
    expect(scheduled).toContain('id="price-effective-at"');
    expect(scheduled).toContain('type="datetime-local"');
  });

  it("muestra los errores 422 junto a cada campo", async () => {
    const api = createTicketSalesApiMock();
    api.prices.schedule.mockRejectedValue(
      apiError(422, "El precio de adulto no es válido.", {
        adult_amount: ["El precio de adulto no es válido."],
        effective_at: ["La fecha debe ser futura."],
      }),
    );
    const h = createHarness(
      ticketPricesReducer,
      stateWith({ type: "form-changed", changes: { ...filled, mode: "scheduled" } }),
    );

    await submitPriceChange(api, h.dispatch, {
      adult_amount: "30",
      child_amount: "20.50",
      mode: "scheduled",
      effective_at: "2026-12-01T09:00:00-06:00",
    });

    const markup = render(h.state);

    expect(markup).toMatch(/id="price-adult-error"[^>]*>El precio de adulto no es válido\.<\/p>/);
    expect(markup).toMatch(/id="price-effective-at-error"[^>]*>La fecha debe ser futura\.<\/p>/);
  });

  it("la confirmación nombra los montos y cuándo entran en vigor, y la API solo se llama al confirmar", async () => {
    const api = createTicketSalesApiMock();
    const h = createHarness(
      ticketPricesReducer,
      stateWith({ type: "form-changed", changes: { ...filled, mode: "immediate" } }),
    );

    expect(requestPriceConfirmation(h.dispatch, h.state.form)).toBe(true);
    const markup = render(h.state);

    expect(markup).toContain("Confirmar cambio de precios");
    expect(markup).toContain("$30.00");
    expect(markup).toContain("$20.50");
    expect(markup).toContain("de inmediato");
    expect(api.prices.schedule).not.toHaveBeenCalled();

    const scheduled = buildPriceInput({
      ...filled,
      mode: "scheduled",
      effectiveAt: "2026-12-01T09:00",
    });

    expect(scheduled.ok).toBe(true);
    if (scheduled.ok) {
      expect(priceConfirmationCopy(scheduled.input)?.message).toMatch(/el 01\/12\/2026 \d{2}:\d{2}/);
    }
  });

  it("convierte la fecha local a ISO 8601 con desfase y exige fecha al programar", () => {
    const iso = localDateTimeToIso("2026-12-01T09:00");

    expect(iso).toMatch(/^2026-12-01T09:00:00[+-]\d{2}:\d{2}$/);
    expect(new Date(iso as string).getTime()).toBe(new Date("2026-12-01T09:00").getTime());
    expect(localDateTimeToIso("")).toBeNull();

    const missing = buildPriceInput({ ...filled, mode: "scheduled", effectiveAt: "" });

    expect(missing.ok).toBe(false);
    expect(buildPriceInput({ adultAmount: "", childAmount: "", mode: "immediate", effectiveAt: "" }).ok).toBe(false);
  });
});

describe("CA-16 ticket-sales", () => {
  it("un 403 two_factor_setup_required muestra el mensaje de 2FA en español, sin comprobación previa", async () => {
    const api = createTicketSalesApiMock();
    api.prices.schedule.mockRejectedValue(
      codedApiError(403, "Debes configurar la autenticación en dos pasos.", "two_factor_setup_required"),
    );
    const h = createHarness(ticketPricesReducer, initialTicketPricesState);

    await loadTicketPrices(api, h.dispatch);
    // Antes del cambio no hubo ninguna consulta de estado 2FA: solo `prices.current`.
    expect(api.prices.current).toHaveBeenCalledOnce();
    expect(h.state.twoFactorRequired).toBe(false);

    await submitPriceChange(api, h.dispatch, {
      adult_amount: "30",
      child_amount: "20",
      mode: "immediate",
    });

    const markup = render(h.state);

    expect(h.state.twoFactorRequired).toBe(true);
    expect(markup).toContain('role="alert"');
    expect(markup).toContain(twoFactorRequiredMessage);
    expect(markup).toContain("segundo factor");
  });

  it("un 403 de permiso común no activa el mensaje de 2FA", async () => {
    const api = createTicketSalesApiMock();
    api.prices.schedule.mockRejectedValue(
      codedApiError(403, "No tienes permiso para realizar esta acción."),
    );
    const h = createHarness(ticketPricesReducer, initialTicketPricesState);

    await submitPriceChange(api, h.dispatch, { adult_amount: "1", child_amount: "1", mode: "immediate" });

    expect(h.state.twoFactorRequired).toBe(false);
    expect(render(h.state)).toContain("No tienes permiso para realizar esta acción.");
  });
});

describe("CA-17 ticket-sales", () => {
  it("tras el 201 refresca el vigente y confirma con un aviso accesible de la sección", async () => {
    const api = createTicketSalesApiMock();
    const next = {
      amount: "28.00",
      effective_at: "2026-12-01T15:00:00Z",
    };
    api.prices.current.mockResolvedValue(
      priceCurrent({
        adult: { amount: "25.00", effective_at: "2026-01-01T00:00:00Z", message: null, next },
      }),
    );
    const h = createHarness(ticketPricesReducer, initialTicketPricesState);

    await loadTicketPrices(api, h.dispatch);
    const ok = await submitPriceChange(api, h.dispatch, {
      adult_amount: "28",
      child_amount: "16",
      mode: "scheduled",
      effective_at: "2026-12-01T09:00:00-06:00",
    });

    const markup = render(h.state);

    expect(ok).toBe(true);
    expect(api.prices.current).toHaveBeenCalledTimes(2);
    expect(markup).toMatch(/role="status"[^>]*>Cambio de precios programado para el /);
    expect(markup).toContain("Próximo cambio programado");
    expect(markup).toContain("$28.00");
    expect(markup).not.toContain("correo");
  });

  it("un cambio inmediato confirma que los precios ya están vigentes", async () => {
    const api = createTicketSalesApiMock();
    const h = createHarness(ticketPricesReducer, initialTicketPricesState);

    await submitPriceChange(api, h.dispatch, {
      adult_amount: "30",
      child_amount: "20",
      mode: "immediate",
    });

    expect(h.state.notice).toBe("Los precios se actualizaron y ya están vigentes.");
    expect(h.state.pending).toBeNull();
  });
});
