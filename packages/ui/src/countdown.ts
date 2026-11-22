/**
 * Cuenta regresiva de bloqueo por intentos (dashboard-015 CA-21 a CA-24; pwa-003 CA-04 a CA-07; movida a @arca/ui en dashboard-020 rev. (d)).
 * Lógica pura y sin React: el hook `useCountdown` solo la conecta al estado.
 */

/** `m:ss` (600 → «10:00», 587 → «9:47», 42 → «0:42»). Negativos y NaN valen 0. */
export function formatCountdown(seconds: number): string {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.ceil(seconds)) : 0;
  const minutes = Math.floor(total / 60);
  const rest = total % 60;

  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export const rateLimitedPrefix = "Demasiados intentos. Podrás intentarlo de nuevo en";
export const rateLimitEndedText = "Ya puedes intentarlo de nuevo.";

/** Aviso completo; con 0 segundos cambia al de fin. */
export function rateLimitText(remaining: number): string {
  return remaining > 0
    ? `${rateLimitedPrefix} ${formatCountdown(remaining)}`
    : rateLimitEndedText;
}

/** Segundos válidos de un `Retry-After`; cualquier otro valor es `null` (sin contador). */
export function validRetryAfter(seconds: unknown): number | null {
  return typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0
    ? Math.ceil(seconds)
    : null;
}

export type CountdownClock = {
  now: () => number;
  setInterval: (callback: () => void, ms: number) => unknown;
  clearInterval: (handle: unknown) => void;
};

const browserClock: CountdownClock = {
  now: () => Date.now(),
  setInterval: (callback, ms) => globalThis.setInterval(callback, ms),
  clearInterval: (handle) => globalThis.clearInterval(handle as ReturnType<typeof setInterval>),
};

/**
 * Inicia la cuenta contra un instante final (`now + s*1000`), así una pestaña
 * dormida no se desfasa. Llama a `onTick` con los segundos restantes cada
 * segundo y al llegar a 0 se detiene sola. Devuelve la función que la detiene.
 */
export function startCountdown(
  seconds: number,
  onTick: (remaining: number) => void,
  clock: CountdownClock = browserClock,
): () => void {
  const endsAt = clock.now() + seconds * 1000;
  let handle: unknown = null;
  let stopped = false;

  const stop = () => {
    stopped = true;
    if (handle !== null) clock.clearInterval(handle);
    handle = null;
  };

  const tick = () => {
    if (stopped) return;

    const remaining = Math.max(0, Math.ceil((endsAt - clock.now()) / 1000));

    onTick(remaining);
    if (remaining <= 0) stop();
  };

  handle = clock.setInterval(tick, 1000);

  return stop;
}
