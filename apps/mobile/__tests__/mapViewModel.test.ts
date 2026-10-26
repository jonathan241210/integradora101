import { act, renderHook, waitFor } from '@testing-library/react-native';
import { MapRepository } from '../src/repositories';
import { MOCK_MAP_PLACES, MOCK_MAP_SECTIONS } from '../src/mocks/zoo';
import { useMapViewModel } from '../src/viewmodels/useMapViewModel';

const tiger = MOCK_MAP_PLACES.find((place) => place.id === 'juan')!;
const restrooms = MOCK_MAP_PLACES.find((place) => place.id === 'restrooms')!;
const hiddenPlace = {
  ...MOCK_MAP_PLACES.find((place) => place.id === 'bird-aviary')!,
  id: 'hidden-place',
  visible: false,
};

const filterRepository: MapRepository = {
  getPlaces: async () => [tiger, hiddenPlace, restrooms],
  getSections: async () => MOCK_MAP_SECTIONS,
};

const emptyRepository: MapRepository = {
  getPlaces: async () => [],
  getSections: async () => MOCK_MAP_SECTIONS,
};

function createFlakyRepository(): MapRepository {
  let attempts = 0;
  return {
    getPlaces: async () => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error('repositorio no disponible');
      }
      return MOCK_MAP_PLACES;
    },
    getSections: async () => MOCK_MAP_SECTIONS,
  };
}

describe('MapViewModel', () => {
  it('test-ca-02: solo expone puntos visibles y aplica filtros por tipo', async () => {
    const { result } = await renderHook(() => useMapViewModel(filterRepository));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.places).toHaveLength(3);
    expect(result.current.filteredPlaces.map((place) => place.id)).toEqual([
      'juan',
      'restrooms',
    ]);

    await act(() => result.current.setFilter('animal'));
    expect(result.current.filteredPlaces.map((place) => place.id)).toEqual(['juan']);

    await act(() => result.current.setFilter('service'));
    expect(result.current.filteredPlaces.map((place) => place.id)).toEqual(['restrooms']);
  });

  it('test-ca-05: enfoca el punto y su sección sin crear una ruta', async () => {
    const { result } = await renderHook(() => useMapViewModel(filterRepository));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(() => result.current.focusPlace('juan'));

    expect(result.current.selectedPlace?.id).toBe('juan');
    expect(result.current.focusedSectionId).toBe('zone-felines');
    expect(result.current.focusNotFound).toBe(false);

    await act(() => result.current.focusPlace('missing'));
    expect(result.current.selectedPlace).toBeNull();
    expect(result.current.focusNotFound).toBe(true);
  });

  it('test-ca-06: expone error y permite reintentar la carga', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const repository = createFlakyRepository();
    const { result } = await renderHook(() => useMapViewModel(repository));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('No se pudo cargar el mapa. Intenta de nuevo.');

    await act(async () => {
      await result.current.retry();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.places).toHaveLength(MOCK_MAP_PLACES.length);
    jest.restoreAllMocks();
  });

  it('test-ca-06: mantiene un estado vacío sin error cuando no hay puntos', async () => {
    const { result } = await renderHook(() => useMapViewModel(emptyRepository));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.filteredPlaces).toHaveLength(0);
  });
});
