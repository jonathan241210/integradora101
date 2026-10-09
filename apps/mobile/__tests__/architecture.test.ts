declare const __dirname: string;

const fs = jest.requireActual<{
  readdirSync: (path: string, options: { withFileTypes: true }) => {
    name: string;
    isDirectory: () => boolean;
  }[];
  readFileSync: (path: string, encoding: string) => string;
}>('fs');
const path = jest.requireActual<{ join: (...parts: string[]) => string }>('path');

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(filePath);
    return /\.(ts|tsx)$/.test(entry.name) ? [filePath] : [];
  });
}

describe('Arquitectura móvil', () => {
  it('test-ca-01: Routes y Views no importan Repositories ni mocks', () => {
    const mobileSource = path.join(__dirname, '..', 'src');
    const restrictedDirectories = [path.join(mobileSource, 'app'), path.join(mobileSource, 'screens')];
    const forbiddenImport = /from\s+['"][^'"]*(?:repositories|mocks)(?:\/[^'"]*)?['"]/;
    const allSourceFiles = sourceFiles(mobileSource);

    for (const file of restrictedDirectories.flatMap(sourceFiles)) {
      expect(fs.readFileSync(file, 'utf8')).not.toMatch(forbiddenImport);
    }
    for (const file of allSourceFiles) {
      expect(fs.readFileSync(file, 'utf8')).not.toContain('arca-ui-reference');
    }
  });

  it('test-ca-07: componentes y vistas no fijan colores de marca fuera del adaptador', () => {
    const mobileSource = path.join(__dirname, '..', 'src');
    const styledDirectories = [path.join(mobileSource, 'components'), path.join(mobileSource, 'screens')];
    const hardcodedColor = /#[0-9a-fA-F]{3,8}\b|rgba?\(/;

    for (const file of styledDirectories.flatMap(sourceFiles)) {
      expect(fs.readFileSync(file, 'utf8')).not.toMatch(hardcodedColor);
    }
  });
});
