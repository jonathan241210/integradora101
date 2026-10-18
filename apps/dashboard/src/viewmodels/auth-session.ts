import type { ApiError, AuthApi, LoginResult, StaffProfile, TwoFactorChallenge } from "@arca/api-client";

export type AuthSessionStatus =
  | "checking"
  | "anonymous"
  | "two-factor-challenge"
  | "two-factor-setup"
  | "authenticated"
  | "redirecting-pwa";

export type AuthSessionState = {
  status: AuthSessionStatus;
  profile: StaffProfile | null;
  error: string;
  sessionExpired: boolean;
  submitting: boolean;
  qrSvg: string | null;
  recoveryCodes: string[];
};

export type AuthSessionAction =
  | { type: "session-checking" }
  | { type: "session-anonymous" }
  | { type: "login-submitted" }
  | { type: "two-factor-required" }
  | { type: "two-factor-setup-required"; profile: StaffProfile }
  | { type: "setup-loaded"; qrSvg: string }
  | { type: "setup-confirmed"; recoveryCodes: string[] }
  | { type: "recovery-codes-acknowledged" }
  | { type: "account-without-role" }
  | { type: "authenticated"; profile: StaffProfile }
  | { type: "redirecting-pwa"; profile: StaffProfile }
  | { type: "request-failed"; message: string }
  | { type: "unauthorized"; sessionExpired: boolean }
  | { type: "signed-out" };

export type AuthSessionDispatch = (action: AuthSessionAction) => void;
export type PwaRedirect = (url: string) => void;

export const initialAuthSessionState: AuthSessionState = {
  status: "checking",
  profile: null,
  error: "",
  sessionExpired: false,
  submitting: false,
  qrSvg: null,
  recoveryCodes: [],
};

const accountWithoutRole =
  "Tu cuenta no tiene un rol asignado. Contacta al administrador.";
const expiredSession = "Tu sesión expiró. Vuelve a iniciar sesión.";

export function authSessionReducer(
  state: AuthSessionState,
  action: AuthSessionAction,
): AuthSessionState {
  switch (action.type) {
    case "session-checking":
      return { ...initialAuthSessionState, status: "checking" };
    case "session-anonymous":
      return { ...initialAuthSessionState, status: "anonymous" };
    case "login-submitted":
      return { ...state, submitting: true, error: "", sessionExpired: false };
    case "two-factor-required":
      return {
        ...state,
        status: "two-factor-challenge",
        profile: null,
        submitting: false,
        error: "",
        sessionExpired: false,
      };
    case "two-factor-setup-required":
      return {
        ...state,
        status: "two-factor-setup",
        profile: action.profile,
        submitting: true,
        error: "",
        qrSvg: null,
        recoveryCodes: [],
        sessionExpired: false,
      };
    case "setup-loaded":
      return {
        ...state,
        status: "two-factor-setup",
        qrSvg: action.qrSvg,
        submitting: false,
        error: "",
      };
    case "setup-confirmed":
      return {
        ...state,
        status: "two-factor-setup",
        recoveryCodes: action.recoveryCodes,
        submitting: false,
        error: "",
      };
    case "recovery-codes-acknowledged":
      return { ...state, recoveryCodes: [], submitting: true, error: "" };
    case "account-without-role":
      return {
        ...initialAuthSessionState,
        status: "anonymous",
        error: accountWithoutRole,
      };
    case "authenticated":
      return {
        ...state,
        status: "authenticated",
        profile: action.profile,
        error: "",
        sessionExpired: false,
        submitting: false,
        recoveryCodes: [],
      };
    case "redirecting-pwa":
      return {
        ...state,
        status: "redirecting-pwa",
        profile: action.profile,
        error: "",
        sessionExpired: false,
        submitting: false,
      };
    case "request-failed":
      return {
        ...state,
        status: state.status === "checking" ? "anonymous" : state.status,
        submitting: false,
        error: action.message,
      };
    case "unauthorized":
      return {
        ...initialAuthSessionState,
        status: "anonymous",
        sessionExpired: action.sessionExpired,
        error: action.sessionExpired ? expiredSession : "",
      };
    case "signed-out":
      return { ...initialAuthSessionState, status: "anonymous" };
  }
}

function apiMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;

  return "No fue posible completar la solicitud. Intenta de nuevo.";
}

function isUnauthorized(error: unknown): error is ApiError {
  return typeof error === "object" && error !== null && "status" in error &&
    (error as ApiError).status === 401;
}

function isSetupRequired(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error &&
    (error as ApiError).code === "two_factor_setup_required";
}

async function handleRequestError(
  error: unknown,
  authApi: AuthApi,
  dispatch: AuthSessionDispatch,
  redirect: PwaRedirect,
): Promise<void> {
  if (isUnauthorized(error)) {
    dispatch({ type: "unauthorized", sessionExpired: true });
    return;
  }

  if (isSetupRequired(error)) {
    try {
      const profile = await authApi.me();

      if (profile.two_factor_setup_required) {
        dispatch({ type: "two-factor-setup-required", profile });
        await startTwoFactorSetup(authApi, dispatch);
        return;
      }
    } catch (profileError) {
      if (isUnauthorized(profileError)) {
        dispatch({ type: "unauthorized", sessionExpired: true });
        return;
      }
    }
  }

  dispatch({ type: "request-failed", message: apiMessage(error) });
}

export async function startTwoFactorSetup(
  authApi: AuthApi,
  dispatch: AuthSessionDispatch,
): Promise<void> {
  try {
    await authApi.enableTwoFactor();
    const qr = await authApi.twoFactorQrCode();
    dispatch({ type: "setup-loaded", qrSvg: qr.svg });
  } catch (error) {
    dispatch({
      type: isUnauthorized(error) ? "unauthorized" : "request-failed",
      ...(isUnauthorized(error)
        ? { sessionExpired: true }
        : { message: apiMessage(error) }),
    } as AuthSessionAction);
  }
}

export async function retryTwoFactorSetup(
  authApi: AuthApi,
  dispatch: AuthSessionDispatch,
  profile: StaffProfile | null,
): Promise<void> {
  if (!profile) return;

  dispatch({ type: "two-factor-setup-required", profile });
  await startTwoFactorSetup(authApi, dispatch);
}

export function cancelTwoFactorSession(dispatch: AuthSessionDispatch): void {
  dispatch({ type: "signed-out" });
}

export async function resolveStaffProfile(
  profile: StaffProfile,
  authApi: AuthApi,
  dispatch: AuthSessionDispatch,
  redirect: PwaRedirect,
): Promise<void> {
  if (profile.home === "pwa") {
    dispatch({ type: "redirecting-pwa", profile });
    if (profile.pwa_url?.trim()) redirect(profile.pwa_url);
    return;
  }

  if (!profile.home) {
    dispatch({ type: "account-without-role" });
    return;
  }

  if (profile.two_factor_setup_required) {
    dispatch({ type: "two-factor-setup-required", profile });
    await startTwoFactorSetup(authApi, dispatch);
    return;
  }

  dispatch({ type: "authenticated", profile });
}

export async function checkSession(
  authApi: AuthApi,
  dispatch: AuthSessionDispatch,
  redirect: PwaRedirect,
): Promise<void> {
  dispatch({ type: "session-checking" });

  try {
    await resolveStaffProfile(await authApi.me(), authApi, dispatch, redirect);
  } catch (error) {
    if (isUnauthorized(error)) dispatch({ type: "session-anonymous" });
    else await handleRequestError(error, authApi, dispatch, redirect);
  }
}

export async function submitLogin(
  authApi: AuthApi,
  dispatch: AuthSessionDispatch,
  redirect: PwaRedirect,
  email: string,
  password: string,
): Promise<void> {
  dispatch({ type: "login-submitted" });

  try {
    const result: LoginResult = await authApi.login({ email, password });

    if (result.twoFactor) {
      dispatch({ type: "two-factor-required" });
      return;
    }

    await resolveStaffProfile(await authApi.me(), authApi, dispatch, redirect);
  } catch (error) {
    await handleRequestError(error, authApi, dispatch, redirect);
  }
}

export async function submitTwoFactor(
  authApi: AuthApi,
  dispatch: AuthSessionDispatch,
  redirect: PwaRedirect,
  challenge: TwoFactorChallenge,
): Promise<void> {
  dispatch({ type: "login-submitted" });

  try {
    await authApi.twoFactorChallenge(challenge);
    await resolveStaffProfile(await authApi.me(), authApi, dispatch, redirect);
  } catch (error) {
    await handleRequestError(error, authApi, dispatch, redirect);
  }
}

export async function confirmTwoFactorSetup(
  authApi: AuthApi,
  dispatch: AuthSessionDispatch,
  code: string,
): Promise<void> {
  dispatch({ type: "login-submitted" });

  try {
    await authApi.confirmTwoFactor(code);
    const recoveryCodes = await authApi.recoveryCodes();
    dispatch({ type: "setup-confirmed", recoveryCodes });
  } catch (error) {
    await handleRequestError(error, authApi, dispatch, () => undefined);
  }
}

export async function acknowledgeRecoveryCodes(
  authApi: AuthApi,
  dispatch: AuthSessionDispatch,
  redirect: PwaRedirect,
): Promise<void> {
  dispatch({ type: "recovery-codes-acknowledged" });

  try {
    await resolveStaffProfile(await authApi.me(), authApi, dispatch, redirect);
  } catch (error) {
    await handleRequestError(error, authApi, dispatch, () => undefined);
  }
}

export async function signOut(
  authApi: AuthApi,
  dispatch: AuthSessionDispatch,
): Promise<void> {
  dispatch({ type: "login-submitted" });

  try {
    await authApi.logout();
    dispatch({ type: "signed-out" });
  } catch (error) {
    if (isUnauthorized(error)) {
      dispatch({ type: "unauthorized", sessionExpired: true });
    } else {
      dispatch({ type: "request-failed", message: apiMessage(error) });
    }
  }
}
