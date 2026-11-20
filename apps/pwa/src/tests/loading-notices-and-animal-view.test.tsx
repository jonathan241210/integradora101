// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearToasts, pushToast } from '@/offline/notifications';
import { AnimalsView } from '@/views/AnimalsView';
import { ProfilePhoto } from '@/views/AnimalProfileView';
import { LoginView } from '@/views/LoginView';
import { LoadingScreen } from '@/views/Spinner';
import { ToastCenter } from '@/views/ToastCenter';

const animals = vi.hoisted(() => Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  name: `Animal ${String(index + 1).padStart(2, '0')}`,
  species: 'Jaguar',
  tag_number: `Z-${index + 1}`,
  sex: 'I',
})));

vi.mock('@/viewmodels/useApiData', () => ({
  useAnimals: (search: string) => ({
    animals: animals.filter((animal) => animal.name.includes(search)),
    loading: false,
    error: '',
  }),
}));

describe('pwa-011 · carga, avisos y consulta de animales', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    container = document.body.appendChild(document.createElement('div'));
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    clearToasts();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function render(view: ReactNode) {
    act(() => root.render(view));
  }

  it('CA-01 anuncia la espera y ofrece una variante sin movimiento', () => {
    render(<><LoadingScreen /><LoginView busy error="" onLogin={() => undefined} /></>);
    const statuses = [...container.querySelectorAll('[role="status"]')];
    expect(statuses.map((status) => status.textContent)).toEqual(['Cargando…', 'Iniciando sesión…']);
    expect(statuses.every((status) => status.querySelector('.spinner-ring[aria-hidden="true"]'))).toBe(true);
    expect(container.querySelector('button[type="submit"]:disabled')).toBeTruthy();
    const styles = readFileSync('src/styles.css', 'utf8');
    expect(styles).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.spinner-ring\s*\{\s*animation: none/);
  });

  it('CA-02 anuncia las variantes y permite cerrar un aviso individual', () => {
    render(<ToastCenter />);
    const region = container.querySelector('[aria-live="polite"]')!;
    expect(region.childElementCount).toBe(0);
    act(() => {
      pushToast('Animal sincronizado', 'success', 0);
      pushToast('Falló la conexión', 'error', 0);
    });
    expect(region.querySelector('.sync-notice--success')?.textContent).toContain('Animal sincronizado');
    expect(region.querySelector('.sync-notice--error')?.textContent).toContain('Error');
    act(() => region.querySelector<HTMLButtonElement>('button[aria-label="Cerrar aviso"]')!.click());
    expect(region.childElementCount).toBe(1);
    expect(region.textContent).toContain('Falló la conexión');
  });

  it('CA-03 coloca Orden entre la búsqueda y la lista y conserva filtrado y paginación', () => {
    render(<AnimalsView />);
    const search = container.querySelector<HTMLInputElement>('input[type="search"]')!;
    const sort = container.querySelector<HTMLSelectElement>('select')!;
    const list = container.querySelector('.animal-list')!;
    expect(search.closest('.animals-toolbar')?.nextElementSibling).toBe(sort.closest('.animals-results-toolbar'));
    expect(sort.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(list.childElementCount).toBe(10);
    expect(list.firstElementChild?.textContent).toContain('Animal 12');
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Página siguiente"]')!.click());
    expect(list.childElementCount).toBe(2);
    act(() => {
      sort.value = 'name';
      sort.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(list.firstElementChild?.textContent).toContain('Animal 01');
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(search, 'Animal 04');
      search.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(list.childElementCount).toBe(1);
    expect(list.firstElementChild?.textContent).toContain('Animal 04');
  });

  it('CA-04 abre la foto cargada y cierra por botón o Escape, con subida separada', () => {
    // El entorno DOM no implementa la apertura modal y el cierre nativos.
    const dialogPrototype = HTMLDialogElement.prototype;
    const showModal = vi.fn(function (this: HTMLDialogElement) { this.open = true; });
    const close = vi.fn(function (this: HTMLDialogElement) { this.open = false; });
    Object.defineProperties(dialogPrototype, {
      showModal: { configurable: true, value: showModal },
      close: { configurable: true, value: close },
    });
    try {
      render(<ProfilePhoto name="Luna" path="animals/luna.jpg" canUpload />);
      const trigger = container.querySelector<HTMLButtonElement>('[aria-label="Ampliar foto de Luna"]')!;
      const upload = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Cambiar foto');
      expect(trigger.hidden).toBe(true);
      expect(upload).toBeDefined();
      expect(upload?.closest('.profile-avatar-container')).toBeNull();
      act(() => trigger.querySelector('img')!.dispatchEvent(new Event('load')));
      expect(trigger.hidden).toBe(false);
      act(() => trigger.click());
      const dialog = container.querySelector('dialog')!;
      expect(dialog.open).toBe(true);
      expect(dialog.querySelector('img')?.getAttribute('src')).toBe(trigger.querySelector('img')?.getAttribute('src'));
      act(() => dialog.querySelector('button')!.click());
      expect(dialog.open).toBe(false);
      act(() => trigger.click());
      act(() => dialog.dispatchEvent(new Event('cancel', { cancelable: true })));
      expect(dialog.open).toBe(false);
      act(() => trigger.querySelector('img')!.dispatchEvent(new Event('error')));
      expect(container.querySelector('dialog')).toBeNull();
      expect(container.querySelector('[role="alert"]')?.textContent).toBe('No se pudo cargar la foto');
      render(<ProfilePhoto key="missing" name="Luna" path={null} canUpload />);
      expect(container.querySelector('[aria-label="Ampliar foto de Luna"]')).toBeNull();
      expect(container.textContent).toContain('Agregar foto');
    } finally {
      Reflect.deleteProperty(dialogPrototype, 'showModal');
      Reflect.deleteProperty(dialogPrototype, 'close');
    }
  });
});
