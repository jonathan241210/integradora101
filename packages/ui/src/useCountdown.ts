import { useEffect, useState } from "react";
import { startCountdown, validRetryAfter } from "./countdown";

export type CountdownState = {
  /** Segundos que faltan; `null` si no hay cuenta (sin `retryAfterSeconds`). */
  remaining: number | null;
  /** Hay cuenta en curso: el botón debe seguir deshabilitado. */
  running: boolean;
  /** La cuenta llegó a 0 y el aviso pasa al de fin. */
  finished: boolean;
};

/**
 * ViewModel de la cuenta regresiva (CA-21 a CA-23). Cambiar `seconds`
 * (por ejemplo de `null` a 587) la reinicia; el intervalo se limpia al
 * desmontar o al cambiar.
 */
export function useCountdown(seconds: number | null | undefined): CountdownState {
  const valid = validRetryAfter(seconds);
  const [state, setState] = useState<{ source: number | null; remaining: number | null }>({
    source: valid,
    remaining: valid,
  });

  // Sin esperar al efecto: evita un cuadro con el botón habilitado.
  if (state.source !== valid) setState({ source: valid, remaining: valid });

  useEffect(() => {
    if (valid === null) return;

    return startCountdown(valid, (remaining) => setState({ source: valid, remaining }));
  }, [valid]);

  const remaining = state.source === valid ? state.remaining : valid;

  return {
    remaining,
    running: remaining !== null && remaining > 0,
    finished: remaining === 0,
  };
}
