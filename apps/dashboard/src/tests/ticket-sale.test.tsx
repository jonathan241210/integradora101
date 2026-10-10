import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TicketSaleView } from "../views/TicketSaleView";
import {
  dashboardDemoReducer,
  initialDashboardDemoState,
} from "../viewmodels/dashboard-demo";

function ticketState() {
  const selected = dashboardDemoReducer(initialDashboardDemoState, {
    type: "select-profile",
    profile: "ticket",
  });
  return dashboardDemoReducer(selected, {
    type: "login-ticket",
    username: "taquilla@demo.local",
    password: "demo1234",
  });
}

describe("CA-04 admin-dashboard-prototype", () => {
  it("recorre los estados visuales de venta sin calcular ni guardar una transacción", () => {
    const confirmationState = dashboardDemoReducer(ticketState(), { type: "open-sale" });
    const processingState = dashboardDemoReducer(confirmationState, {
      type: "begin-sale",
    });
    const completeState = dashboardDemoReducer(processingState, {
      type: "finish-sale",
    });

    const confirmation = renderToStaticMarkup(
      <TicketSaleView
        saleStep={confirmationState.saleStep}
        onOpen={() => undefined}
        onCancel={() => undefined}
        onConfirm={() => undefined}
        onReset={() => undefined}
      />,
    );
    const processing = renderToStaticMarkup(
      <TicketSaleView
        saleStep={processingState.saleStep}
        onOpen={() => undefined}
        onCancel={() => undefined}
        onConfirm={() => undefined}
        onReset={() => undefined}
      />,
    );
    const complete = renderToStaticMarkup(
      <TicketSaleView
        saleStep={completeState.saleStep}
        onOpen={() => undefined}
        onCancel={() => undefined}
        onConfirm={() => undefined}
        onReset={() => undefined}
      />,
    );

    expect(confirmation).toContain("Confirmar venta de demostración");
    expect(confirmation).toContain("No se recibirá dinero ni se guardará ninguna venta");
    expect(processing).toContain("No hay conexión con un proveedor de pago");
    expect(complete).toContain("No se creó una transacción");
    expect(complete).toContain("Importe de muestra");
  });

  it("no finaliza el flujo si no estaba procesando", () => {
    expect(
      dashboardDemoReducer(initialDashboardDemoState, { type: "finish-sale" })
        .saleStep,
    ).toBe("idle");
  });

  it("no abre la venta sin una sesión ficticia de taquilla", () => {
    const state = dashboardDemoReducer(initialDashboardDemoState, {
      type: "open-sale",
    });
    expect(state.saleStep).toBe("idle");
  });
});
