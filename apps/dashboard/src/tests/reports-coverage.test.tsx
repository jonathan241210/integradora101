import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const directory = fileURLToPath(new URL(".", import.meta.url));
// Incluye este archivo: su describe es el propio CA-32 y las etiquetas de los demás se arman en tiempo de ejecución.
const testSource = readdirSync(directory)
  .filter((name) => name.endsWith(".test.tsx"))
  .map((name) => readFileSync(new URL(name, `file://${directory}/`), "utf8"))
  .join("\n");

describe("CA-32 unified-reports-and-feedback", () => {
  it("cada CA-01 a CA-65 (el último de la spec) tiene al menos una prueba que lo nombra", () => {
    const missing: string[] = [];

    for (let number = 1; number <= 65; number += 1) {
      const tag = `CA-${String(number).padStart(2, "0")} unified-reports-and-feedback`;

      if (!testSource.includes(tag)) missing.push(tag);
    }

    expect(missing).toEqual([]);
  });
});
