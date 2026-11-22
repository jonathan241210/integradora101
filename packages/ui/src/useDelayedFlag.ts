import { useEffect, useState } from "react";
import { SKELETON_DELAY_MS, startDelayedFlag } from "./delayedFlag";

/**
 * Devuelve `true` cuando `active` lleva `delayMs` seguidos en `true`; vuelve a `false` en cuanto
 * `active` es `false`. Sirve para no mostrar un esqueleto si la carga termina enseguida
 * (sin parpadeo). Con `delayMs <= 0` sigue a `active` sin esperar.
 */
export function useDelayedFlag(active: boolean, delayMs: number = SKELETON_DELAY_MS): boolean {
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    if (!active || delayMs <= 0) {
      setElapsed(false);

      return;
    }

    setElapsed(false);

    return startDelayedFlag(delayMs, () => setElapsed(true));
  }, [active, delayMs]);

  if (delayMs <= 0) return active;

  return active && elapsed;
}
