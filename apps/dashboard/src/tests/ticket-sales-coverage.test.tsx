import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testsDirectory = fileURLToPath(new URL(".", import.meta.url));
const testSource = readdirSync(testsDirectory)
  .filter((filename) => filename.endsWith(".test.tsx"))
  .map((filename) => readFileSync(`${testsDirectory}${filename}`, "utf8"))
  .join("\n");

const currentCriteria = [
  ...Array.from({ length: 17 }, (_, index) => index + 1),
  ...[21, 22, 23, 24, 25],
  ...[27, 28, 29],
  ...[31, 32, 33, 34],
  ...[35, 36, 37, 38, 39],
];
const deferredCriteria = [18, 19, 20, 26, 30];
const name = (number: number) => `CA-${String(number).padStart(2, "0")} ticket-sales`;

describe("CA-25 ticket-sales", () => {
  it("tiene una prueba nombrada por cada criterio vigente de dashboard-005", () => {
    expect(currentCriteria).toHaveLength(34);

    for (const number of currentCriteria) {
      expect(testSource, name(number)).toContain(`describe("${name(number)}"`);
    }
  });

  it("no exige pruebas de los criterios diferidos", () => {
    for (const number of deferredCriteria) {
      expect(testSource).not.toContain(`describe("${name(number)}"`);
    }
  });
});
