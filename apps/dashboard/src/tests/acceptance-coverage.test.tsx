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
  "../views/TwoFactorChallengeView.tsx",
  "../views/TwoFactorSetupView.tsx",
  "../views/PwaRedirectView.tsx",
  "../views/LoginView.tsx",
  "../views/EnclosuresView.tsx",
  "../views/TicketHistoryView.tsx",
  "../views/TicketUsersView.tsx",
]
  .map((path) => readFileSync(new URL(path, import.meta.url), "utf8"))
  .join("\n");
const loginViewSource = readFileSync(
  new URL("../views/LoginView.tsx", import.meta.url),
  "utf8",
);

describe("CA-07 admin-dashboard-prototype", () => {
  it("tiene pruebas nombradas para cada criterio vigente de dashboard-001", () => {
    const currentCriteria = [2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 14, 15];

    for (const number of currentCriteria) {
      const criterion = `CA-${String(number).padStart(2, "0")} admin-dashboard-prototype`;
      expect(testSource).toContain(criterion);
    }

    for (const replacedCriterion of [1, 10, 13]) {
      expect(testSource).not.toContain(
        `CA-${String(replacedCriterion).padStart(2, "0")} admin-dashboard-prototype`,
      );
    }
  });

  it("no incorpora cliente de red, almacenamiento persistente ni pagos", () => {
    expect(applicationSource).not.toMatch(/\b(?:fetch|axios)\b/);
    expect(applicationSource).not.toMatch(/\b(?:localStorage|sessionStorage)\b/);
    expect(applicationSource).not.toMatch(/(?:stripe|paypal|mercadopago)/i);
    expect(applicationSource).not.toContain("demoAdministrationCredentials");
    expect(loginViewSource).not.toContain("administrador@demo.local");
    expect(loginViewSource).not.toContain("taquilla@demo.local");
    expect(loginViewSource).not.toContain("demo1234");
  });
});
