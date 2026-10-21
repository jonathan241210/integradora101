declare const __dirname: string;

const fs = jest.requireActual<{
  readdirSync: (directory: string) => string[];
  readFileSync: (file: string, encoding: string) => string;
}>('fs');
const path = jest.requireActual<{ join: (...parts: string[]) => string }>('path');

describe('Configuración Android', () => {
  it('test-ca-13-android-cleartext-config: usesCleartextTraffic queda en false', () => {
    const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'app.json'), 'utf8')) as {
      expo: { android: { usesCleartextTraffic: boolean } };
    };
    expect(appJson.expo.android.usesCleartextTraffic).toBe(false);
  });

  it('test-ca-14: la suite de auth nombra los criterios de la cuenta', () => {
    const authDir = path.join(__dirname);
    const files = fs.readdirSync(authDir)
      .filter((name) => name.endsWith('.ts') || name.endsWith('.tsx'))
      .map((name) => path.join(authDir, name));
    files.push(path.join(__dirname, '..', 'architecture.test.ts'));
    const source = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n').toLowerCase();
    for (let index = 1; index <= 14; index += 1) {
      expect(source).toContain(`ca-${String(index).padStart(2, '0')}`);
    }
  });
});
