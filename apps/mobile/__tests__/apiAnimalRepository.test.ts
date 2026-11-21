import { ApiAnimalRepository } from '../src/repositories/apiAnimalRepository';
import { defaultStorage } from '../src/repositories/storage';
import type { HttpClient } from '@arca/api-client';

describe('ApiAnimalRepository (mobile-003: api-read-integration)', () => {
  let mockHttpClient: jest.Mocked<HttpClient>;

  beforeEach(async () => {
    await defaultStorage.clear();
    mockHttpClient = {
      request: jest.fn(),
      get: jest.fn(),
      post: jest.fn(),
      delete: jest.fn(),
      setOnUnauthorized: jest.fn(),
    };
  });

  it('CA-01: should fetch and map species list from API using camelCase format', async () => {
    const apiPayload = {
      data: [
        {
          id: 1,
          common_name: 'Jaguar',
          scientific_name: 'Panthera onca',
          category: 'mammal',
          image_url: 'https://images.unsplash.com/jaguar.jpg',
          zone_name: 'Selva',
          placeholder_tint: '#8A9A5B',
          size_cm: 180,
          longevity: '15 años',
          diet_description: 'Carnívoro estricto',
          characteristics: 'Manchas en roseta',
          fun_fact: 'Es el felino más grande de América',
        },
      ],
    };

    mockHttpClient.get.mockImplementation(async (path: string) => {
      if (path === '/published-species') return { data: [{ id: 1 }] };
      if (path === '/enclosures') {
        return { data: [{ animals: [{ species_id: 1, can_receive_visits: true }] }] };
      }
      return apiPayload;
    });
    const repository = new ApiAnimalRepository(mockHttpClient, defaultStorage);

    const animals = await repository.getAllAnimals();

    expect(mockHttpClient.get).toHaveBeenCalledWith('/species');
    expect(animals).toHaveLength(1);
    const animal = animals[0];
    expect(animal.id).toBe('1');
    expect(animal.commonName).toBe('Jaguar');
    expect(animal.scientificName).toBe('Panthera onca');
    expect(animal.category).toBe('mammals');
    expect(animal.zone).toBe('Selva');
    expect(animal.imageUrl).toBe('https://images.unsplash.com/jaguar.jpg');
    expect(animal.isDiscovered).toBe(false);
    expect(animal.stats?.size).toBe('180 cm');
    expect(animal.funFact).toBe('Es el felino más grande de América');
  });

  it.each([null, 'sin-foto', 'https://[invalid'])(
    'CA-01 / CA-02 / CA-06: usa la foto publicada en catálogo y ficha si image_url es %s',
    async (imageUrl) => {
      const species = { id: 9, common_name: 'Llama', scientific_name: 'Lama glama', image_url: imageUrl };
      const expected = 'https://photos.example.test/llama.jpg';
      mockHttpClient.get.mockImplementation(async (path: string) => {
        if (path === '/published-species') {
          return { data: [{ id: 9, image_url: expected }] };
        }
        if (path === '/enclosures') {
          return { data: [{ animals: [{ species_id: 9, can_receive_visits: 1 }] }] };
        }
        return { data: path === '/species' ? [species] : species };
      });
      const repository = new ApiAnimalRepository(mockHttpClient, defaultStorage);
      expect((await repository.getAnimalById('9'))?.imageUrl).toBe(expected);
      expect((await repository.getAllAnimals())[0]?.imageUrl).toBe(expected);

      await defaultStorage.removeItem('@arca:cache:species:9');
      mockHttpClient.get.mockClear();
      expect((await repository.getAnimalById('9'))?.imageUrl).toBe(expected);
      expect(mockHttpClient.get.mock.calls).toEqual([['/species/9']]);

      mockHttpClient.get.mockClear();
      expect((await repository.getAnimalById('9'))?.imageUrl).toBe(expected);
      expect(mockHttpClient.get).not.toHaveBeenCalled();

      await defaultStorage.setItem('@arca:cache:species:9', JSON.stringify({
        data: { id: '9', commonName: 'Llama' },
        cachedAt: Date.now(),
        ttlMs: 300_000,
      }));
      expect((await repository.getAnimalById('9'))?.imageUrl).toBe(expected);
    },
  );

  it('CA-05: conserva la lista anterior al actualizar offline y la reemplaza al recuperar conexión', async () => {
    const previous = [{ id: '9', commonName: 'Llama' }];
    await defaultStorage.setItem('@arca:cache:species_list', JSON.stringify({
      data: previous,
      cachedAt: Date.now(),
      ttlMs: 300_000,
    }));
    mockHttpClient.get.mockRejectedValue(new Error('offline'));
    const repository = new ApiAnimalRepository(mockHttpClient, defaultStorage);

    expect(await repository.getAllAnimals()).toEqual(previous);
    expect(await repository.fetchAndCacheAllAnimals()).toEqual(previous);

    const publishedImage = 'https://photos.example.test/llama.jpg';
    mockHttpClient.get.mockImplementation(async (path: string) => {
      if (path === '/published-species') {
        return { data: [{ id: 9, image_url: publishedImage }] };
      }
      if (path === '/enclosures') {
        return { data: [{ animals: [{ species_id: 9, can_receive_visits: 1 }] }] };
      }
      return {
        data: [{ id: 9, common_name: 'Llama', scientific_name: 'Lama glama', category: 'mammal' }],
      };
    });
    expect((await repository.fetchAndCacheAllAnimals())[0]?.imageUrl).toBe(publishedImage);
    expect((await repository.getAllAnimals())[0]?.imageUrl).toBe(publishedImage);
  });

  it('CA-02: should fetch species detail by ID or return null on 404', async () => {
    const detailPayload = {
      data: {
        id: 2,
        common_name: 'Guacamaya Verde',
        scientific_name: 'Ara militaris',
        category: 'bird',
        image_url: 'https://images.unsplash.com/macaw.jpg',
        zone_name: 'Aviario',
      },
    };

    mockHttpClient.get.mockImplementation(async (path: string) => {
      if (path === '/published-species') return { data: [{ id: 2 }] };
      if (path === '/enclosures') {
        return { data: [{ animals: [{ species_id: 2, can_receive_visits: true }] }] };
      }
      if (path === '/species/999') {
        const error404: Error & { status?: number } = new Error('Not found');
        error404.status = 404;
        throw error404;
      }
      return detailPayload;
    });
    const repository = new ApiAnimalRepository(mockHttpClient, defaultStorage);

    const animal = await repository.getAnimalById('2');

    expect(mockHttpClient.get).toHaveBeenCalledWith('/species/2');
    expect(animal).not.toBeNull();
    expect(animal?.id).toBe('2');
    expect(animal?.commonName).toBe('Guacamaya Verde');
    expect(animal?.category).toBe('birds');

    const missingAnimal = await repository.getAnimalById('999');
    expect(missingAnimal).toBeNull();
  });

  it('CA-02 / CA-05: acepta los IDs en la caché anterior de visibilidad si falla su renovación', async () => {
    const visibility = {
      data: ['2'],
      cachedAt: Date.now(),
      ttlMs: 300_000,
    };
    await defaultStorage.setItem('@arca:cache:visitor_species_ids', JSON.stringify(visibility));
    mockHttpClient.get.mockImplementation(async (path: string) => {
      if (path === '/species/2') {
        return { data: { id: 2, common_name: 'Guacamaya', scientific_name: 'Ara militaris' } };
      }
      throw new Error('offline');
    });

    const repository = new ApiAnimalRepository(mockHttpClient, defaultStorage);
    expect((await repository.getAnimalById('2'))?.commonName).toBe('Guacamaya');
    mockHttpClient.get.mockClear();
    expect((await repository.getAnimalById('2'))?.commonName).toBe('Guacamaya');
    expect(mockHttpClient.get).not.toHaveBeenCalled();

    await defaultStorage.setItem('@arca:cache:visitor_species_ids', JSON.stringify({ ...visibility, data: [] }));
    expect(await repository.getAnimalById('2')).toBeNull();

    await defaultStorage.removeItem('@arca:cache:species:2');
    await defaultStorage.setItem('@arca:cache:visitor_species_ids', JSON.stringify({ ...visibility, ttlMs: 0 }));
    await expect(repository.getAnimalById('2')).rejects.toThrow('offline');
  });

  it('CA-05: should return cached data immediately and revalidate in background when TTL > 5 mins', async () => {
    const initialPayload = {
      data: [
        {
          id: 1,
          common_name: 'León Africano',
          scientific_name: 'Panthera leo',
          category: 'mammal',
        },
      ],
    };

    const updatedPayload = {
      data: [
        {
          id: 1,
          common_name: 'León Africano Renovado',
          scientific_name: 'Panthera leo',
          category: 'mammal',
        },
      ],
    };
    let speciesReads = 0;
    mockHttpClient.get.mockImplementation(async (path: string) => {
      if (path === '/published-species') return { data: [{ id: 1 }] };
      if (path === '/enclosures') {
        return { data: [{ animals: [{ species_id: 1, can_receive_visits: true }] }] };
      }
      speciesReads += 1;
      return speciesReads === 1 ? initialPayload : updatedPayload;
    });
    const repository = new ApiAnimalRepository(mockHttpClient, defaultStorage, 5 * 60 * 1000);

    // 1. Primera consulta: puebla la caché
    const firstCall = await repository.getAllAnimals();
    expect(firstCall[0].commonName).toBe('León Africano');
    expect(mockHttpClient.get).toHaveBeenCalledTimes(3);

    // 2. Segunda consulta inmediata: sirve desde caché fresca sin nueva llamada HTTP
    const secondCall = await repository.getAllAnimals();
    expect(secondCall[0].commonName).toBe('León Africano');
    expect(mockHttpClient.get).toHaveBeenCalledTimes(3);

    // 3. Simular datos stale (> 5 minutos)
    const rawCache = await defaultStorage.getItem('@arca:cache:species_list_v2');
    if (rawCache) {
      const parsed = JSON.parse(rawCache);
      parsed.cachedAt = Date.now() - 6 * 60 * 1000; // 6 minutos atrás
      await defaultStorage.setItem('@arca:cache:species_list_v2', JSON.stringify(parsed));
    }

    const staleResult = await repository.getAllAnimals();
    expect(staleResult[0].commonName).toBe('León Africano');
    expect(mockHttpClient.get).toHaveBeenCalledTimes(6);
  });

  it('CA-05: dos lecturas a la vez comparten la misma petición de especies', async () => {
    let release: (value: { data: Array<{ id: number; common_name: string; scientific_name: string; category: string }> }) => void = () => undefined;
    mockHttpClient.get.mockImplementation((path: string) => {
      if (path === '/published-species') return Promise.resolve({ data: [{ id: 2 }] });
      if (path === '/enclosures') {
        return Promise.resolve({ data: [{ animals: [{ species_id: 2, can_receive_visits: 1 }] }] });
      }
      return new Promise((resolve) => {
        release = resolve;
      });
    });
    const first = new ApiAnimalRepository(mockHttpClient, defaultStorage);
    const second = new ApiAnimalRepository(mockHttpClient, defaultStorage);
    const pending = Promise.all([first.getAllAnimals(), second.getAllAnimals()]);
    await new Promise<void>((done) => {
      setImmediate(() => done());
    });
    expect(mockHttpClient.get).toHaveBeenCalledTimes(3);
    release({ data: [{ id: 2, common_name: 'Lobo', scientific_name: 'Canis lupus', category: 'mammal' }] });
    const [a, b] = await pending;
    expect(a[0].commonName).toBe('Lobo');
    expect(b[0].commonName).toBe('Lobo');
  });

  it('deja fuera especies sin publicar o sin animal que reciba visitas', async () => {
    const catalog = {
      data: [
        { id: 1, common_name: 'Jaguar', scientific_name: 'Panthera onca', category: 'mammal' },
        { id: 2, common_name: 'León', scientific_name: 'Panthera leo', category: 'mammal' },
        { id: 3, common_name: 'Borrador', scientific_name: 'Draftus', category: 'mammal' },
      ],
    };
    mockHttpClient.get.mockImplementation(async (path: string) => {
      if (path === '/published-species') return { data: [{ id: 1 }, { id: 2 }] };
      if (path === '/enclosures') {
        return {
          data: [{
            animals: [
              { species_id: 1, can_receive_visits: true },
              { species_id: 3, can_receive_visits: 1 },
              { species_id: 2, can_receive_visits: false },
            ],
          }],
        };
      }
      if (path === '/species/2') return { data: catalog.data[1] };
      return catalog;
    });
    const repository = new ApiAnimalRepository(mockHttpClient, defaultStorage);

    const animals = await repository.getAllAnimals();
    expect(animals.map((animal) => animal.commonName)).toEqual(['Jaguar']);
    expect(await repository.getAnimalById('2')).toBeNull();
  });

  it('CA-01 / CA-06: conserva las especies visitables cuando el catálogo incluye filas inválidas', async () => {
    const llama = { id: 1, common_name: 'Llama', scientific_name: 'Lama glama' };
    const jaguar = { id: 2, common_name: 'Jaguar', scientific_name: 'Panthera onca' };
    mockHttpClient.get.mockImplementation(async (path: string) => {
      if (path === '/published-species') {
        return [
          null,
          {},
          { id: null, image_url: 'https://img.test/sin-especie.jpg' },
          { id: 1, image_url: 'species/../llama.jpg' },
          { id: '2', image_url: 'https://img.test/jaguar.jpg' },
        ];
      }
      if (path === '/enclosures') {
        return [
          null,
          { animals: null },
          { animals: [null, {}, { species_id: 1, can_receive_visits: 1 }, { species_id: 2, can_receive_visits: true }] },
        ];
      }
      return [llama, jaguar];
    });

    const animals = await new ApiAnimalRepository(mockHttpClient, defaultStorage).getAllAnimals();

    expect(animals.map(({ id, imageUrl }) => [id, imageUrl])).toEqual([
      ['1', undefined],
      ['2', 'https://img.test/jaguar.jpg'],
    ]);
  });

  it('CA-02 / CA-05: oculta una ficha guardada cuando el catálogo renovado deja de publicar la especie', async () => {
    const llama = { id: 1, common_name: 'Llama', scientific_name: 'Lama glama' };
    let published = [{ id: 1 }];
    mockHttpClient.get.mockImplementation(async (path: string) => {
      if (path === '/published-species') return { data: published };
      if (path === '/enclosures') {
        return { data: [{ animals: [{ species_id: 1, can_receive_visits: true }] }] };
      }
      return { data: path === '/species/1' ? llama : [llama] };
    });

    const repository = new ApiAnimalRepository(mockHttpClient, defaultStorage);
    expect((await repository.getAnimalById('1'))?.commonName).toBe('Llama');

    published = [];
    expect(await repository.fetchAndCacheAllAnimals()).toEqual([]);
    mockHttpClient.get.mockClear();

    expect(await repository.getAnimalById('1')).toBeNull();
    expect(mockHttpClient.get).not.toHaveBeenCalled();
  });
});
