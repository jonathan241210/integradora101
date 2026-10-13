import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(
  fileURLToPath(new URL('../styles.css', import.meta.url)),
  'utf8',
);

describe('CA-04 PWA responsive demo screens', () => {
  it('define layouts de escritorio, tablet y móvil sin forzar ancho de página', () => {
    expect(styles).toMatch(/@media \(max-width: 1040px\)/);
    expect(styles).toMatch(/@media \(max-width: 760px\)/);
    expect(styles).toMatch(/@media \(max-width: 520px\)/);
    expect(styles).toMatch(/\.app-shell\s*\{[^}]*grid-template-columns:\s*248px/s);
    expect(styles).toMatch(
      /@media \(max-width: 760px\)[\s\S]*?\.mobile-navigation\s*\{[^}]*position:\s*fixed/s,
    );
    expect(styles).toMatch(
      /\.navigation-mobile\s*\{[^}]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/s,
    );
    expect(styles).toMatch(
      /@media \(max-width: 760px\)[\s\S]*?\.form-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s,
    );
    expect(styles).not.toMatch(
      /(?:^|})\s*(?:html|body|#root)\s*\{[^}]*overflow-x:\s*(?:hidden|clip)/s,
    );
  });

  it('permite que tarjetas, formularios y textos largos reduzcan su ancho', () => {
    expect(styles).toMatch(/\.app-shell\s*\{[^}]*minmax\(0,\s*1fr\)/s);
    expect(styles).toMatch(/\.view-content\s*\{[^}]*width:\s*min\(100%/s);
    expect(styles).toMatch(/\.form-grid\s*\{[^}]*minmax\(0,\s*1fr\)/s);
    expect(styles).toMatch(/\.demo-credentials\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  });
});
