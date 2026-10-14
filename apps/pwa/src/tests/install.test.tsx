import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { PwaInstallController } from '@/viewmodels/usePwaInstall';
import {
  getInstallMode,
  getInstallPlatform,
} from '@/viewmodels/usePwaInstall';
import { InstallAppAction } from '@/views/InstallAppAction';

const appRoot = new URL('../../', import.meta.url);
const manifest = JSON.parse(
  readFileSync(new URL('public/manifest.webmanifest', appRoot), 'utf8'),
) as {
  name: string;
  short_name: string;
  display: string;
  icons: { src: string; sizes: string; type: string; purpose: string }[];
};

function createInstallController(
  overrides: Partial<PwaInstallController> = {},
): PwaInstallController {
  return {
    mode: 'manual',
    platform: 'other',
    feedback: '',
    error: '',
    install: async () => undefined,
    ...overrides,
  };
}

describe('CA-07 PWA browser installation', () => {
  it('distingue prompt nativo, guía manual y aplicación instalada', () => {
    expect(
      getInstallMode({
        isStandalone: false,
        isInstalled: false,
        hasPrompt: true,
      }),
    ).toBe('prompt');
    expect(
      getInstallMode({
        isStandalone: false,
        isInstalled: false,
        hasPrompt: false,
      }),
    ).toBe('manual');
    expect(
      getInstallMode({
        isStandalone: true,
        isInstalled: false,
        hasPrompt: true,
      }),
    ).toBe('hidden');
    expect(
      getInstallMode({
        isStandalone: false,
        isInstalled: true,
        hasPrompt: true,
      }),
    ).toBe('hidden');
  });

  it('identifica Safari móvil para mostrar los pasos correctos', () => {
    expect(getInstallPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS)', 5)).toBe(
      'ios',
    );
    expect(getInstallPlatform('Mozilla/5.0 (Android 15)', 5)).toBe('other');
    expect(getInstallPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 5)).toBe(
      'ios',
    );
  });

  it('muestra instrucciones manuales en iPhone cuando no existe prompt nativo', () => {
    const markup = renderToStaticMarkup(
      <InstallAppAction
        controller={createInstallController({ platform: 'ios' })}
      />,
    );

    expect(markup).toContain('Instalar en teléfono');
    expect(markup).toContain('Safari');
    expect(markup).toContain('Compartir');
    expect(markup).toContain('Añadir a pantalla de inicio');
    expect(markup).toContain('HTTPS');
  });

  it('ofrece el botón que invoca el prompt cuando el navegador lo expone', () => {
    const markup = renderToStaticMarkup(
      <InstallAppAction
        controller={createInstallController({ mode: 'prompt' })}
      />,
    );

    expect(markup).toContain('Instalar app');
    expect(markup).toContain('Instalar ZooHealth en este dispositivo');
  });
});

describe('CA-08 PWA install manifest', () => {
  it('declara nombre, modo independiente y dos iconos con tamaños requeridos', () => {
    expect(manifest.name).toContain('ZooHealth');
    expect(manifest.short_name).toBe('ZooHealth');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.map((icon) => icon.sizes)).toEqual([
      '192x192',
      '512x512',
    ]);

    for (const icon of manifest.icons) {
      expect(icon.type).toBe('image/svg+xml');
      expect(icon.purpose).toContain('maskable');
      expect(
        readFileSync(
          new URL(`public${icon.src}`, appRoot),
          'utf8',
        ),
      ).toContain('<svg');
    }
  });

  it('enlaza el manifiesto desde el documento de entrada', () => {
    const indexHtml = readFileSync(
      fileURLToPath(new URL('../../index.html', import.meta.url)),
      'utf8',
    );

    expect(indexHtml).toContain('rel="manifest"');
    expect(indexHtml).toContain('/manifest.webmanifest');
  });
});
