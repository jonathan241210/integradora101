import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const directory = fileURLToPath(new URL(".", import.meta.url));
const specPath = new URL("../../specs/017-fixed-roles-account-management.md", import.meta.url);
const testSource = readdirSync(directory)
  .filter((name) => name.endsWith(".test.tsx"))
  .map((name) => readFileSync(new URL(name, `file://${directory}/`), "utf8"))
  .join("\n");
const spec = readFileSync(specPath, "utf8");

/** CA de la spec, de CA-01 al último (se lee de la propia spec). */
const specCriteria = [...spec.matchAll(/^- \*\*CA-(\d+)/gm)].map((match) => Number(match[1]));
const last = Math.max(...specCriteria);
/**
 * Sustituidos que la spec marca (nota «Criterios sustituidos»): el banner de consola de
 * CA-10, CA-11 y CA-13 lo sustituyen CA-19 a CA-25.
 */
const substituted = [
  ...(spec.match(/Criterios sustituidos \(nota [\d-]+\): ([^(]*)\(/)?.[1] ?? "").matchAll(/CA-(\d+)/g),
].map((match) => Number(match[1]));

describe("CA-18 fixed-roles-account-management", () => {
  it("cada CA-01 a CA-17 (salvo los sustituidos que marca la spec) aparece nombrado en algún test", () => {
    const missing: string[] = [];

    for (let number = 1; number <= 17; number += 1) {
      if (substituted.includes(number)) continue;

      const tag = `CA-${String(number).padStart(2, "0")} fixed-roles-account-management`;

      if (!testSource.includes(tag)) missing.push(tag);
    }

    expect(missing).toEqual([]);
  });
});

describe("CA-26 fixed-roles-account-management", () => {
  it("la spec marca sus criterios sustituidos y cada CA-01 al último aparece en algún test", () => {
    expect(last).toBe(26);
    expect(substituted.sort((a, b) => a - b)).toEqual([10, 11, 13]);

    const missing: string[] = [];

    for (let number = 1; number <= last; number += 1) {
      if (substituted.includes(number)) continue;

      const tag = `CA-${String(number).padStart(2, "0")} fixed-roles-account-management`;

      if (!testSource.includes(tag)) missing.push(tag);
    }

    expect(missing).toEqual([]);
  });
});
