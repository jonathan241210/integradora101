import React from 'react';
import { act, render, renderHook } from '@testing-library/react-native';
import { getNetworkStateAsync, useNetworkState } from 'expo-network';
import { useNetworkStatus } from '../src/viewmodels/useNetworkStatus';
import { AnimalDetailScreen } from '../src/screens/AnimalDetailScreen';
import { EventDetailScreen } from '../src/screens/EventDetailScreen';
import { Animal, ZooEvent } from '../src/models';

const mockedUseNetworkState = useNetworkState as jest.MockedFunction<typeof useNetworkState>;

type NetworkState = ReturnType<typeof useNetworkState>;

function networkState(overrides: Partial<NetworkState>): NetworkState {
  return {
    type: 'WIFI',
    isConnected: true,
    isInternetReachable: true,
    ...overrides,
  } as NetworkState;
}

const animal: Animal = {
  id: '1',
  nickname: 'Jaguar',
  commonName: 'Jaguar',
  scientificName: 'Panthera onca',
  zone: 'Zona de Felinos',
  isDiscovered: true,
  placeholderTint: '#8A9A5B',
  stats: {
    avgWeight: '',
    size: '180 cm',
    lifeExpectancy: '12-15 años',
  },
  diet: 'Carnívoro',
  curiosities: 'Pelaje dorado con manchas negras.',
};

const event: ZooEvent = {
  id: '1',
  title: 'Plática Educativa de Felinos',
  date: '2026-10-22',
  time: '12:00 hrs',
  location: 'Recinto de Felinos Mayores',
  description: 'Una plática para toda la familia.',
};

describe('Conectividad offline (mobile-003: CA-04, ADR 0014)', () => {
  beforeEach(() => {
    mockedUseNetworkState.mockReturnValue(networkState({}));
  });

  it('CA-04: useNetworkStatus está en línea cuando hay conexión e internet', async () => {
    const { result } = await renderHook(() => useNetworkStatus());

    expect(result.current.isOffline).toBe(false);
  });

  it('CA-04: useNetworkStatus marca offline cuando isConnected es false', async () => {
    mockedUseNetworkState.mockReturnValue(networkState({ isConnected: false }));
    const { result } = await renderHook(() => useNetworkStatus());

    expect(result.current.isOffline).toBe(true);
  });

  it('CA-04: useNetworkStatus marca offline cuando isInternetReachable es false', async () => {
    mockedUseNetworkState.mockReturnValue(
      networkState({ isConnected: true, isInternetReachable: false })
    );
    const { result } = await renderHook(() => useNetworkStatus());

    expect(result.current.isOffline).toBe(true);
  });

  it('CA-04: vuelve a consultar tras un error y quita el aviso al recuperar la conexión', async () => {
    jest.useFakeTimers();
    const probe = jest.mocked(getNetworkStateAsync);
    probe.mockClear();
    probe.mockRejectedValueOnce(new Error('Error al consultar la red'));
    mockedUseNetworkState.mockReturnValue(networkState({ isInternetReachable: false }));

    try {
      const { result, unmount } = await renderHook(() => useNetworkStatus());
      await act(async () => {
        await jest.advanceTimersByTimeAsync(3000);
      });
      expect(result.current.isOffline).toBe(true);

      await act(async () => {
        await jest.advanceTimersByTimeAsync(3000);
      });
      expect(result.current.isOffline).toBe(false);
      expect(probe).toHaveBeenCalledTimes(2);

      await unmount();
      await jest.advanceTimersByTimeAsync(3000);
      expect(probe).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('CA-04: evita comprobaciones simultáneas y descarta la que termina tras desmontar', async () => {
    jest.useFakeTimers();
    const probe = jest.mocked(getNetworkStateAsync);
    probe.mockClear();
    let resolveProbe!: (state: NetworkState) => void;
    probe.mockReturnValueOnce(new Promise<NetworkState>((resolve) => {
      resolveProbe = resolve;
    }));
    mockedUseNetworkState.mockReturnValue(networkState({ isConnected: false }));

    try {
      const { unmount } = await renderHook(() => useNetworkStatus());
      await act(async () => {
        await jest.advanceTimersByTimeAsync(9000);
      });
      expect(probe).toHaveBeenCalledTimes(1);

      await unmount();
      await act(async () => {
        resolveProbe(networkState({}));
        await jest.advanceTimersByTimeAsync(3000);
      });
      expect(probe).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('CA-04: el detalle de animal muestra el banner sin conexión', async () => {
    const { getByText } = await render(<AnimalDetailScreen animal={animal} isOffline />);

    expect(getByText('SIN CONEXIÓN')).toBeTruthy();
    expect(getByText('Modo sin conexión. Mostrando información guardada.')).toBeTruthy();
  });

  it('CA-04: el detalle de evento muestra el banner sin conexión', async () => {
    const { getByText } = await render(
      <EventDetailScreen event={event} isOffline onBackPress={jest.fn()} />
    );

    expect(getByText('SIN CONEXIÓN')).toBeTruthy();
    expect(getByText('Modo sin conexión. Mostrando información guardada.')).toBeTruthy();
  });
});
