import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const testsDirectory = fileURLToPath(new URL(".", import.meta.url));
/** Solo `memory-*.test.tsx` (incluida esta, que nombra CA-16): no lee las pruebas de otras specs. */
const memoryTests = readdirSync(testsDirectory).filter((filename) =>
  /^memory-[a-z-]+\.test\.tsx$/.test(filename),
);
const testSource = memoryTests
  .map((filename) => readFileSync(`${testsDirectory}${filename}`, "utf8"))
  .join("\n");

const label = (number: number) => `CA-${String(number).padStart(2, "0")}`;

/** Criterios CA-01 a CA-19 sin una prueba que los nombre con el prefijo `memory-`. */
function missingCriteria(source: string): string[] {
  const named = new Set(
    [...source.matchAll(/\bit\(\s*["`]CA-(\d{2}) memory-[a-z-]+/g)].map((match) => Number(match[1])),
  );

  return Array.from({ length: 19 }, (_, index) => index + 1)
    .filter((number) => !named.has(number))
    .map(label);
}

it("CA-16 memory-coverage: cada CA-01 a CA-19 aparece en al menos un test memory-*.test.tsx", () => {
  expect(memoryTests.length).toBeGreaterThan(5);
  expect(memoryTests).not.toContain("species-requests-list.test.tsx");
  expect(missingCriteria(testSource)).toEqual([]);

  // El test falla si falta un criterio: sin la prueba de CA-17, lo detecta.
  const withoutCa17 = testSource.replaceAll("CA-17 memory-", "RN-00 memory-");

  expect(missingCriteria(withoutCa17)).toEqual(["CA-17"]);
});
