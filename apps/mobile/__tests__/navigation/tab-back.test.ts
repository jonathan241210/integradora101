import { goBackWithinTabs, isVisitorTabRoot, notePathname, resetTabHistoryForTests } from '../../src/navigation/tabBack';

declare const __dirname: string;

const fs = jest.requireActual<{
  readFileSync: (file: string, encoding: string) => string;
}>('fs');
const path = jest.requireActual<{ join: (...parts: string[]) => string }>('path');

describe('retroceso de pestañas', () => {
  afterEach(() => {
    resetTabHistoryForTests();
  });

  it('test-ca-02-tabs-back: la raíz no deshace pestañas y una ruta secundaria vuelve a quien la abrió', () => {
    const navigate = jest.fn();
    const back = jest.fn();
    const router = { navigate, back };

    notePathname('/profile');
    notePathname('/collection');
    notePathname('/map');
    goBackWithinTabs(router);
    expect(navigate).not.toHaveBeenCalled();
    expect(back).toHaveBeenCalledTimes(1);

    back.mockClear();
    notePathname('/profile');
    notePathname('/settings');
    notePathname('/account-settings');
    goBackWithinTabs(router);
    expect(navigate).toHaveBeenCalledWith('/settings');
    goBackWithinTabs(router);
    expect(navigate).toHaveBeenCalledWith('/profile');
    expect(back).not.toHaveBeenCalled();
    expect(isVisitorTabRoot('/profile')).toBe(true);
    expect(isVisitorTabRoot('/settings')).toBe(false);
  });

  it('test-ca-02-tabs-back-layout: el navegador de pestañas no acumula historial', () => {
    const layout = fs.readFileSync(
      path.join(__dirname, '..', '..', 'src', 'app', '(tabs)', '_layout.tsx'),
      'utf8',
    );
    expect(layout).toContain('backBehavior="none"');
    expect(layout).not.toContain('backBehavior="history"');
  });
});
