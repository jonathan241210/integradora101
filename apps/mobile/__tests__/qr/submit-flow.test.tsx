/**
 * test-ca-06-suite-documents-simulator-limits: Jest no ejecuta la cámara real;
 * las pruebas inyectan dependencias en useQrScanViewModel.
 */
import React, { useEffect } from 'react';
import { Text } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';
import { presentScanResult } from '../../src/navigation/presentScanResult';
import { useQrScanViewModel } from '../../src/viewmodels/useQrScanViewModel';

function SubmitOnce({
  deps,
  code,
  onDone,
}: {
  code: string;
  deps: NonNullable<Parameters<typeof useQrScanViewModel>[1]>;
  onDone: (vm: ReturnType<typeof useQrScanViewModel>) => void;
}) {
  const router = { push: jest.fn() } as never;
  const vm = useQrScanViewModel(router, deps);
  useEffect(() => {
    void vm.onManualSubmit(code).then(() => onDone(vm));
  }, []);
  return <Text>probe</Text>;
}

describe('mobile-006 flujo submitScan', () => {
  it('test-ca-04-submit-scan-navigation: normaliza, envía y presenta resultado', async () => {
    const submit = jest.fn().mockResolvedValue({
      kind: 'invalid_code',
      title: 'Código inválido',
      message: 'El código no es válido.',
    });
    const present = jest.fn();
    const deps = {
      submit,
      present,
      normalize: (raw: string) => raw.trim().toUpperCase(),
    };

    await render(
      <SubmitOnce
        code="arca-ok1"
        deps={deps}
        onDone={() => undefined}
      />,
    );

    await waitFor(() => expect(submit).toHaveBeenCalledWith('ARCA-OK1'));
    expect(present).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ kind: 'invalid_code' }),
    );
  });

  it('test-ca-05-qr-scan-mvvm: rechaza payload inválido sin llamar submit', async () => {
    const submit = jest.fn();
    const present = jest.fn();
    const deps = {
      submit,
      present,
      normalize: () => null,
    };

    await render(
      <SubmitOnce
        code="mal"
        deps={deps}
        onDone={() => undefined}
      />,
    );

    await waitFor(() => expect(submit).not.toHaveBeenCalled());
    expect(present).not.toHaveBeenCalled();
  });

  it('test-ca-03-manual-text-shows-invalid-message: un toque no se confunde con el código', async () => {
    let latest: ReturnType<typeof useQrScanViewModel> | null = null;

    function Probe() {
      const router = { push: jest.fn() } as never;
      const vm = useQrScanViewModel(router);
      latest = vm;
      return <Text>probe</Text>;
    }

    await render(<Probe />);
    await act(async () => {
      latest!.setManualCode('hola mundo');
    });
    await act(async () => {
      await latest!.onManualSubmit({ nativeEvent: {} } as never);
    });

    expect(latest!.validationError).toBe('Ese texto no es un código válido del zoológico. Debe empezar por ARCA-.');
  });

  it('test-ca-04-present-scan-result: mapea ScanPresentation a la ruta scan-result', () => {
    const router = { push: jest.fn() };
    presentScanResult(router as never, {
      kind: 'discovered',
      title: 'Nuevo descubrimiento',
      message: 'Listo',
      pointsAwarded: 50,
      newSpecies: ['A', 'B'],
    });
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/scan-result',
      params: {
        kind: 'discovered',
        title: 'Nuevo descubrimiento',
        message: 'Listo',
        points: '50',
        species: 'A|B',
        unlocked: '[]',
        known: '[]',
      },
    });
  });
});
