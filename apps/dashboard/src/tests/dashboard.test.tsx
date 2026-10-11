import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DashboardView } from "../views/DashboardView";
import { getSectionsForProfile } from "../viewmodels/dashboard-demo";

describe("CA-02 admin-dashboard-prototype", () => {
  it("muestra indicadores y contenidos identificados como datos de muestra", () => {
    const markup = renderToStaticMarkup(
      <DashboardView onNavigate={() => undefined} />,
    );
    expect(markup).toContain("Resumen general del zoológico");
    expect(markup).toContain("Animales");
    expect(markup).toContain("248");
    expect(markup).toContain("Importes ficticios");
    expect(markup).toContain("Actividad reciente");
    expect(markup).toContain("Demostración");
    expect(getSectionsForProfile("administration")).toContain("enclosures");
    expect(getSectionsForProfile("administration")).toContain("ticket-users");
    expect(getSectionsForProfile("administration")).not.toContain("tickets");
  });
});
