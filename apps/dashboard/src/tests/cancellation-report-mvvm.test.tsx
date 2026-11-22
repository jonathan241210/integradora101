import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
const presentational = [
  "../views/CancellationReportView.tsx",
  "../components/CancelTicketDialog.tsx",
  "../sections/CancellationReportSection.tsx",
];

describe("CA-23 ticket-cancellation-report", () => {
  it("test_ca23_views_have_no_fetch_axios_services_or_business_calculations", () => {
    for (const file of presentational) {
      const source = read(file);

      expect(source, file).not.toMatch(/\bfetch\s*\(/);
      expect(source, file).not.toMatch(/\baxios\b/);
      expect(source, file).not.toMatch(/@arca\/api-client/);
      expect(source, file).not.toMatch(/@\/services\//);
      // Sin sumas, promedios, porcentajes ni comparación de importes en la vista.
      expect(source, file).not.toMatch(/\.reduce\(/);
      expect(source, file).not.toMatch(/Number\(|parseFloat\(|toFixed\(/);
      expect(source, file).not.toMatch(/permissions\b/);
    }
  });

  it("las llamadas pasan por hooks ViewModel: uno para el reporte y otro para el catálogo", () => {
    expect(read("../viewmodels/useCancellationReport.ts")).toContain("adminApi");
    expect(read("../viewmodels/useCancellationReasons.ts")).toContain("ticketSalesApi");
    expect(read("../sections/CancellationReportSection.tsx")).toContain("useCancellationReport");
  });
});
