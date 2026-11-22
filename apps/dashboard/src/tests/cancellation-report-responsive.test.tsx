import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readyReportState, renderReport } from "./cancellation-report-helpers";

const styles = readFileSync(fileURLToPath(new URL("../styles.css", import.meta.url)), "utf8");
const block = styles.slice(
  styles.indexOf("/* cancellation-report:start"),
  styles.indexOf("/* cancellation-report:end"),
);

describe("CA-22 ticket-cancellation-report", () => {
  it("test_ca22_tables_scroll_on_their_own_and_layout_stacks_on_narrow_screens", () => {
    const markup = renderReport(readyReportState());

    // DataTable: región con desplazamiento propio, foco por teclado y diseño apilado angosto.
    expect(markup).toContain('class="table-scroll data-table-scroll"');
    expect(markup).toContain('tabindex="0"');
    expect(markup).toContain('data-label="Folio"');
    expect(styles).toMatch(/\.table-scroll\s*\{[^}]*overflow-x:\s*auto/s);
    expect(styles).toMatch(/\.data-table-scroll:focus-visible/);
    expect(styles).toMatch(/:focus-visible/);
    expect(block).toMatch(/\.cancellation-card \.data-table-scroll\s*\{[^}]*overflow:\s*auto/s);
    expect(block).toMatch(/thead th\s*\{[^}]*position:\s*sticky/s);
    expect(block).toMatch(/@media \(max-width: 820px\)[\s\S]*\.cancellation-breakdowns/);
    expect(block).toMatch(/\.cancellation-filters\s*\{[^}]*auto-fit/s);
    // El recorrido con teclado y los anchos de 360 a 1366 px se revisan a mano.
  });
});
