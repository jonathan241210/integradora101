import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const stylesFile = fileURLToPath(new URL("../styles.css", import.meta.url));
const styles = readFileSync(stylesFile, "utf8");

describe("CA-06 admin-dashboard-prototype", () => {
  it("define menú adaptable, navegación accesible, foco y tabla desplazable", () => {
    expect(styles).toMatch(/@media \(max-width: 820px\)/);
    expect(styles).toMatch(/@media \(max-width: 560px\)/);
    expect(styles).toMatch(/\.sidebar--open/);
    expect(styles).toMatch(/:focus-visible/);
    expect(styles).toMatch(/\.table-scroll\s*\{[^}]*overflow-x:\s*auto/s);
    expect(styles).toMatch(/\.profile-choices\s*\{/);
    expect(styles).toMatch(/\.enclosure-grid\s*\{/);
    expect(styles).toMatch(/\.ticket-history-filters\s*\{/);
    expect(styles).toMatch(/@media \(max-width: 820px\)[\s\S]*?\.enclosure-grid/);
    expect(styles).toMatch(/@media \(max-width: 560px\)[\s\S]*?\.ticket-history-filters/);
    expect(styles).toMatch(/\.dashboard-content h1:focus-visible/);
    expect(styles).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(styles).not.toMatch(/(?:^|})\s*(?:html|body)\s*\{[^}]*overflow-x:\s*clip/s);
  });
});
