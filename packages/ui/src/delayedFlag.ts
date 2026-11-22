/** Retraso por defecto antes de mostrar un esqueleto de carga (dashboard-020 CA-56). */
export const SKELETON_DELAY_MS = 150;

export type DelayScheduler = {
  setTimeout: (callback: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
};

const browserScheduler: DelayScheduler = {
  setTimeout: (callback, ms) => globalThis.setTimeout(callback, ms),
  clearTimeout: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/**
 * Avisa con `onElapsed` cuando pasan `delayMs` sin que se cancele. Devuelve la función que
 * cancela el aviso. Con `delayMs <= 0` avisa de inmediato. Lógica pura, sin React.
 */
export function startDelayedFlag(
  delayMs: number,
  onElapsed: () => void,
  scheduler: DelayScheduler = browserScheduler,
): () => void {
  if (delayMs <= 0) {
    onElapsed();

    return () => undefined;
  }

  let cancelled = false;
  const handle = scheduler.setTimeout(() => {
    if (!cancelled) onElapsed();
  }, delayMs);

  return () => {
    cancelled = true;
    scheduler.clearTimeout(handle);
  };
}
