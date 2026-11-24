import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  formatCountdown,
  LockoutNotice,
  rateLimitEndedText,
  rateLimitText,
  startCountdown,
  type CountdownClock,
} from '@arca/ui';
import { signInStaff } from '@/viewmodels/useStaffSession';
import { LoginView } from '@/views/LoginView';

const credentials = ['veterinario@arca.local', 'x'] as const;
const rateLimited = (retryAfterSeconds?: number) =>
  Object.assign(new Error('Too many attempts. Retry in 587 seconds.'), { status: 429, retryAfterSeconds });
const api = (error: unknown) => ({
  login: vi.fn().mockRejectedValue(error),
  me: vi.fn(),
  logout: vi.fn(),
});

function fakeClock() {
  let time = 0;
  let callback: (() => void) | null = null;
  const clock: CountdownClock = {
    now: () => time,
    setInterval: (cb) => { callback = cb; return 1; },
    clearInterval: () => { callback = null; },
  };
  return { clock, advance: (ms: number) => { time += ms; callback?.(); }, active: () => callback !== null };
}

describe('pwa-003 contador de bloqueo', () => {
  it('CA-04 arma «Demasiados intentos… 9:47» con 429 y retryAfterSeconds', async () => {
    expect(formatCountdown(600)).toBe('10:00');
    expect(formatCountdown(587)).toBe('9:47');
    expect(formatCountdown(42)).toBe('0:42');
    const result = await signInStaff(api(rateLimited(587)), ...credentials);
    expect(result).toMatchObject({ session: 'anonymous', retryAfterSeconds: 587 });
    const markup = renderToStaticMarkup(<LoginView error={result.error} retryAfterSeconds={result.retryAfterSeconds} onLogin={() => undefined} />);
    expect(markup).toContain('Demasiados intentos. Podrás intentarlo de nuevo en');
    expect(markup).toContain('9:47');
    expect(markup).not.toContain('587 seconds');
  });

  it('CA-05 baja cada segundo contra un instante final y se limpia', () => {
    const { clock, advance, active } = fakeClock();
    const ticks: number[] = [];
    const stop = startCountdown(3, (r) => ticks.push(r), clock);
    advance(1000);
    advance(5000); // pestaña dormida: no se desfasa
    expect(ticks).toEqual([2, 0]);
    expect(active()).toBe(false);
    stop();
  });

  it('CA-06 deshabilita «Iniciar sesión» mientras corre y muestra el fin al llegar a 0', () => {
    const locked = renderToStaticMarkup(<LoginView error="x" retryAfterSeconds={587} onLogin={() => undefined} />);
    expect(locked).toMatch(/<button[^>]*disabled/);
    expect(rateLimitText(0)).toBe(rateLimitEndedText);
    expect(rateLimitEndedText).toBe('Ya puedes intentarlo de nuevo.');
    const ended = renderToStaticMarkup(
      <LockoutNotice countdown={{ remaining: 0, running: false, finished: true }} initialSeconds={587} />,
    );
    expect(ended).toContain('Ya puedes intentarlo de nuevo.');
  });

  it('CA-07 sin retryAfterSeconds muestra el mensaje de la API sin contador', async () => {
    const result = await signInStaff(api(rateLimited(undefined)), ...credentials);
    expect(result.retryAfterSeconds ?? null).toBeNull();
    const markup = renderToStaticMarkup(<LoginView error={result.error} onLogin={() => undefined} />);
    expect(markup).toContain('Too many attempts');
    expect(markup).not.toContain('lockout-countdown');
    expect(markup).not.toMatch(/<button[^>]*disabled/);
  });

  it('CA-08 anuncia solo inicio y fin; los dígitos van en aria-live="off"', () => {
    const running = renderToStaticMarkup(
      <LockoutNotice countdown={{ remaining: 500, running: true, finished: false }} initialSeconds={587} />,
    );
    expect(running).toContain('role="status"');
    expect(running).toContain('aria-live="off"');
    expect(running).toContain('Podrás intentarlo de nuevo en 9:47</div>');
    expect(running).toContain('>8:20<');
  });
});
