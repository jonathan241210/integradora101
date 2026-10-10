import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testsDirectory = fileURLToPath(new URL(".", import.meta.url));
const testSource = readdirSync(testsDirectory)
  .filter((filename) => filename.endsWith(".test.tsx"))
  .map((filename) =>
    readFileSync(new URL(filename, `file://${testsDirectory}/`), "utf8"),
  )
  .join("\n");

const applicationSource = [
  "../App.tsx",
  "../data/demo-data.ts",
  "../viewmodels/dashboard-demo.ts",
  "../views/LoginView.tsx",
  "../views/EnclosuresView.tsx",
  "../views/TicketHistoryView.tsx",
  "../views/TicketUsersView.tsx",
]
  .map((path) => readFileSync(new URL(path, import.meta.url), "utf8"))
  .join("\n");

describe("CA-07 admin-dashboard-prototype", () => {
  it("tiene pruebas nombradas para cada criterio CA-01..CA-14", () => {
    for (let number = 1; number <= 14; number += 1) {
      const criterion = `CA-${String(number).padStart(2, "0")} admin-dashboard-prototype`;
      expect(testSource).toContain(criterion);
    }
  });

  it("no incorpora cliente de red, almacenamiento persistente ni pagos", () => {
    expect(applicationSource).not.toMatch(/\b(?:fetch|axios)\b/);
    expect(applicationSource).not.toMatch(/\b(?:localStorage|sessionStorage)\b/);
    expect(applicationSource).not.toMatch(/(?:stripe|paypal|mercadopago)/i);
  });
});
