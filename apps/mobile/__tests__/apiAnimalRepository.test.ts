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

    mockHttpClient.get.mockResolvedValueOnce(apiPayload);
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

    mockHttpClient.get.mockResolvedValueOnce(detailPayload);
    const repository = new ApiAnimalRepository(mockHttpClient, defaultStorage);

    const animal = await repository.getAnimalById('2');

    expect(mockHttpClient.get).toHaveBeenCalledWith('/species/2');
    expect(animal).not.toBeNull();
    expect(animal?.id).toBe('2');
    expect(animal?.commonName).toBe('Guacamaya Verde');
    expect(animal?.category).toBe('birds');

    // Caso 404: debe retornar null elegantemente sin lanzar excepción
    const error404: any = new Error('Not found');
    error404.status = 404;
    mockHttpClient.get.mockRejectedValueOnce(error404);

    const missingAnimal = await repository.getAnimalById('999');
    expect(missingAnimal).toBeNull();
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

    mockHttpClient.get.mockResolvedValueOnce(initialPayload);
    const repository = new ApiAnimalRepository(mockHttpClient, defaultStorage, 5 * 60 * 1000);

    // 1. Primera consulta: puebla la caché
    const firstCall = await repository.getAllAnimals();
    expect(firstCall[0].commonName).toBe('León Africano');
    expect(mockHttpClient.get).toHaveBeenCalledTimes(1);

    // 2. Segunda consulta inmediata: sirve desde caché fresca sin nueva llamada HTTP
    const secondCall = await repository.getAllAnimals();
    expect(secondCall[0].commonName).toBe('León Africano');
    expect(mockHttpClient.get).toHaveBeenCalledTimes(1);

    // 3. Simular datos stale (> 5 minutos)
    const rawCache = await defaultStorage.getItem('@arca:cache:species_list');
    if (rawCache) {
      const parsed = JSON.parse(rawCache);
      parsed.cachedAt = Date.now() - 6 * 60 * 1000; // 6 minutos atrás
      await defaultStorage.setItem('@arca:cache:species_list', JSON.stringify(parsed));
    }

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
    mockHttpClient.get.mockResolvedValueOnce(updatedPayload);

    // Debe retornar inmediatamente los datos stale y disparar revalidación en segundo plano
    const staleResult = await repository.getAllAnimals();
    expect(staleResult[0].commonName).toBe('León Africano');
    expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
  });
});
