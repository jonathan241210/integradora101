import React from 'react';
import { render } from '@testing-library/react-native';
import { AppText, Button, Card, Chip, HeroBanner, ProgressBar, ScreenContainer } from '../src/components/ui';

describe('Kit visual base (CA-06)', () => {
  it('test-ca-06-auto: conserva la estructura de los componentes UI compartidos', async () => {
    const rendered = await render(
      <ScreenContainer>
        <HeroBanner overline="Explorador" title="Bienvenido" subtitle="Explora el zoológico" />
        <Card><AppText variant="body">Contenido</AppText></Card>
        <Chip label="Animales" selected onPress={() => {}} />
        <Button label="Continuar" onPress={() => {}} />
        <ProgressBar value={0.5} label="Progreso" />
      </ScreenContainer>
    );

    expect(rendered.toJSON()).toMatchSnapshot();
  });
});
