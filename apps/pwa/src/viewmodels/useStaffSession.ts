import { createAuthApi, createHttpClient, type AuthApi } from '@arca/api-client';
import { useEffect, useState } from 'react';

type SessionApi = Pick<AuthApi, 'login' | 'me' | 'logout'>;
type SessionResult = { session: 'anonymous' | 'authenticated'; error: string };

const api = createAuthApi(createHttpClient({ baseUrl: '' }));
const anonymous: SessionResult = { session: 'anonymous', error: '' };
const denied = 'Esta cuenta no tiene acceso al módulo veterinario.';

function hasStatus(error: unknown, status: number) {
  return typeof error === 'object' && error !== null && 'status' in error && error.status === status;
}

function requestError(error: unknown) {
  if (error instanceof TypeError) return 'No se pudo conectar con el servidor. Inténtalo de nuevo.';
  if (error instanceof Error) return error.message;
  return 'No se pudo completar la solicitud. Inténtalo de nuevo.';
}

export async function restoreStaffSession(auth: SessionApi): Promise<SessionResult> {
  try {
    return (await auth.me()).home === 'pwa'
      ? { session: 'authenticated', error: '' }
      : { ...anonymous, error: denied };
  } catch (error) {
    return hasStatus(error, 401) ? anonymous : { ...anonymous, error: requestError(error) };
  }
}

export async function signInStaff(auth: SessionApi, email: string, password: string): Promise<SessionResult> {
  try {
    const result = await auth.login({ email: email.trim(), password });
    if (result.twoFactor) return { ...anonymous, error: denied };

    const profile = await auth.me();
    if (profile.home !== 'pwa') {
      await auth.logout();
      return { ...anonymous, error: denied };
    }

    return { session: 'authenticated', error: '' };
  } catch (error) {
    if (hasStatus(error, 422)) return { ...anonymous, error: 'Correo o contraseña incorrectos.' };
    return {
      ...anonymous,
      error: hasStatus(error, 401) ? 'Tu sesión expiró. Vuelve a iniciar sesión.' : requestError(error),
    };
  }
}

export async function signOutStaff(auth: SessionApi): Promise<SessionResult> {
  try {
    await auth.logout();
    return anonymous;
  } catch (error) {
    if (hasStatus(error, 401)) return anonymous;
    return { session: 'authenticated', error: 'No se pudo confirmar el cierre de sesión. Inténtalo de nuevo.' };
  }
}

export function useStaffSession() {
  const [state, setState] = useState<SessionResult | { session: 'restoring'; error: '' }>({
    session: 'restoring',
    error: '',
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    try {
      sessionStorage.removeItem('zoohealth.token');
    } catch {
      // El navegador puede bloquear el almacenamiento.
    }
    void restoreStaffSession(api).then((result) => {
      if (active) setState(result);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (state.session !== 'authenticated' || busy) return;

    let active = true;
    function revalidate() {
      void api.me().then((profile) => {
        if (active && profile.home !== 'pwa') setState({ ...anonymous, error: denied });
      }).catch((error: unknown) => {
        if (active && hasStatus(error, 401)) {
          setState({ ...anonymous, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' });
        }
      });
    }

    window.addEventListener('focus', revalidate);
    return () => {
      active = false;
      window.removeEventListener('focus', revalidate);
    };
  }, [state.session, busy]);

  async function login(email: string, password: string) {
    setBusy(true);
    setState(anonymous);
    setState(await signInStaff(api, email, password));
    setBusy(false);
  }

  async function logout() {
    setBusy(true);
    const result = await signOutStaff(api);
    setState(result);
    setBusy(false);
  }

  return { ...state, busy, login, logout };
}
