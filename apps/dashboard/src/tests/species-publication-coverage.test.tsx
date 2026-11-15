import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const testsDirectory = fileURLToPath(new URL(".", import.meta.url));
const ownFile = "species-publication-coverage.test.tsx";
/** Pruebas de la sección: `species-*.test.tsx` y `published-species-*.test.tsx`. */
const sectionTests = readdirSync(testsDirectory).filter(
  (filename) =>
    filename !== ownFile && /^(?:(?:published-)?species|tulanpedia)-[a-z-]+\.test\.tsx$/.test(filename),
);
const testSource = sectionTests
  .map((filename) => readFileSync(`${testsDirectory}${filename}`, "utf8"))
  .join("\n");

const named = new Set(
  [...testSource.matchAll(/\bCA-(\d{2}) (?:(?:published-)?species|tulanpedia)-[a-z-]+/g)].map((match) =>
    Number(match[1]),
  ),
);
const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, index) => from + index);
const label = (number: number) => `CA-${String(number).padStart(2, "0")}`;

it("CA-46 species-publication-coverage: cada CA-01 a CA-17 y CA-49 a CA-65 de la spec aparece en al menos un test de species-*.test.tsx; y que ningún test nombra CA-18 a CA-38 (retirados)", () => {
  expect(sectionTests.length).toBeGreaterThan(5);

  // CA-01 a CA-17 y CA-49 a CA-65 de dashboard-010 (incluida la enmienda 2026-11-13).
  const required = [...range(1, 17), ...range(49, 65)];

  expect(required).toHaveLength(34);

  for (const number of required) {
    expect(named.has(number), `${label(number)} sin prueba nombrada`).toBe(true);
  }

  for (const number of range(18, 38)) {
    expect(named.has(number), `${label(number)} está retirado`).toBe(false);
  }
});

it("CA-46 species-publication-coverage: cada CA-63 a CA-65 aparece en un test nombrado; ningún test presenta «Solicitudes de especies» ni «Especies publicadas» como entradas de menú", () => {
  for (const number of [63, 64, 65]) {
    expect(named.has(number), `${label(number)} sin prueba nombrada`).toBe(true);
  }

  // Ninguna prueba espera esas etiquetas en la navegación (solo «not.toContain»).
  for (const filename of readdirSync(testsDirectory).filter((name) => name.endsWith(".test.tsx") && name !== ownFile)) {
    const text = readFileSync(`${testsDirectory}${filename}`, "utf8");

    expect(text, filename).not.toMatch(/expect\([^)]*\)\.(?:toContain|toEqual)\([^)]*"(?:Solicitudes de especies|Especies publicadas)"/);
  }
});
