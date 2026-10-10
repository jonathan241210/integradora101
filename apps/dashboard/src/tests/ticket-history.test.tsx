import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TicketHistoryView } from "../views/TicketHistoryView";

describe("CA-11 admin-dashboard-prototype", () => {
  it("presenta filas y filtros de historial marcados como ficticios", () => {
    const markup = renderToStaticMarkup(<TicketHistoryView />);

    expect(markup).toContain("Historial de boletos");
    expect(markup).toContain("MUESTRA-001");
    expect(markup).toContain("Importe ficticio");
    expect(markup).toContain("Los filtros solo recorren datos estáticos");
    expect(markup).toContain("Sin transacciones reales");
  });

  it("mantiene separada la pantalla de historial respecto al reporte administrativo", () => {
    const markup = renderToStaticMarkup(<TicketHistoryView />);
    expect(markup).not.toContain("Reporte de boletos");
    expect(markup).not.toContain("Ingresos");
  });
});
