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

  describe("CA-06 collapsible-menu-event-pagination", () => {
    it("limita el menú contraído a escritorio y conserva las reglas móviles", () => {
      expect(styles).toMatch(/@media screen and \(min-width: 821px\)[\s\S]*dashboard-app--menu-collapsed/);
      expect(styles).toMatch(/@media \(max-width: 820px\)[\s\S]*\.sidebar--open/);
      expect(styles).toMatch(/\.desktop-menu-toggle\s*\{[^}]*display:\s*none/s);
    });

    it("muestra la barra compacta solo cuando no tiene cursor ni foco", () => {
      expect(styles).toMatch(/\.sidebar:not\(:hover\):not\(:focus-within\)\s*\{[^}]*width:\s*76px/s);
      expect(styles).toMatch(/\.sidebar:not\(:hover\):not\(:focus-within\) \.sidebar-link span/);
      expect(styles).toMatch(/\.dashboard-app--menu-collapsed \.dashboard-main\s*\{[^}]*margin-left:\s*76px/s);
    });

    describe("CA-09 collapsible-menu-event-pagination", () => {
      it("anima el ancho y la visibilidad de las etiquetas en escritorio", () => {
        expect(styles).toMatch(/\.dashboard-app \.sidebar\s*\{[^}]*transition:\s*width 520ms/s);
        expect(styles).toMatch(/@media \(max-width: 820px\)[\s\S]*?\.sidebar\s*\{[^}]*transition:\s*transform 520ms ease-in-out,\s*visibility 520ms/s);
        expect(styles).toMatch(/\.dashboard-app \.sidebar\s*\{[^}]*border-radius:\s*0 20px 20px 0/s);
        expect(styles).toMatch(/\.sidebar:not\(:hover\):not\(:focus-within\) \.sidebar-link span[\s\S]*?max-width:\s*0;[\s\S]*?opacity:\s*0;[\s\S]*?visibility:\s*hidden/);
        expect(styles).toMatch(/prefers-reduced-motion:\s*reduce[\s\S]*?transition-duration:\s*\.01ms\s*!important/);
      });

      it("anima solo la aparición del resultado de venta y respeta movimiento reducido", () => {
        expect(styles).toMatch(/@media screen\s*\{[\s\S]*?\.ticket-sale-result\s*\{[^}]*animation:\s*ticket-sale-success 420ms/s);
        expect(styles).toMatch(/@keyframes ticket-sale-success/);
        expect(styles).toMatch(/prefers-reduced-motion:\s*reduce[\s\S]*?animation-duration:\s*\.01ms\s*!important/);
      });
    });

    describe("CA-10 collapsible-menu-event-pagination", () => {
      it("anima el trazo de la palomita y respeta movimiento reducido", () => {
        expect(styles).toMatch(/\.ticket-sale-result__check-mark path\s*\{[^}]*animation:\s*ticket-sale-check 2300ms/s);
        expect(styles).toMatch(/\.ticket-sale-result__check\s*\{[^}]*animation:\s*ticket-sale-check-pop 650ms/s);
        expect(styles).toMatch(/@keyframes ticket-sale-check\s*\{[\s\S]*?stroke-dashoffset:\s*24;[\s\S]*?stroke-dashoffset:\s*0;/);
        expect(styles).toMatch(/prefers-reduced-motion:\s*reduce[\s\S]*?animation-duration:\s*\.01ms\s*!important/);
      });
    });

    describe("CA-11 collapsible-menu-event-pagination", () => {
      it("limita la celebración del boleto a tres segundos y respeta movimiento reducido", () => {
        for (const name of ["ticket-sale-ticket", "ticket-sale-ring", "ticket-sale-check"]) {
          const duration = styles.match(new RegExp(`animation:\\s*${name}\\s+(\\d+)ms`));
          expect(duration).not.toBeNull();
          expect(Number(duration?.[1])).toBeLessThanOrEqual(3000);
          expect(styles).toContain(`@keyframes ${name}`);
        }
        expect(styles).toMatch(/prefers-reduced-motion:\s*reduce[\s\S]*?animation-duration:\s*\.01ms\s*!important/);
      });
    });
  });
});
