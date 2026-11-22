import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testsDirectory = fileURLToPath(new URL(".", import.meta.url));
const testSource = readdirSync(testsDirectory)
  .filter((filename) => filename.endsWith(".test.tsx"))
  .map((filename) => readFileSync(`${testsDirectory}${filename}`, "utf8"))
  .join("\n");

describe("CA-25 ticket-cancellation-report", () => {
  it("tiene al menos una prueba nombrada por cada criterio de dashboard-016 (CA-01 a CA-35)", () => {
    for (let number = 1; number <= 35; number += 1) {
      const name = `CA-${String(number).padStart(2, "0")} ticket-cancellation-report`;

      expect(testSource, name).toContain(`describe("${name}"`);
    }
  });
});
