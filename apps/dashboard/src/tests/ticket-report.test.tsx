import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TicketReportView } from "../views/TicketReportView";
import { getSectionsForProfile } from "../viewmodels/dashboard-demo";

describe("CA-05 admin-dashboard-prototype", () => {
  it("presenta filtros e indicadores con una tabla ficticia", () => {
    const markup = renderToStaticMarkup(<TicketReportView />);
    expect(markup).toContain("Reporte de boletos");
    expect(markup).toContain("no se guardan cambios ni se realizan cobros");
    expect(markup).toContain("Ingresos");
    expect(markup).toContain("Importe sin valor financiero real");
    expect(markup).toContain("Tabla demostrativa de ventas de boletos ficticias");
    expect(markup).toContain("Ventas de muestra");
    expect(getSectionsForProfile("administration")).toContain("reports");
    expect(getSectionsForProfile("administration")).not.toContain("ticket-history");
  });
});
