import { MemoryKeyValueStorage } from '../src/repositories/storage';
import { createFavoriteAnimals } from '../src/repositories/favoriteAnimals';

describe('CA-16 favoritos en el teléfono', () => {
  it('guarda y quita el animal marcado', async () => {
    const favorites = createFavoriteAnimals(new MemoryKeyValueStorage());
    const seen: string[][] = [];
    const unsubscribe = favorites.subscribe((next) => seen.push(next));
    await expect(favorites.list()).resolves.toEqual([]);
    await expect(favorites.toggle('juan')).resolves.toEqual(['juan']);
    await expect(favorites.list()).resolves.toEqual(['juan']);
    await expect(favorites.toggle('juan')).resolves.toEqual([]);
    unsubscribe();
    await favorites.toggle('simba');
    expect(seen).toEqual([['juan'], []]);
  });

  it('ignora un valor guardado que no es una lista de identificadores', async () => {
    const storage = new MemoryKeyValueStorage();
    await storage.setItem('visitor.favorite-animal-ids', JSON.stringify({ id: 'juan' }));
    const objectValue = createFavoriteAnimals(storage);
    await expect(objectValue.list()).resolves.toEqual([]);

    await storage.setItem('visitor.favorite-animal-ids', JSON.stringify(['juan', 4, null]));
    const mixed = createFavoriteAnimals(storage);
    await expect(mixed.list()).resolves.toEqual(['juan']);
  });
});
