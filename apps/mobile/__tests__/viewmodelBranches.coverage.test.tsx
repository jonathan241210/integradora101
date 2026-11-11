import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import { useCameraPermissionSetting } from '../src/viewmodels/useCameraPermissionSetting';
import { useVisitorProfile } from '../src/viewmodels/useVisitorProfile';
import { useVisitorProgress } from '../src/viewmodels/useVisitorProgress';
import { useQrScanViewModel } from '../src/viewmodels/useQrScanViewModel';
import { accountSession } from '../src/session/accountSession';
import { clearSharedProgress, publishSharedProgress } from '../src/repositories/sharedProgress';
import type { ProgressRepository, ProgressSnapshot } from '../src/repositories/progressRepository';
import type { VisitorProfile } from '../src/repositories/authRepository';
import type { ScanPresentation } from '../src/services/scanQueue';

jest.mock('expo-camera', () => ({ useCameraPermissions: jest.fn() }));
jest.mock('../src/session/accountSession', () => ({ accountSession: {
  peekProfile: jest.fn(), getProfile: jest.fn(), subscribe: jest.fn(), getStatus: jest.fn(),
} }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const session = jest.mocked(accountSession);
const profile: VisitorProfile = { email: 'ana@example.test', firstName: 'Ana', nickname: 'Anita', avatarCode: 'jaguar' };
const snapshot: ProgressSnapshot = {
  progress: { points: 10, level: 1, rank: 'Explorador', nextThreshold: 50, discoveredSpecies: 1, totalSpecies: 5 },
  collection: [], achievements: [], missions: [],
};
const listeners = new Set<() => void>();
const requestCamera = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  clearSharedProgress();
  listeners.clear();
  session.getStatus.mockReturnValue('authenticated');
  session.peekProfile.mockReturnValue(null);
  session.getProfile.mockResolvedValue(profile);
  session.subscribe.mockImplementation(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; });
  requestCamera.mockResolvedValue({ granted: true });
  (useCameraPermissions as jest.Mock).mockReturnValue([null, requestCamera]);
});
afterEach(() => { jest.restoreAllMocks(); });

describe('mobile-011 CA-05: permiso de cámara', () => {
  it.each([
    [false, { granted: true, canAskAgain: true }, true, false],
    [true, { granted: false, canAskAgain: false }, true, false],
    [true, { granted: false, canAskAgain: true }, false, true],
    [true, null, false, true],
  ])('respeta el estado del permiso al cambiar la preferencia (%s, %j)', async (enabled, permission, settings, request) => {
    (useCameraPermissions as jest.Mock).mockReturnValue([permission, requestCamera]);
    const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    const { result } = await renderHook(() => useCameraPermissionSetting());
    expect(result.current.ready).toBe(permission !== null);
    expect(result.current.granted).toBe(permission?.granted === true);
    await act(async () => { await result.current.onToggle(enabled); });
    expect(open).toHaveBeenCalledTimes(settings ? 1 : 0);
    expect(requestCamera).toHaveBeenCalledTimes(request ? 1 : 0);
  });
  it('abre ajustes cuando el sistema rechaza el permiso solicitado', async () => {
    requestCamera.mockResolvedValue({ granted: false });
    const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    const { result } = await renderHook(() => useCameraPermissionSetting());
    await act(async () => { await result.current.onToggle(true); });
    expect(open).toHaveBeenCalledTimes(1);
  });
});

describe('mobile-011 CA-05: perfil y desmontaje', () => {
  it('recupera el perfil cacheado tras un error y reacciona a cambios de sesión', async () => {
    const pending = deferred<VisitorProfile | null>();
    session.getProfile.mockReturnValue(pending.promise);
    const { result, unmount } = await renderHook(() => useVisitorProfile());
    expect(result.current.loading).toBe(true);
    session.peekProfile.mockReturnValue(profile);
    await act(async () => { pending.reject(new Error('offline')); });
    expect(result.current).toEqual({ profile, loading: false });
    const notify = [...listeners][0];
    session.peekProfile.mockReturnValue(null);
    await act(async () => { notify(); });
    expect(result.current.profile).toBeNull();
    await unmount();
    expect(listeners.size).toBe(0);
    await act(async () => { notify(); });
  });
  it.each(['resolve', 'reject'] as const)('ignora una carga tardía después del desmontaje: %s', async kind => {
    const pending = deferred<VisitorProfile | null>();
    session.getProfile.mockReturnValue(pending.promise);
    const { result, unmount } = await renderHook(() => useVisitorProfile());
    await unmount();
    await act(async () => {
      if (kind === 'resolve') pending.resolve(profile);
      else pending.reject(new Error('offline'));
    });
    expect(result.current.profile).toBeNull();
  });
});

describe('mobile-011 CA-05: progreso, fallos y cambios de cuenta', () => {
  function repository() {
    return { load: jest.fn().mockResolvedValue(snapshot), discover: jest.fn() } satisfies ProgressRepository;
  }
  it.each(['guest', 'bootstrapping'] as const)('no consulta progreso mientras la sesión está %s', async status => {
    session.getStatus.mockReturnValue(status);
    const repo = repository();
    const { result } = await renderHook(() => useVisitorProgress(repo));
    expect(repo.load).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(status === 'bootstrapping');
  });
  it('admite repositorio ausente y avisos sin snapshot', async () => {
    const { result } = await renderHook(() => useVisitorProgress(null));
    await act(async () => { clearSharedProgress(); await result.current.refresh(); });
    expect(result.current).toMatchObject({ snapshot: null, loading: false, error: null });
  });
  it('usa la caché sin recargar y conserva el snapshot si falla un refresh', async () => {
    const repo = repository();
    publishSharedProgress(repo, snapshot);
    const { result } = await renderHook(() => useVisitorProgress(repo));
    expect(repo.load).not.toHaveBeenCalled();
    repo.load.mockRejectedValueOnce('offline');
    await act(async () => { await result.current.refresh(); });
    expect(result.current.error).toBe('No se pudo cargar el progreso.');
    expect(result.current.snapshot).toBe(snapshot);
    await act(async () => { clearSharedProgress(); });
    expect(result.current.snapshot).toBe(snapshot);
  });
  it.each(['success', 'error'] as const)('descarta respuestas de otra generación de cuenta: %s', async outcome => {
    const pending = deferred<ProgressSnapshot>();
    const repo = repository();
    repo.load.mockReturnValueOnce(pending.promise);
    const { result } = await renderHook(() => useVisitorProgress(repo));
    await act(async () => {
      clearSharedProgress();
      if (outcome === 'success') pending.resolve(snapshot);
      else pending.reject(new Error('fallo de la cuenta anterior'));
    });
    expect(result.current.snapshot).toBeNull();
    expect(result.current.error).toBeNull();
  });
  it.each(['success', 'error'] as const)('ignora respuestas tras desmontar y cerrar sesión: %s', async outcome => {
    const pending = deferred<ProgressSnapshot>();
    const repo = repository();
    repo.load.mockReturnValueOnce(pending.promise);
    const { result, unmount } = await renderHook(() => useVisitorProgress(repo));
    await unmount();
    session.getStatus.mockReturnValue('guest');
    await act(async () => {
      if (outcome === 'success') pending.resolve(snapshot);
      else pending.reject(new Error('offline'));
    });
    expect(result.current).toMatchObject({ snapshot: null, error: null });
  });
  it('expone el mensaje de un fallo de carga', async () => {
    const repo = repository();
    repo.load.mockRejectedValueOnce(new Error('Sin conexión'));
    const { result } = await renderHook(() => useVisitorProgress(repo));
    await waitFor(() => expect(result.current.error).toBe('Sin conexión'));
    expect(result.current.loading).toBe(false);
  });
});

describe('mobile-011 CA-05: escáner ocupado y rebote de lecturas', () => {
  it('evita duplicados y envíos simultáneos; vuelve a permitir el mismo código después del intervalo', async () => {
    const pending = deferred<ScanPresentation>();
    const submit = jest.fn().mockReturnValueOnce(pending.promise).mockResolvedValue({ kind: 'invalid_code' });
    const present = jest.fn();
    const now = jest.spyOn(Date, 'now').mockReturnValue(1000);
    const { result } = await renderHook(() => useQrScanViewModel({} as never, { submit, present }));
    let flight!: Promise<void>;
    await act(async () => { flight = result.current.onManualSubmit('ARCA-UNO'); });
    expect(result.current.busy).toBe(true);
    await act(async () => {
      result.current.onBarcodeScanned({ data: 'ARCA-DOS' });
      await result.current.onManualSubmit('ARCA-DOS');
    });
    expect(submit).toHaveBeenCalledTimes(1);
    await act(async () => { pending.resolve({ kind: 'invalid_code', title: 'Inválido', message: 'No existe' }); await flight; });
    await act(async () => { result.current.onBarcodeScanned({ data: 'ARCA-UNO' }); });
    expect(submit).toHaveBeenCalledTimes(1);
    now.mockReturnValue(3001);
    await act(async () => { result.current.onBarcodeScanned({ data: 'ARCA-UNO' }); });
    expect(submit).toHaveBeenCalledTimes(2);
    await act(async () => { result.current.onBarcodeScanned({ data: 'ARCA-DOS' }); });
    expect(submit).toHaveBeenCalledTimes(3);
    expect(present).toHaveBeenCalledTimes(3);
  });
  it.each([null, { granted: false, canAskAgain: false }, { granted: false, canAskAgain: true }, { granted: true, canAskAgain: false }])('expone permisos reales y permite solicitarlos: %j', async permission => {
    (useCameraPermissions as jest.Mock).mockReturnValue([permission, requestCamera]);
    const { result } = await renderHook(() => useQrScanViewModel({} as never));
    expect(result.current.cameraGranted).toBe(permission?.granted === true);
    expect(result.current.cameraDenied).toBe(permission?.granted === false && permission.canAskAgain === false);
    await act(async () => { result.current.onRequestPermission(); });
    expect(requestCamera).toHaveBeenCalledTimes(1);
  });
});
