import { resetMediaImageCacheForTests, retainMediaUri } from '../src/services/mediaImageCache';

describe('CA-05 y CA-11 fotos de noticias y eventos', () => {
  const remote = 'http://192.168.1.75:8000/media/news/foto.jpg';

  beforeEach(() => {
    resetMediaImageCacheForTests();
  });

  it('reutiliza la foto durante 5 minutos y la vuelve a pedir si se fuerza', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      headers: { get: () => 'image/jpeg' },
      arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer,
    }));
    const previous = globalThis.fetch;
    globalThis.fetch = fetchMock as typeof fetch;
    try {
      const first = await retainMediaUri(remote);
      const second = await retainMediaUri(remote);
      expect(second).toBe(first);
      expect(first.startsWith('data:image/jpeg;base64,')).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const forced = await retainMediaUri(remote, true);
      expect(forced.startsWith('data:image/jpeg;base64,')).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      globalThis.fetch = previous;
    }
  });

  it('descarta fotos viejas o demasiado grandes y comparte la descarga en curso', async () => {
    const previous = globalThis.fetch;
    const now = jest.spyOn(Date, 'now');
    try {
      now.mockReturnValue(1_000);
      expect(await retainMediaUri('/local.jpg')).toBe('/local.jpg');

      let release: (value: Response) => void = () => undefined;
      const pending = new Promise<Response>((resolve) => { release = resolve; });
      const shared = 'http://192.168.1.75:8000/media/news/compartida.jpg';
      globalThis.fetch = jest.fn(() => pending) as typeof fetch;
      const first = retainMediaUri(shared);
      const second = retainMediaUri(shared);
      release({
        ok: true,
        headers: { get: () => null },
        arrayBuffer: async () => Uint8Array.from([4, 5]).buffer,
      } as Response);
      expect(await first).toBe(await second);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);

      globalThis.fetch = jest.fn(async () => { throw new Error('red'); }) as typeof fetch;
      expect(await retainMediaUri('http://192.168.1.75:8000/media/news/caida.jpg')).toBe('http://192.168.1.75:8000/media/news/caida.jpg');

      globalThis.fetch = jest.fn(async () => ({
        ok: false,
        headers: { get: () => 'image/png' },
        arrayBuffer: async () => new ArrayBuffer(0),
      })) as typeof fetch;
      expect(await retainMediaUri('http://192.168.1.75:8000/media/news/no.jpg')).toBe('http://192.168.1.75:8000/media/news/no.jpg');

      globalThis.fetch = jest.fn(async () => ({
        ok: true,
        headers: { get: () => 'image/png' },
        arrayBuffer: async () => new ArrayBuffer(0),
      })) as typeof fetch;
      expect(await retainMediaUri('http://192.168.1.75:8000/media/news/vacia.jpg')).toBe('http://192.168.1.75:8000/media/news/vacia.jpg');

      globalThis.fetch = jest.fn(async () => ({
        ok: true,
        headers: { get: () => 'image/png' },
        arrayBuffer: async () => new ArrayBuffer(2_000_001),
      })) as typeof fetch;
      expect(await retainMediaUri('http://192.168.1.75:8000/media/news/grande.jpg')).toBe('http://192.168.1.75:8000/media/news/grande.jpg');

      const wide = new Uint8Array(40_000);
      globalThis.fetch = jest.fn(async () => ({
        ok: true,
        headers: { get: () => 'image/webp' },
        arrayBuffer: async () => wide.buffer,
      })) as typeof fetch;
      for (let index = 0; index < 13; index += 1) {
        await retainMediaUri(`http://192.168.1.75:8000/media/news/${index}.jpg`);
      }
      now.mockReturnValue(1_000 + 5 * 60 * 1000);
      globalThis.fetch = jest.fn(async () => ({
        ok: true,
        headers: { get: () => 'image/jpeg' },
        arrayBuffer: async () => Uint8Array.from([9]).buffer,
      })) as typeof fetch;
      const renewed = await retainMediaUri('http://192.168.1.75:8000/media/news/1.jpg');
      expect(renewed.startsWith('data:image/jpeg;base64,')).toBe(true);
    } finally {
      now.mockRestore();
      globalThis.fetch = previous;
    }
  });
});
