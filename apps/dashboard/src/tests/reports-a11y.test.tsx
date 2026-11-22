import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReportTabs } from "../components/ReportTabs";
import { availableReportTabs, tabForKey } from "../viewmodels/report-tabs";

const tabs = availableReportTabs(["reports.view", "reports.cancellations.view", "tickets.view-all"]);

describe("CA-31 unified-reports-and-feedback", () => {
  it("las pestañas tienen roles, flechas y estados ARIA", () => {
    const markup = renderToStaticMarkup(
      <ReportTabs tabs={tabs} active="cancellations" onSelect={() => undefined}>
        <p>Contenido</p>
      </ReportTabs>,
    );

    expect(markup).toContain('role="tablist"');
    expect(markup.match(/role="tab"/g)).toHaveLength(3);
    expect(markup).toContain('role="tabpanel"');
    expect(markup).toMatch(/aria-selected="true"[^>]*>Cancelaciones</);
    expect(markup.match(/aria-selected="false"/g)).toHaveLength(2);
    expect(markup).toContain('aria-controls="report-panel-cancellations"');
    expect(markup).toContain('aria-labelledby="report-tab-cancellations"');
    // Solo la pestaña activa entra en el orden de tabulación (patrón de pestañas).
    expect(markup.match(/tabindex="0"/g)).toHaveLength(2); // pestaña activa y panel
    expect(markup.match(/tabindex="-1"/g)).toHaveLength(2);
  });

  it("flechas, Inicio y Fin cambian de pestaña con vuelta circular", () => {
    expect(tabForKey(tabs, "tickets", "ArrowRight")).toBe("cancellations");
    expect(tabForKey(tabs, "history", "ArrowRight")).toBe("tickets");
    expect(tabForKey(tabs, "tickets", "ArrowLeft")).toBe("history");
    expect(tabForKey(tabs, "cancellations", "Home")).toBe("tickets");
    expect(tabForKey(tabs, "cancellations", "End")).toBe("history");
    expect(tabForKey(tabs, "tickets", "Enter")).toBeNull();
    expect(tabForKey([], "tickets", "Home")).toBeNull();
  });

  it("tiene foco visible, sin desbordamiento horizontal en pantallas angostas", () => {
    const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

    expect(css).toMatch(/\.section-tab:focus-visible/);
    expect(css).toMatch(/\.section-tab-panel:focus-visible/);
    expect(css).toMatch(/\.report-tabs \{[^}]*overflow-x: auto/);
  });
});
