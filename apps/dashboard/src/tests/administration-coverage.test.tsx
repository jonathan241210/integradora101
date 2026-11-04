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
  it("tiene una prueba nombrada por cada criterio CA-01 a CA-19 de dashboard-003", () => {
    for (let number = 1; number <= 19; number += 1) {
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
