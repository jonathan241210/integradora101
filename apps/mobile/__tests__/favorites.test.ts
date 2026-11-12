import { MemoryKeyValueStorage } from '../src/repositories/storage';
import { createFavoriteAnimals } from '../src/repositories/favoriteAnimals';

describe('CA-16 favoritos en el teléfono', () => {
  it('guarda y quita el animal marcado', async () => {
    const favorites = createFavoriteAnimals(new MemoryKeyValueStorage());
    await expect(favorites.list()).resolves.toEqual([]);
    await expect(favorites.toggle('juan')).resolves.toEqual(['juan']);
    await expect(favorites.list()).resolves.toEqual(['juan']);
    await expect(favorites.toggle('juan')).resolves.toEqual([]);
  });
});
