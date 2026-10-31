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

describe("CA-14 real-staff-login", () => {
  it("tiene una prueba nombrada por cada criterio de dashboard-002", () => {
    for (let number = 1; number <= 14; number += 1) {
      const criterion = `CA-${String(number).padStart(2, "0")} real-staff-login`;
      expect(testSource).toContain(criterion);
    }
  });
});
