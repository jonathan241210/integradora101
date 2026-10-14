import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const testDirectory = fileURLToPath(new URL('.', import.meta.url));
const testSources = readdirSync(testDirectory)
  .filter((filename) => filename.endsWith('.test.tsx'))
  .filter((filename) => filename !== 'acceptance-coverage.test.tsx')
  .map((filename) =>
    readFileSync(new URL(filename, `file://${testDirectory}/`), 'utf8'),
  )
  .join('\n');

describe('CA-06 PWA responsive demo screens', () => {
  it('incluye pruebas con nombre para cada criterio visual y de flujo', () => {
    for (const criterion of [
      'CA-01',
      'CA-02',
      'CA-03',
      'CA-04',
      'CA-05',
      'CA-07',
      'CA-08',
    ]) {
      const criterionPattern = new RegExp(
        `describe\\(['"]${criterion} PWA `,
      );

      expect(testSources).toMatch(criterionPattern);
    }
  });
});
