import React from 'react';

declare const __dirname: string;
declare const __filename: string;

const fs = jest.requireActual<{
  readFileSync: (file: string, encoding: string) => string;
}>('fs');
const path = jest.requireActual<{ join: (...parts: string[]) => string }>('path');
import { Text } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { VisitorFavoriteSpeciesList } from '@arca/api-client';
import { AnimalDetailScreen } from '../src/screens/AnimalDetailScreen';
import { HomeScreen } from '../src/screens/HomeScreen';
import { animalsInFavoriteOrder, useFavoriteAnimals, type FavoriteClient } from '../src/viewmodels/useFavoriteAnimals';
import { createFavoriteAnimals, createFavoriteSpeciesClient, favoriteAnimals } from '../src/repositories/favoriteAnimals';
import { MemoryKeyValueStorage } from '../src/repositories/storage';
import { accountSession } from '../src/session/accountSession';
import { authRepository } from '../src/repositories/mockAuthRepository';
import { createMemoryTokenStorage } from '../src/services/tokenStorage';
import type { Animal } from '../src/models';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  deleteItemAsync: jest.fn(async () => undefined),
}));

function animal(id: string, commonName: string): Animal {
  return {
    id,
    nickname: `Apodo ${id}`,
    commonName,
    scientificName: 'Scientificus',
    zone: 'Selva',
    isDiscovered: true,
    placeholderTint: '#224422',
  };
}

function apiError(status: number, message = ''): Error {
  const error = new Error(message) as Error & { status: number };
  error.name = 'ApiError';
  error.status = status;
  return error;
}

function jsonResponse(status: number, body: unknown) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: () => null },
    text: async () => JSON.stringify(body),
    body: { cancel: async () => undefined },
  } as unknown as Response;
}

function list(ids: number[]): VisitorFavoriteSpeciesList {
  return { data: ids.map((id) => ({ id })) };
}

function Sheet({
  client,
  store,
  offline,
  animalId,
}: {
  client: FavoriteClient | null;
  store: ReturnType<typeof createFavoriteAnimals>;
  offline: boolean;
  animalId: string;
}) {
  const favorites = useFavoriteAnimals(client, store, offline);
  const shown = animal(animalId, animalId === '3' ? 'Jaguar' : 'Lobo');
  return (
    <AnimalDetailScreen
      animal={shown}
      isFavorite={favorites.ids.includes(animalId)}
      favoriteMessage={favorites.error}
      onToggleFavorite={() => { void favorites.toggle(animalId); }}
    />
  );
}

describe('favoritos de la cuenta', () => {
  beforeEach(async () => {
    await accountSession.resetForTests();
    await AsyncStorage.clear();
  });

  it('CA-01 el corazón sigue la lista de la cuenta', async () => {
    const update = jest.fn(async () => list([8]));
    const client: FavoriteClient = {
      listFavoriteSpecies: async () => list([3, 8]),
      updateFavoriteSpecies: update,
    };
    const store = createFavoriteAnimals(new MemoryKeyValueStorage());
    const marked = await render(<Sheet client={client} store={store} offline={false} animalId="3" />);
    expect(await marked.findByLabelText('Quitar Jaguar de favoritos')).toBeTruthy();
    await fireEvent.press(marked.getByLabelText('Quitar Jaguar de favoritos'));
    await waitFor(() => expect(update).toHaveBeenCalledWith(3, false));
    expect(await marked.findByLabelText('Marcar Jaguar como favorito')).toBeTruthy();

    const plain = await render(
      <Sheet
        client={{ listFavoriteSpecies: async () => list([3, 8]), updateFavoriteSpecies: update }}
        store={createFavoriteAnimals(new MemoryKeyValueStorage())}
        offline={false}
        animalId="9"
      />,
    );
    expect(await plain.findByLabelText('Marcar Lobo como favorito')).toBeTruthy();
  });

  it('CA-02 el inicio muestra solo los favoritos, en ese orden, y Colección no los filtra', async () => {
    const catalog = [animal('8', 'Lobo'), animal('3', 'Jaguar'), animal('1', 'Ajolote')];
    const ordered = animalsInFavoriteOrder(catalog, ['3', '8']);
    const home = await render(
      <HomeScreen appName="ARCA-NB" featuredAnimals={ordered} events={[]} news={[]} />,
    );
    expect(home.getByText('Animales favoritos')).toBeTruthy();
    expect(home.getByText('Jaguar')).toBeTruthy();
    expect(home.getByText('Lobo')).toBeTruthy();
    expect(home.queryByText('Ajolote')).toBeNull();
    const tree = JSON.stringify(home.toJSON());
    expect(tree.indexOf('Jaguar')).toBeLessThan(tree.indexOf('Lobo'));

    const empty = await render(
      <HomeScreen appName="ARCA-NB" featuredAnimals={[]} events={[]} news={[]} />,
    );
    expect(empty.getByText('Animales favoritos')).toBeTruthy();
    expect(empty.queryByText('Jaguar')).toBeNull();

    const collection = fs.readFileSync(
      path.join(__dirname, '../src/screens/CollectionScreen.tsx'),
      'utf8',
    );
    expect(collection.toLowerCase()).not.toContain('favorit');
  });

  it('CA-03 sube una sola vez los id numéricos y omite el 404', async () => {
    const storage = new MemoryKeyValueStorage();
    await storage.setItem('visitor.favorite-animal-ids', JSON.stringify(['4', 'juan', '8']));
    const store = createFavoriteAnimals(storage);
    const sent: number[] = [];
    const client: FavoriteClient = {
      listFavoriteSpecies: jest.fn()
        .mockResolvedValueOnce(list([]))
        .mockResolvedValueOnce(list([8])),
      updateFavoriteSpecies: jest.fn(async (id: number) => {
        sent.push(id);
        if (id === 4) throw apiError(404, 'Especie no encontrada.');
        return list([8]);
      }),
    };
    const view = await render(<Sheet client={client} store={store} offline={false} animalId="8" />);
    expect(await view.findByLabelText('Quitar Lobo de favoritos')).toBeTruthy();
    expect(sent).toEqual([4, 8]);
    expect(JSON.parse(await storage.getItem('visitor.favorite-animal-ids') ?? '[]')).toEqual([]);

    const kept = new MemoryKeyValueStorage();
    await kept.setItem('visitor.favorite-animal-ids', JSON.stringify(['4', 'juan']));
    const occupied = createFavoriteAnimals(kept);
    const skip = jest.fn();
    await render(
      <Sheet
        client={{ listFavoriteSpecies: async () => list([9]), updateFavoriteSpecies: skip }}
        store={occupied}
        offline={false}
        animalId="9"
      />,
    );
    await waitFor(async () => {
      expect(await kept.getItem('visitor.favorite-animal-ids')).toBeNull();
    });
    expect(skip).not.toHaveBeenCalled();
  });

  it('CA-04 cerrar sesión y borrar la cuenta olvidan las dos claves', async () => {
    await AsyncStorage.setItem('visitor.favorite-animal-ids', JSON.stringify(['4']));
    await AsyncStorage.setItem('visitor.favorite-species-ids', JSON.stringify(['8']));
    jest.spyOn(authRepository, 'logout').mockRejectedValueOnce(new Error('red'));
    await expect(accountSession.logout()).rejects.toThrow('red');
    expect(await AsyncStorage.getItem('visitor.favorite-animal-ids')).toBeNull();
    expect(await AsyncStorage.getItem('visitor.favorite-species-ids')).toBeNull();

    await AsyncStorage.setItem('visitor.favorite-animal-ids', JSON.stringify(['4']));
    await AsyncStorage.setItem('visitor.favorite-species-ids', JSON.stringify(['8']));
    jest.spyOn(authRepository, 'deleteAccount').mockResolvedValueOnce({ ok: false, status: 422, message: 'No' });
    await accountSession.deleteAccount('mala');
    expect(await AsyncStorage.getItem('visitor.favorite-species-ids')).toBe(JSON.stringify(['8']));

    jest.spyOn(authRepository, 'deleteAccount').mockResolvedValueOnce({ ok: true, status: 204, message: 'Listo' });
    await accountSession.deleteAccount('secreta12');
    expect(await AsyncStorage.getItem('visitor.favorite-animal-ids')).toBeNull();
    expect(await AsyncStorage.getItem('visitor.favorite-species-ids')).toBeNull();
  });

  it('CA-05 sin red se ve la copia y el corazón no cambia', async () => {
    const storage = new MemoryKeyValueStorage();
    const store = createFavoriteAnimals(storage);
    await store.writeCopy(['3']);
    const update = jest.fn();
    const view = await render(
      <Sheet
        client={{ listFavoriteSpecies: async () => list([]), updateFavoriteSpecies: update }}
        store={store}
        offline
        animalId="3"
      />,
    );
    expect(await view.findByLabelText('Quitar Jaguar de favoritos')).toBeTruthy();
    await fireEvent.press(view.getByLabelText('Quitar Jaguar de favoritos'));
    expect(await view.findByText('Sin conexión.')).toBeTruthy();
    expect(update).not.toHaveBeenCalled();
    expect(view.getByLabelText('Quitar Jaguar de favoritos')).toBeTruthy();
  });

  it('CA-06 un PUT fallido deja el corazón como estaba', async () => {
    const store = createFavoriteAnimals(new MemoryKeyValueStorage());
    const client: FavoriteClient = {
      listFavoriteSpecies: async () => list([3]),
      updateFavoriteSpecies: async () => {
        throw apiError(422, 'Especie no encontrada.');
      },
    };
    const view = await render(<Sheet client={client} store={store} offline={false} animalId="3" />);
    await fireEvent.press(await view.findByLabelText('Quitar Jaguar de favoritos'));
    expect(await view.findByText('Especie no encontrada.')).toBeTruthy();
    expect(view.getByLabelText('Quitar Jaguar de favoritos')).toBeTruthy();

    const quiet = createFavoriteAnimals(new MemoryKeyValueStorage());
    const blank = await render(
      <Sheet
        client={{
          listFavoriteSpecies: async () => list([3]),
          updateFavoriteSpecies: async () => { throw apiError(500, '   '); },
        }}
        store={quiet}
        offline={false}
        animalId="3"
      />,
    );
    await fireEvent.press(await blank.findByLabelText('Quitar Jaguar de favoritos'));
    expect(await blank.findByText('No se pudo guardar el favorito.')).toBeTruthy();
    expect(blank.getByLabelText('Quitar Jaguar de favoritos')).toBeTruthy();
  });

  it('CA-07 las pantallas no llaman al cliente', () => {
    const home = fs.readFileSync(path.join(__dirname, '../src/screens/HomeScreen.tsx'), 'utf8');
    const detail = fs.readFileSync(path.join(__dirname, '../src/screens/AnimalDetailScreen.tsx'), 'utf8');
    for (const source of [home, detail]) {
      expect(source).not.toContain('@arca/api-client');
      expect(source).not.toContain('fetch(');
    }
    const hook = fs.readFileSync(path.join(__dirname, '../src/viewmodels/useFavoriteAnimals.ts'), 'utf8');
    expect(hook).toContain('listFavoriteSpecies');
    expect(hook).toContain('updateFavoriteSpecies');
    expect(hook).not.toContain('is_published');
  });

  it('CA-08 la suite nombra CA-01 a CA-07', () => {
    const source = fs.readFileSync(__filename, 'utf8');
    for (const criterion of ['CA-01', 'CA-02', 'CA-03', 'CA-04', 'CA-05', 'CA-06', 'CA-07']) {
      expect(source).toContain(criterion);
    }
  });

  it('el inicio y la ficha comparten un solo GET', async () => {
    const listed = jest.fn(async () => list([3]));
    const store = createFavoriteAnimals(new MemoryKeyValueStorage());
    const client: FavoriteClient = {
      listFavoriteSpecies: listed,
      updateFavoriteSpecies: async () => list([3]),
    };
    function Pair() {
      const home = useFavoriteAnimals(client, store, false);
      const detail = useFavoriteAnimals(client, store, false);
      return <Text>{`${home.ids.join(',')}|${detail.ids.join(',')}`}</Text>;
    }
    const view = await render(<Pair />);
    expect(await view.findByText('3|3')).toBeTruthy();
    expect(listed).toHaveBeenCalledTimes(1);
  });

  it('un GET fallido conserva la copia y una sesión vencida la borra', async () => {
    const storage = new MemoryKeyValueStorage();
    const kept = createFavoriteAnimals(storage);
    await kept.writeCopy(['8']);
    const offline = await render(
      <Sheet
        client={{
          listFavoriteSpecies: async () => { throw new Error('red'); },
          updateFavoriteSpecies: async () => list([]),
        }}
        store={kept}
        offline={false}
        animalId="8"
      />,
    );
    expect(await offline.findByLabelText('Quitar Lobo de favoritos')).toBeTruthy();

    const expired = createFavoriteAnimals(new MemoryKeyValueStorage());
    await expired.writeCopy(['3']);
    const gone = await render(
      <Sheet
        client={{
          listFavoriteSpecies: async () => { throw apiError(401, 'La sesión ya no es válida.'); },
          updateFavoriteSpecies: async () => list([]),
        }}
        store={expired}
        offline={false}
        animalId="3"
      />,
    );
    expect(await gone.findByLabelText('Marcar Jaguar como favorito')).toBeTruthy();
    expect(gone.queryByText('La sesión ya no es válida.')).toBeNull();
  });

  it('la subida con 401 olvida las claves y un segundo montaje no vuelve a pedir la lista', async () => {
    const storage = new MemoryKeyValueStorage();
    await storage.setItem('visitor.favorite-animal-ids', JSON.stringify(['4']));
    const store = createFavoriteAnimals(storage);
    const update = jest.fn(async () => { throw apiError(401, 'La sesión ya no es válida.'); });
    const listed = jest.fn(async () => list([]));
    function Readout({
      client,
      target,
    }: {
      client: FavoriteClient;
      target: ReturnType<typeof createFavoriteAnimals>;
    }) {
      const state = useFavoriteAnimals(client, target, false);
      return <Text>{state.ids.join(',') || 'vacio'}</Text>;
    }
    const first = await render(
      <Readout client={{ listFavoriteSpecies: listed, updateFavoriteSpecies: update }} target={store} />,
    );
    expect(await first.findByText('vacio')).toBeTruthy();
    expect(update).toHaveBeenCalledWith(4, true);
    expect(await storage.getItem('visitor.favorite-species-ids')).toBeNull();
  });

  it('el PUT con sesión vencida o sin red no mueve el corazón', async () => {
    function Readout({
      client,
      target,
    }: {
      client: FavoriteClient;
      target: ReturnType<typeof createFavoriteAnimals>;
    }) {
      const state = useFavoriteAnimals(client, target, false);
      return (
        <Text onPress={() => { void state.toggle('3'); }}>
          {`${state.ids.join(',') || 'vacio'}|${state.error ?? ''}`}
        </Text>
      );
    }
    const expired = await render(
      <Readout
        client={{
          listFavoriteSpecies: async () => list([3]),
          updateFavoriteSpecies: async () => { throw apiError(401, 'La sesión ya no es válida.'); },
        }}
        target={createFavoriteAnimals(new MemoryKeyValueStorage())}
      />,
    );
    await fireEvent.press(await expired.findByText('3|'));
    expect(await expired.findByText('vacio|')).toBeTruthy();

    const dropped = await render(
      <Readout
        client={{
          listFavoriteSpecies: async () => list([3]),
          updateFavoriteSpecies: async () => { throw apiError(0, ''); },
        }}
        target={createFavoriteAnimals(new MemoryKeyValueStorage())}
      />,
    );
    await fireEvent.press(await dropped.findByText('3|'));
    expect(await dropped.findByText('3|Sin conexión.')).toBeTruthy();
  });

  it('ignora un id que no es entero y un valor guardado que no es lista', async () => {
    const storage = new MemoryKeyValueStorage();
    const store = createFavoriteAnimals(storage);
    await storage.setItem('visitor.favorite-species-ids', '{');
    expect(await store.readCopy()).toEqual([]);
    await storage.setItem('visitor.favorite-species-ids', JSON.stringify({ id: '3' }));
    expect(await store.readCopy()).toEqual([]);
    await storage.setItem('visitor.favorite-species-ids', JSON.stringify(['3', 8]));
    expect(await store.readCopy()).toEqual(['3']);

    const shown = createFavoriteAnimals(new MemoryKeyValueStorage());
    const client: FavoriteClient = {
      listFavoriteSpecies: async () => ({ data: [{ id: 3 }, { id: 3.5 }] }),
      updateFavoriteSpecies: async () => list([3]),
    };
    function Readout() {
      const state = useFavoriteAnimals(client, shown, false);
      return <Text>{state.ids.join(',') || 'vacio'}</Text>;
    }
    const view = await render(<Readout />);
    expect(await view.findByText('3')).toBeTruthy();
  });

  it('arma el cliente solo cuando hay dirección y renueva o cierra la sesión', async () => {
    expect(createFavoriteSpeciesClient()).toBeNull();
    expect(createFavoriteSpeciesClient({ workerId: undefined, apiUrl: '  ' })).toBeNull();
    const tokens = createMemoryTokenStorage();
    await tokens.write({ accessToken: 'viejo', refreshToken: 'refresco' });
    const queue = [
      () => jsonResponse(401, { message: 'Unauthenticated.' }),
      () => jsonResponse(200, { data: { token_type: 'Bearer', expires_in: 900, access_token: 'nuevo', refresh_token: 'otro' } }),
      () => jsonResponse(200, { data: [] }),
      () => jsonResponse(401, { message: 'Unauthenticated.' }),
      () => jsonResponse(200, { data: { token_type: 'Bearer', expires_in: 900, access_token: 'nuevo-2' } }),
      () => jsonResponse(200, { data: [] }),
      () => jsonResponse(401, { message: 'Unauthenticated.' }),
      () => jsonResponse(401, { message: 'vencida' }),
    ];
    const fetchImpl = jest.fn(async () => {
      const next = queue.shift();
      if (!next) throw new Error('sin respuesta');
      return next();
    });
    const client = createFavoriteSpeciesClient({
      workerId: undefined,
      apiUrl: 'https://api.pruebas.invalid',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      storage: tokens,
    });
    expect(client).not.toBeNull();
    await client?.listFavoriteSpecies();
    expect(await tokens.read()).toEqual({ accessToken: 'nuevo', refreshToken: 'otro' });
    await client?.listFavoriteSpecies();
    expect(await tokens.read()).toEqual({ accessToken: 'nuevo-2', refreshToken: 'otro' });
    await expect(client?.listFavoriteSpecies()).rejects.toThrow();
    expect(await tokens.read()).toBeNull();
  });

  it('CA-04: un 401 de un token anterior conserva la sesión nueva y la copia de favoritos', async () => {
    const tokens = createMemoryTokenStorage();
    await tokens.write({ accessToken: 'anterior', refreshToken: 'refresh-anterior' });
    const renewed = { accessToken: 'vigente', refreshToken: 'refresh-vigente' };
    const clearIfCurrent = tokens.clearIfCurrent;
    jest.spyOn(tokens, 'clearIfCurrent').mockImplementationOnce(async (accessToken) => {
      await tokens.write(renewed);
      return clearIfCurrent(accessToken);
    });
    const clearFavorites = jest.spyOn(favoriteAnimals, 'clearAll');
    const fetchImpl = jest.fn(async () => jsonResponse(401, { message: 'vencida' }));
    const client = createFavoriteSpeciesClient({
      apiUrl: 'https://api.pruebas.invalid',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      storage: tokens,
    });

    try {
      await expect(client?.listFavoriteSpecies()).rejects.toMatchObject({ status: 401 });
      expect(await tokens.read()).toEqual(renewed);
      expect(clearFavorites).not.toHaveBeenCalled();
    } finally {
      clearFavorites.mockRestore();
    }
  });

  it('CA-04: el cliente usa Secure Store y omite la renovación cuando no hay sesión guardada', async () => {
    await favoriteAnimals.writeCopy(['3']);
    const fetchImpl = jest.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(new Headers(init?.headers).has('Authorization')).toBe(false);
      return jsonResponse(401, { message: 'vencida' });
    });
    const client = createFavoriteSpeciesClient({
      apiUrl: 'https://api.pruebas.invalid',
      fetchImpl,
    });

    await expect(client?.listFavoriteSpecies()).rejects.toMatchObject({ status: 401 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    await expect(favoriteAnimals.readCopy()).resolves.toEqual([]);
  });
});
