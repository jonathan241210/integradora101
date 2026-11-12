import React from 'react';
import { render } from '@testing-library/react-native';
import { ScanResultScreen } from '../../src/screens/ScanResultScreen';
import type { ScanPresentation } from '../../src/services/scanQueue';

const cases: ScanPresentation[] = [
  { kind: 'discovered', title: 'Nuevo descubrimiento', message: 'Descubriste especies nuevas.', pointsAwarded: 100, newSpecies: ['Tigre'] },
  { kind: 'already_discovered', title: 'Ya descubierto', message: 'Esas especies ya estaban en tu colección.' },
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
  });

  it('CA-07 visitor-progress muestra el nombre completo en cada botón', async () => {
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
          ],
        }}
        onBackPress={() => undefined}
      />,
    );
    expect(view.getByText('Ver Tigre de Bengala')).toBeTruthy();
    expect(view.getByText('Ver Guacamaya roja')).toBeTruthy();
  });
});
