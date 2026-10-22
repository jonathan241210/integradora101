import { useCallback, useEffect, useReducer, useRef } from "react";
import type { TwoFactorChallenge } from "@arca/api-client";
import { authApi, setUnauthorizedHandler } from "@/services/arca-api";
import {
  acknowledgeRecoveryCodes,
  authSessionReducer,
  checkSession,
  cancelTwoFactorSession,
  confirmTwoFactorSetup,
  initialAuthSessionState,
  signOut,
  retryTwoFactorSetup as retrySetup,
  submitLogin,
  submitTwoFactor,
  type PwaRedirect,
} from "./auth-session";

export function useAuthSession(redirect: PwaRedirect) {
  const [state, dispatch] = useReducer(
    authSessionReducer,
    initialAuthSessionState,
  );
  const stateRef = useRef(state);
  const started = useRef(false);
  stateRef.current = state;

  useEffect(() => {
    const unregister = setUnauthorizedHandler(() => {
      const current = stateRef.current;
      const hadSession = current.profile !== null;

      dispatch({ type: "unauthorized", sessionExpired: hadSession });
    });

    if (!started.current) {
      started.current = true;
      void checkSession(authApi, dispatch, redirect);
    }

    return unregister;
  }, [redirect]);

  const login = useCallback(
    (email: string, password: string) =>
      submitLogin(authApi, dispatch, redirect, email, password),
    [redirect],
  );
  const challenge = useCallback(
    (input: TwoFactorChallenge) =>
      submitTwoFactor(authApi, dispatch, redirect, input),
    [redirect],
  );
  const confirmSetup = useCallback(
    (code: string) => confirmTwoFactorSetup(authApi, dispatch, code),
    [],
  );
  const retryTwoFactorSetup = useCallback(
    () => retrySetup(authApi, dispatch, state.profile),
    [state.profile],
  );
  const cancelTwoFactor = useCallback(
    () => cancelTwoFactorSession(dispatch),
    [],
  );
  const acknowledgeCodes = useCallback(
    () => acknowledgeRecoveryCodes(authApi, dispatch, redirect),
    [redirect],
  );
  const logout = useCallback(() => signOut(authApi, dispatch), []);

  return {
    state,
    login,
    challenge,
    confirmSetup,
    retryTwoFactorSetup,
    cancelTwoFactor,
    acknowledgeCodes,
    logout,
  };
}
