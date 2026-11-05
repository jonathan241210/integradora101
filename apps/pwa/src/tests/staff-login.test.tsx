import { describe, expect, it, vi } from 'vitest';
import type { StaffProfile } from '@arca/api-client';
import { restoreStaffSession, signInStaff, signOutStaff } from '@/viewmodels/useStaffSession';

const credentials = [' veterinario@arca.local ', 'contraseña de prueba'] as const;

function staffApi(home: StaffProfile['home'] = 'pwa') {
  return {
    login: vi.fn().mockResolvedValue({ twoFactor: false }),
    me: vi.fn().mockResolvedValue({ home }),
    logout: vi.fn().mockResolvedValue(undefined),
  };
}

describe('pwa-003', () => {
  it('CA-01 abre el módulo con un perfil veterinario al entrar y al recargar', async () => {
    const api = staffApi();
    expect(await signInStaff(api, ...credentials)).toMatchObject({ session: 'authenticated' });
    expect(api.login).toHaveBeenCalledWith({ email: credentials[0].trim(), password: credentials[1] });
    expect(await restoreStaffSession(api)).toMatchObject({ session: 'authenticated' });
  });

  it('CA-02 distingue errores de red y de credenciales y permite reintentar', async () => {
    const api = staffApi();
    api.login.mockRejectedValueOnce(Object.assign(new Error('These credentials do not match our records.'), { status: 422 }));
    api.login.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(await signInStaff(api, ...credentials)).toMatchObject({ session: 'anonymous', error: 'Correo o contraseña incorrectos.' });
    expect(await signInStaff(api, ...credentials)).toMatchObject({ session: 'anonymous', error: expect.stringContaining('conectar') });
    expect(await signInStaff(api, ...credentials)).toMatchObject({ session: 'authenticated' });
  });

  it('CA-03 rechaza otros destinos y retos de segundo factor', async () => {
    const api = staffApi('administration');
    expect(await restoreStaffSession(api)).toMatchObject({ session: 'anonymous' });
    expect(api.logout).not.toHaveBeenCalled();
    expect(await signInStaff(api, ...credentials)).toMatchObject({ session: 'anonymous' });
    expect(api.logout).toHaveBeenCalledOnce();
    api.login.mockResolvedValueOnce({ twoFactor: true });
    api.me.mockClear();
    expect(await signInStaff(api, ...credentials)).toMatchObject({ session: 'anonymous' });
    expect(api.me).not.toHaveBeenCalled();
  });

  it('CA-03 devuelve al formulario al expirar o cerrar y permite reintentar el cierre', async () => {
    const api = staffApi();
    api.me.mockRejectedValueOnce({ status: 401 });
    expect(await restoreStaffSession(api)).toMatchObject({ session: 'anonymous' });
    api.logout.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(await signOutStaff(api)).toMatchObject({ session: 'authenticated', error: expect.stringContaining('cierre') });
    expect(await signOutStaff(api)).toMatchObject({ session: 'anonymous', error: '' });
  });
});
