import React from 'react';
import { Text } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';
import { UserLocationMarker } from '../src/components/map/UserLocationMarker';
import { useLocationViewModel } from '../src/viewmodels/useLocationViewModel';
import { useArTourViewModel } from '../src/viewmodels/useArTourViewModel';
import { MOCK_MAP_PLACES } from '../src/mocks/zoo';
import {
  emitHeading,
  emitPosition,
  mockGranted,
  resetLocationMock,
} from '../test-support/locationMocks';

describe('Giroscopio / Brújula y Orientación en Vivo (Mapa 2D y Modo AR/3D)', () => {
  beforeEach(() => {
    resetLocationMock();
    jest.clearAllMocks();
  });

  it('renderiza el haz direccional (cono de visión) en UserLocationMarker rotado según el heading', async () => {
    const view = await render(
      <UserLocationMarker
        svgX={500}
        svgY={700}
        searching={false}
        heading={135}
      />,
    );

    const headingBeam = view.getByTestId('user-location-heading-beam');
    expect(headingBeam).toBeTruthy();

    const beamStyle = Array.isArray(headingBeam.props.style)
      ? headingBeam.props.style
      : [headingBeam.props.style];

    expect(beamStyle).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          transform: [{ rotate: '135deg' }],
        }),
      ]),
    );

    // Etiqueta accesible descriptiva con los grados de orientación
    expect(view.getByLabelText(/orientación 135 grados/i)).toBeTruthy();
  });

  it('no muestra el haz direccional si la señal está buscando o heading es null', async () => {
    const view = await render(
      <UserLocationMarker
        svgX={500}
        svgY={700}
        searching={true}
        heading={null}
      />,
    );

    expect(view.queryByTestId('user-location-heading-beam')).toBeNull();
    expect(view.getByTestId('location-searching')).toBeTruthy();
  });

  it('useLocationViewModel se suscribe a watchHeadingAsync y actualiza userPosition.heading en tiempo real', async () => {
    mockGranted(5, 20.0805, -98.7215);

    let latestPosition: ReturnType<typeof useLocationViewModel>['userPosition'] = null;
    let latestHeading: number | null = null;

    const Probe = () => {
      const vm = useLocationViewModel();
      latestPosition = vm.userPosition;
      latestHeading = vm.heading;
      return <Text testID="probe-status">Position: {String(latestPosition?.svgX)}</Text>;
    };

    await render(<Probe />);

    await act(async () => {
      emitPosition(20.0805, -98.7215, 5);
      emitHeading(240);
    });

    await waitFor(() => {
      expect(latestPosition?.heading).toBe(240);
      expect(latestHeading).toBe(240);
    });

    // Al girar el dispositivo con el giroscopio físico
    await act(async () => {
      emitHeading(45);
    });

    await waitFor(() => {
      expect(latestPosition?.heading).toBe(45);
      expect(latestHeading).toBe(45);
    });
  });

  it('useArTourViewModel usa el heading del giroscopio para calcular la guía 3D en tiempo real', async () => {
    let capturedHeading = -1;

    const ArProbe = () => {
      const vm = useArTourViewModel({
        places: MOCK_MAP_PLACES,
        userPosition: {
          svgX: 500,
          svgY: 1280,
          lat: 20.08,
          lon: -98.722,
          accuracy: 5,
          searching: false,
          heading: 180,
        },
      });
      capturedHeading = vm.headingDegrees;
      return <Text>Heading: {vm.headingDegrees}</Text>;
    };

    await render(<ArProbe />);

    expect(capturedHeading).toBe(180);
  });
});
