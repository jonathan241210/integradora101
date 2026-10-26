import React from 'react';
import { render } from '@testing-library/react-native';
import { AppText, ScreenContainer } from '../../src/components/ui';

declare const __dirname: string;

const fs = jest.requireActual<{
  readFileSync: (file: string, encoding: string) => string;
}>('fs');
const path = jest.requireActual<{ join: (...parts: string[]) => string }>('path');

describe('teclado en formularios', () => {
  it('test-ca-06-keyboard-insets: el contenedor con scroll ajusta el teclado', async () => {
    const view = await render(
      <ScreenContainer>
        <AppText variant="body">Contraseña</AppText>
      </ScreenContainer>,
    );
    const tree = JSON.stringify(view.toJSON());
    expect(tree).toContain('"keyboardShouldPersistTaps":"handled"');
    expect(tree).toContain('"automaticallyAdjustKeyboardInsets":true');
    const source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'src', 'components', 'ui', 'ScreenContainer.tsx'),
      'utf8',
    );
    expect(source).toContain("behavior={Platform.OS === 'ios' ? 'padding' : undefined}");
    expect(source).toContain('<KeyboardAvoidingView');
  });

  it('test-ca-06-keyboard-static: sin scroll no envuelve el teclado', async () => {
    const view = await render(
      <ScreenContainer scroll={false}>
        <AppText variant="body">Mapa</AppText>
      </ScreenContainer>,
    );
    const tree = JSON.stringify(view.toJSON());
    expect(tree).not.toContain('RCTScrollView');
    expect(tree).not.toContain('keyboardShouldPersistTaps');
  });

  it('test-ca-06-keyboard-android-resize: Android redimensiona la ventana con el teclado', () => {
    const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'app.json'), 'utf8')) as {
      expo: { android: { softwareKeyboardLayoutMode?: string; usesCleartextTraffic: boolean } };
    };
    expect(appJson.expo.android.softwareKeyboardLayoutMode).toBe('resize');
    expect(appJson.expo.android.usesCleartextTraffic).toBe(false);
  });
});
