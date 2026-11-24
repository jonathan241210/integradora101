import { ApiZooRepository } from '../src/repositories/apiZooRepository';
import { defaultStorage, MemoryKeyValueStorage } from '../src/repositories/storage';
import type { HttpClient } from '@arca/api-client';

describe('ApiZooRepository (mobile-003: api-read-integration)', () => {
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

  it('CA-03: should fetch and map events list and event detail by ID', async () => {
    const eventsPayload = {
      data: [
        {
          id: 1,
          name: 'Plática Educativa de Felinos',
          start_date: '2026-10-25',
          start_time: '12:00:00',
          location: 'Recinto de Felinos Mayores',
          description: 'Aprende sobre la conservación del jaguar.',
          image_path: 'https://images.unsplash.com/event1.jpg',
        },
      ],
    };

    mockHttpClient.get.mockResolvedValueOnce(eventsPayload);
    const repository = new ApiZooRepository(mockHttpClient, defaultStorage);

    const events = await repository.getEvents();

    expect(mockHttpClient.get).toHaveBeenCalledWith('/events?limit=3');
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe('1');
    expect(events[0].title).toBe('Plática Educativa de Felinos');
    expect(events[0].date).toBe('2026-10-25');
    expect(events[0].time).toBe('12:00 hrs');
    expect(events[0].location).toBe('Recinto de Felinos Mayores');
    expect(events[0].imageUrls).toEqual(['https://images.unsplash.com/event1.jpg']);

    // Detalle individual
    const detailPayload = {
      data: {
        id: 1,
        title: 'Plática Educativa de Felinos',
        date: '2026-10-25',
        time: '12:00 hrs',
        location: 'Recinto de Felinos Mayores',
        description: 'Descripción extendida del evento educativo.',
        image_urls: ['https://images.unsplash.com/event1_detail.jpg'],
      },
    };

    mockHttpClient.get.mockResolvedValueOnce(detailPayload);
    const detail = await repository.getEventById('1');

    expect(mockHttpClient.get).toHaveBeenCalledWith('/events/1');
    expect(detail).not.toBeNull();
    expect(detail?.title).toBe('Plática Educativa de Felinos');
    expect(detail?.description).toBe('Descripción extendida del evento educativo.');
  });

  it('CA-05: should fallback to cached events when network call fails', async () => {
    const initialPayload = {
      data: [
        {
          id: 10,
          name: 'Taller Infantil de Huellas',
          date: '2026-11-01',
          time: '15:00 hrs',
          location: 'Aula Educativa',
          description: 'Taller de huellas.',
        },
      ],
    };

    mockHttpClient.get.mockResolvedValueOnce(initialPayload);
    const repository = new ApiZooRepository(mockHttpClient, defaultStorage);

    // 1. Guardar en caché
    const firstCall = await repository.getEvents();
    expect(firstCall).toHaveLength(1);

    // 2. Simular fallo de red en la siguiente llamada
    mockHttpClient.get.mockRejectedValueOnce(new Error('Network error: connection refused'));

    // Debe entregar los datos de la caché sin lanzar excepción
    const fallbackCall = await repository.getEvents();
    expect(fallbackCall).toHaveLength(1);
    expect(fallbackCall[0].title).toBe('Taller Infantil de Huellas');
  });

  it('CA-09: should fetch a news detail by id', async () => {
    mockHttpClient.get.mockResolvedValueOnce({
      data: {
        id: 25,
        title: 'Aviso de hoy',
        published_date: '2026-11-10',
        content: 'Texto completo de la noticia.',
        image_url: 'http://localhost/storage/news/aviso.jpg',
      },
    });
    const repository = new ApiZooRepository(mockHttpClient, defaultStorage);
    const detail = await repository.getNewsById('25');

    expect(mockHttpClient.get).toHaveBeenCalledWith('/news/25');
    expect(detail?.title).toBe('Aviso de hoy');
    expect(detail?.content).toBe('Texto completo de la noticia.');
    expect(detail?.date).toBe('10 de noviembre de 2026');

    mockHttpClient.get.mockResolvedValueOnce({
      data: {
        id: 25,
        title: 'Aviso actualizado',
        published_date: '2026-11-10',
        content: 'Texto nuevo.',
        image_url: 'http://localhost:8000/media/news/aviso.jpg',
      },
    });
    const reloaded = await repository.reloadNewsById('25');
    expect(reloaded?.title).toBe('Aviso actualizado');
    expect(reloaded?.imageUrl).toContain('/media/news/aviso.jpg');
  });

  it('CA-05: entrega las listas vencidas y publica los resultados de la revalidación', async () => {
    const responses = (suffix: string) => async (path: string) => ({
      data: path.startsWith('/news')
        ? [{ id: 1, title: `Noticia ${suffix}` }]
        : [{ id: 2, name: `Evento ${suffix}`, start_date: '2026-11-25' }],
    });
    mockHttpClient.get.mockImplementation(responses('anterior') as HttpClient['get']);
    const repository = new ApiZooRepository(mockHttpClient, new MemoryKeyValueStorage(), 0);
    await repository.getNews();
    await repository.getEvents();

    mockHttpClient.get.mockImplementation(responses('nuevo') as HttpClient['get']);
    const onNews = jest.fn();
    const onEvents = jest.fn();
    const [cachedNews, cachedEvents] = await Promise.all([
      repository.getNews(onNews),
      repository.getEvents(onEvents),
    ]);
    expect(cachedNews[0].title).toBe('Noticia anterior');
    expect(cachedEvents[0].title).toBe('Evento anterior');
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(onNews).toHaveBeenCalledWith([expect.objectContaining({ title: 'Noticia nuevo' })]);
    expect(onEvents).toHaveBeenCalledWith([expect.objectContaining({ title: 'Evento nuevo' })]);
  });

  it('CA-11 y mobile-013 CA-14: respeta la caché fresca en primer plano y consulta la red por push o actualización manual', async () => {
    mockHttpClient.get.mockImplementation(async (path: string) => {
      if (String(path).startsWith('/news')) {
        return { data: [{ id: 1, title: 'Noticia en caché', description: 'Antes' }] };
      }
      return { data: [{ id: 2, name: 'Evento en caché', start_date: '2026-11-10', location: 'Plaza' }] };
    });
    const repository = new ApiZooRepository(mockHttpClient, defaultStorage);
    await repository.getNews();
    await repository.getEvents();
    const callsBeforeRefresh = mockHttpClient.get.mock.calls.length;

    mockHttpClient.get.mockImplementation(async (path: string) => {
      if (String(path).startsWith('/news')) {
        return { data: [{ id: 3, title: 'Noticia nueva', description: 'Ahora' }] };
      }
      return { data: [{ id: 4, name: 'Evento nuevo', start_date: '2026-11-11', location: 'Jardín' }] };
    });

    expect((await repository.getNews())[0].title).toBe('Noticia en caché');
    const unchanged = await repository.refreshNewsAndEvents('stale');
    expect(unchanged.news[0].title).toBe('Noticia en caché');
    expect(mockHttpClient.get).toHaveBeenCalledTimes(callsBeforeRefresh);
    const pushed = await repository.refreshNewsAndEvents('push');
    expect(pushed.news[0].title).toBe('Noticia nueva');
    expect(pushed.events[0].title).toBe('Evento nuevo');
    const callsAfterPush = mockHttpClient.get.mock.calls.length;
    const fresh = await repository.refreshNewsAndEvents();

    expect(mockHttpClient.get).toHaveBeenCalledTimes(callsAfterPush + 2);
    expect(fresh.news[0].title).toBe('Noticia nueva');
    expect(fresh.events[0].title).toBe('Evento nuevo');
    expect(mockHttpClient.get).toHaveBeenCalledWith('/news?limit=3');
    expect(mockHttpClient.get).toHaveBeenCalledWith('/events?limit=3');
  });
});
