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

describe("CA-18 administration-sections", () => {
  it("tiene una prueba nombrada por cada criterio CA-01 a CA-20 de dashboard-003", () => {
    for (let number = 1; number <= 20; number += 1) {
      const criterion = `CA-${String(number).padStart(2, "0")} administration-sections`;

      expect(testSource, criterion).toContain(`describe("${criterion}"`);
    }
  });

  it("las pruebas usan un cliente simulado de @arca/api-client", () => {
    const fixtures = readFileSync(
      new URL("admin-fixtures.ts", `file://${testsDirectory}/`),
      "utf8",
    );

    expect(fixtures).toContain("createAdminApiMock");
    expect(fixtures).toContain("vi.fn");
  });
});

describe("CA-20 inline-content-forms", () => {
  it("tiene una prueba nombrada por cada criterio CA-01 a CA-19 de dashboard-004 (CA-20)", () => {
    for (let number = 1; number <= 19; number += 1) {
      const criterion = `CA-${String(number).padStart(2, "0")} inline-content-forms`;

      expect(testSource, criterion).toContain(`describe("${criterion}"`);
    }
  });
});

describe("CA-28 enclosure-actions-global-search", () => {
  it("tiene un describe nombrado por cada criterio CA-01 a CA-44 de dashboard-012", () => {
    for (let number = 1; number <= 44; number += 1) {
      const criterion = `CA-${String(number).padStart(2, "0")} enclosure-actions-global-search`;

      expect(testSource, criterion).toContain(`describe("${criterion}"`);
    }
  });
});

describe("registro enclosure-qr-printing (dashboard-013)", () => {
  it("tiene un describe nombrado por cada criterio CA-01 a CA-23 de dashboard-013", () => {
    for (let number = 1; number <= 23; number += 1) {
      const criterion = `CA-${String(number).padStart(2, "0")} enclosure-qr-printing`;

      expect(testSource, criterion).toContain(`describe("${criterion}"`);
    }
  });
});

describe("CA-16 step-up-confirmation", () => {
  it("tiene un describe nombrado por cada criterio CA-01 a CA-17 de dashboard-015", () => {
    for (let number = 1; number <= 17; number += 1) {
      const id = `CA-${String(number).padStart(2, "0")}`;
      const named = ["step-up-confirmation", "step-up-two-factor"].some((suffix) =>
        testSource.includes(`describe("${id} ${suffix}"`),
      );

      expect(named, `${id} step-up`).toBe(true);
    }
  });

  it("tiene un describe nombrado por cada criterio CA-18 a CA-25 de dashboard-015", () => {
    for (let number = 18; number <= 20; number += 1) {
      const id = `CA-${number}`;
      const named = ["step-up-confirmation", "step-up-two-factor"].some((suffix) =>
        testSource.includes(`describe("${id} ${suffix}`),
      );

      expect(named, `${id} step-up`).toBe(true);
    }
    for (let number = 21; number <= 25; number += 1) {
      expect(testSource).toContain(`describe("CA-${number} step-up-lockout-countdown"`);
    }
  });

  it("las pruebas usan respuestas simuladas y contraseñas ficticias", () => {
    const source = readFileSync(
      new URL("step-up-confirmation.test.tsx", `file://${testsDirectory}/`),
      "utf8",
    );

    expect(source).toContain("Contraseñas ficticias");
    expect(source).not.toMatch(/fetch\("https?:/);
  });
});
