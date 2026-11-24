import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import AccountRoute from '../../src/app/(tabs)/account';
import { EnclosureDetailModal } from '../../src/components/map/EnclosureDetailModal';
import { MOCK_MAP_PLACES } from '../../src/mocks/zoo';
import type { MapPlace } from '../../src/models';
import { accountSession } from '../../src/session/accountSession';
import { createSecureTokenStorage } from '../../src/services/tokenStorage';
import { NO_ANIMALS_MESSAGE, getAnimalCardData, getEnclosureAnimalsList } from '../../src/utils/enclosureAnimals';
import { mapEnclosureToMapPlace } from '../../src/repositories/mappers';

const mockItems = new Map<string, string>();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: (key: string) => Promise.resolve(mockItems.get(key) ?? null),
  setItemAsync: (key: string, value: string) => {
    mockItems.set(key, value);
    return Promise.resolve();
  },
  deleteItemAsync: (key: string) => {
    mockItems.delete(key);
    return Promise.resolve();
  },
}));

function jsonResponse(status: number, body: unknown) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: () => null },
    text: async () => JSON.stringify(body),
    body: { cancel: async () => undefined },
  } as unknown as Response;
}

const emptyPlace: MapPlace = {
  id: 'recinto-vacio',
  name: 'Recinto vacío',
  kind: 'animal',
  sectionId: 'sec',
  description: 'Recinto de prueba.',
  mapX: 0.5,
  mapY: 0.5,
  visible: true,
  animals: [],
};

describe('mobile-018 cuenta real', () => {
  const previousUseApi = process.env.EXPO_PUBLIC_USE_API;

  beforeEach(() => {
    mockItems.clear();
    process.env.EXPO_PUBLIC_USE_API = 'true';
  });

  afterEach(() => {
    if (previousUseApi === undefined) delete process.env.EXPO_PUBLIC_USE_API;
    else process.env.EXPO_PUBLIC_USE_API = previousUseApi;
  });

  it('CA-06 la cuenta muestra el correo y el nombre de /visitor/me, no los de MOCK_VISITOR_ACCOUNT', async () => {
    await accountSession.resetForTests();
    const fetchImpl = jest.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith('/api/v1/visitor/me')) {
        return jsonResponse(200, {
          data: { email: 'ana@ejemplo.com', first_name: 'Ana', nickname: 'Anita', avatar_code: 'jaguar' },
        });
      }
      return jsonResponse(404, { message: 'No encontrado.' });
    });
    accountSession.configureForTests({
      apiUrl: 'https://api.pruebas.invalid',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await createSecureTokenStorage().write({ accessToken: 'access', refreshToken: 'refresh' });
    await accountSession.bootstrap();

    const view = await render(<AccountRoute />);
    expect(view.getByText('ana@ejemplo.com')).toBeTruthy();
    expect(view.getByText('Anita')).toBeTruthy();
    expect(view.queryByText('maria.garcia@correo.com')).toBeNull();
    expect(view.queryByText('María García')).toBeNull();
  });

  it('CA-06 sin cuenta (sin sesión) no se muestra la ficha demo', async () => {
    await accountSession.resetForTests();
    await accountSession.bootstrap();
    const view = await render(<AccountRoute />);
    await waitFor(() => expect(view.getByText('Iniciar sesión')).toBeTruthy());
    expect(view.queryByText('maria.garcia@correo.com')).toBeNull();
  });

  it('CA-07 un recinto sin ejemplares en la API muestra «Sin ejemplares para mostrar»', async () => {
    const view = await render(<EnclosureDetailModal visible place={emptyPlace} onClose={() => undefined} />);
    expect(view.getByText(NO_ANIMALS_MESSAGE)).toBeTruthy();
    expect(view.queryByText(/Sano y activo|Recinto supervisado|Control veterinario/)).toBeNull();
  });

  it('CA-07 incluso un recinto con nombre de un mock (Tigre) no recibe ejemplares inventados sin mocks', () => {
    const tiger = MOCK_MAP_PLACES.find((place) => place.id === 'juan')!;
    expect(getEnclosureAnimalsList({ ...tiger, animals: undefined }, { allowMocks: false })).toEqual([]);
    expect(getEnclosureAnimalsList({ ...tiger, animals: undefined })).toEqual([]);
    expect(getAnimalCardData(emptyPlace)).toMatchObject({ animalsCount: 0, subtitle: NO_ANIMALS_MESSAGE });
  });

  it('CA-07 la curiosidad del ejemplar viene de fun_fact y no de characteristics', () => {
    const place = mapEnclosureToMapPlace({
      id: 9, name: 'Felinos', map_x: 0.1, map_y: 0.2,
      animals: [{ id: 1, name: 'Juan', species_name: 'Jaguar', species: {
        id: 1, common_name: 'Jaguar', scientific_name: 'Panthera onca', fun_fact: 'Nada muy bien.',
      } }],
    });
    const [animal] = getEnclosureAnimalsList(place, { allowMocks: false });
    expect(animal.funFact).toBe('Nada muy bien.');
    const noFact = mapEnclosureToMapPlace({
      id: 10, name: 'Aves', map_x: 0.1, map_y: 0.2,
      animals: [{ id: 2, name: 'Rio', species_name: 'Guacamaya' }],
    });
    expect(getEnclosureAnimalsList(noFact, { allowMocks: false })[0].funFact).toBe('Habitan: Rio.');
  });

  it('CA-08 con las pruebas activas el catálogo de demostración sigue disponible', () => {
    process.env.EXPO_PUBLIC_USE_API = 'false';
    const tiger = MOCK_MAP_PLACES.find((place) => place.id === 'juan')!;
    expect(getEnclosureAnimalsList(tiger).length).toBeGreaterThan(0);
  });
});
