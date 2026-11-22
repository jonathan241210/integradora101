import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testsDirectory = fileURLToPath(new URL(".", import.meta.url));
const testSource = readdirSync(testsDirectory)
  .filter((filename) => filename.endsWith(".test.tsx"))
  .map((filename) => readFileSync(`${testsDirectory}${filename}`, "utf8"))
  .join("\n");

describe("CA-14 pending-review-badges", () => {
  it("CA-14 pending-review-badges: tiene al menos una prueba nombrada por cada criterio CA-01 a CA-16", () => {
    for (let number = 1; number <= 16; number += 1) {
      const name = `CA-${String(number).padStart(2, "0")} pending-review-badges`;

      expect(testSource, name).toContain(`it("${name}`);
    }
  });
});
