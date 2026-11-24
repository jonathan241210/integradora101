import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ScanResultScreen } from '../../src/screens/ScanResultScreen';
import type { ScanPresentation } from '../../src/services/scanQueue';

const cases: ScanPresentation[] = [
  { kind: 'discovered', title: 'Nuevo descubrimiento', message: 'Descubriste especies nuevas.', pointsAwarded: 100, newSpecies: ['Tigre'] },
  { kind: 'already_discovered', title: 'Ya descubierto', message: 'Esas especies ya estaban en tu colección.' },
  { kind: 'empty_enclosure', title: 'Sin animales', message: 'Este recinto no tiene animales en exhibición.' },
  { kind: 'invalid_code', title: 'Código inválido', message: 'Ese código no corresponde a un recinto.' },
  { kind: 'inactive_code', title: 'Código inválido', message: 'Ese código ya no está activo.' },
  { kind: 'expired_scan', title: 'Escaneo vencido', message: 'El escaneo venció. Vuelve a leer el código.' },
];

describe('test-ca-07-progress-result-screens', () => {
  it.each(cases)('CA-07 visitor-progress muestra $title', async (result) => {
    const view = await render(<ScanResultScreen result={result} onBackPress={() => undefined} />);
    expect(view.getByText(result.title)).toBeTruthy();
    expect(view.getByText(result.message)).toBeTruthy();
    if (result.kind === 'discovered') {
      expect(view.getByText('+100 puntos')).toBeTruthy();
      expect(view.getByText('¡Lo lograste!')).toBeTruthy();
      expect(view.queryByText('Tigre')).toBeNull();
      expect(view.queryByText(/Se desbloqueó/)).toBeNull();
    }
    if (result.kind === 'empty_enclosure') {
      expect(view.getByText('Aquí no hay')).toBeTruthy();
      expect(view.queryByText('¡Este ya es tuyo!')).toBeNull();
      expect(view.queryByText('+100 puntos')).toBeNull();
    }
  });

  it('CA-07 y api-005 CA-17: cada especie válida abre su propia ficha con el nombre completo', async () => {
    const openSpecies = jest.fn();
    const view = await render(
      <ScanResultScreen
        result={{
          kind: 'discovered',
          title: 'Nuevo descubrimiento',
          message: 'Descubriste especies nuevas.',
          pointsAwarded: 100,
          unlockedSpecies: [
            { id: '1', name: 'Tigre de Bengala' },
            { id: '2', name: 'Guacamaya roja' },
            { id: '3', name: 'Jaguar' },
            { id: '4', name: ' ' },
          ],
        }}
        onBackPress={() => undefined}
        onOpenSpecies={openSpecies}
      />,
    );
    expect(view.getByText('Ver Tigre de Bengala')).toBeTruthy();
    expect(view.getByText('Ver Guacamaya roja')).toBeTruthy();
    expect(view.queryByText(/^Ver\s*$/)).toBeNull();
    await fireEvent.press(view.getByRole('button', { name: 'Ver Jaguar' }));
    expect(openSpecies).toHaveBeenCalledWith('3');
  });

  it('CA-07 distingue las especies nuevas de las que ya estaban en la colección', async () => {
    const view = await render(
      <ScanResultScreen
        result={{
          ...cases[0],
          unlockedSpecies: [{ id: '1', name: 'Jaguar' }],
          alreadyKnownSpecies: [{ id: '2', name: 'Guacamaya' }],
        }}
        onBackPress={jest.fn()}
      />,
    );
    expect(view.getByRole('button', { name: 'Ver Jaguar' })).toBeTruthy();
    expect(view.getByText('Ya estaban en tu colección: Guacamaya.')).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Ver Guacamaya' })).toBeNull();
  });

  it.each(['pending', 'rate_limited'] as const)('CA-06 muestra Reintentar para %s', async (kind) => {
    const onRetryPress = jest.fn();
    const onBackPress = jest.fn();
    const view = await render(
      <ScanResultScreen
        result={{ kind, title: 'Escaneo pendiente', message: 'Vuelve a intentarlo.' }}
        onBackPress={onBackPress}
        onRetryPress={kind === 'pending' ? onRetryPress : undefined}
      />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'Reintentar' }));
    expect(kind === 'pending' ? onRetryPress : onBackPress).toHaveBeenCalledTimes(1);
  });
});
