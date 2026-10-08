import React from 'react';
import { render } from '@testing-library/react-native';
import WelcomeScreen from '../src/app/index';

describe('WelcomeScreen (CA-04)', () => {
  it('renderiza la pantalla raíz sin excepciones locales', async () => {
    const { getByText } = await render(<WelcomeScreen />);
    const welcomeText = getByText('¡Bienvenido a ARCA-NB!');
    expect(welcomeText).toBeTruthy();
  });
});