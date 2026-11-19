import { listAnimals, listEnclosures, listSpecies, syncBootstrap, syncChanges, type SyncBootstrapResponse, type SyncChangesResponse } from '@/services/apiClient';
import { offlineDb } from './db';
import { nowIso } from './utils';

function normalizeDate(value: string | null | undefined): string | null {
  if (!value) return null;
  return value;
}

async function upsertAnimals(userScope: string, animals: SyncBootstrapResponse['animals'] | SyncChangesResponse['animals']) {
  for (const animal of animals) {
    if (animal.deleted_at) {
      await offlineDb.animalsCatalog.delete([userScope, animal.id] as any);
      continue;
    }
    await offlineDb.animalsCatalog.put({
      userScope,
      serverId: animal.id,
      tagNumber: animal.tag_number,
      name: animal.name,
      sex: animal.sex,
      birthDate: animal.birth_date ?? null,
      stayStatus: animal.stay_status,
      species: animal.species ?? null,
      updatedAt: normalizeDate(animal.updated_at),
      deletedAt: null,
    } as any);
  }
}

async function upsertEnclosures(userScope: string, enclosures: SyncBootstrapResponse['enclosures'] | SyncChangesResponse['enclosures']) {
  for (const enclosure of enclosures) {
    if (enclosure.deleted_at) {
      await offlineDb.enclosuresCatalog.delete([userScope, enclosure.id] as any);
      continue;
    }
    await offlineDb.enclosuresCatalog.put({
      userScope,
      serverId: enclosure.id,
      name: enclosure.name,
      updatedAt: normalizeDate(enclosure.updated_at),
      deletedAt: null,
    } as any);
  }
}

async function upsertSpecies(userScope: string, species: SyncBootstrapResponse['species'] | SyncChangesResponse['species']) {
  for (const item of species) {
    if (item.deleted_at) {
      await offlineDb.speciesCatalog.delete([userScope, item.id] as any);
      continue;
    }
    await offlineDb.speciesCatalog.put({
      userScope,
      serverId: item.id,
      commonName: item.common_name,
      updatedAt: normalizeDate(item.updated_at),
      deletedAt: null,
    } as any);
  }
}

export async function bootstrapCatalogs(userScope: string): Promise<void> {
  try {
    const data = await syncBootstrap();
    await offlineDb.transaction('rw', [offlineDb.animalsCatalog, offlineDb.enclosuresCatalog, offlineDb.speciesCatalog, offlineDb.meta], async () => {
      await offlineDb.animalsCatalog.where('userScope').equals(userScope).delete();
      await offlineDb.enclosuresCatalog.where('userScope').equals(userScope).delete();
      await offlineDb.speciesCatalog.where('userScope').equals(userScope).delete();
      await upsertAnimals(userScope, data.animals);
      await upsertEnclosures(userScope, data.enclosures);
      await upsertSpecies(userScope, data.species);
      await offlineDb.meta.put({
        id: userScope,
        userScope,
        lastSyncAt: nowIso(),
        bootstrappedAt: nowIso(),
        cursor: data.cursor ?? data.server_time,
      } as any);
    });
    return;
  } catch {
    // Fallback a endpoints legacy si el endpoint de sync no está disponible.
    const [animals, enclosures, species] = await Promise.all([
      listAnimals(''),
      listEnclosures(),
      listSpecies(),
    ]);
    await offlineDb.transaction('rw', [offlineDb.animalsCatalog, offlineDb.enclosuresCatalog, offlineDb.speciesCatalog, offlineDb.meta], async () => {
      await offlineDb.animalsCatalog.where('userScope').equals(userScope).delete();
      await offlineDb.enclosuresCatalog.where('userScope').equals(userScope).delete();
      await offlineDb.speciesCatalog.where('userScope').equals(userScope).delete();
      await offlineDb.animalsCatalog.bulkPut(animals.map((animal) => ({
        userScope,
        serverId: animal.id,
        tagNumber: animal.tag_number,
        name: animal.name,
        sex: animal.sex,
        birthDate: animal.birth_date,
        stayStatus: animal.stay_status,
        species: animal.species,
        deletedAt: null,
      } as any)));
      await offlineDb.enclosuresCatalog.bulkPut(enclosures.map((enclosure) => ({
        userScope,
        serverId: enclosure.id,
        name: enclosure.name,
        deletedAt: null,
      } as any)));
      await offlineDb.speciesCatalog.bulkPut(species.map((item) => ({
        userScope,
        serverId: item.id,
        commonName: item.common_name,
        deletedAt: null,
      } as any)));
      await offlineDb.meta.put({
        id: userScope,
        userScope,
        lastSyncAt: nowIso(),
        bootstrappedAt: nowIso(),
      } as any);
    });
  }
}

export async function applyDeltaSync(userScope: string): Promise<void> {
  const meta = await offlineDb.meta.get(userScope);
  const cursor = meta?.cursor;
  const data = await syncChanges(cursor);
  await offlineDb.transaction('rw', [offlineDb.animalsCatalog, offlineDb.enclosuresCatalog, offlineDb.speciesCatalog, offlineDb.meta], async () => {
    await upsertAnimals(userScope, data.animals);
    await upsertEnclosures(userScope, data.enclosures);
    await upsertSpecies(userScope, data.species);
    await offlineDb.meta.put({
      ...(meta ?? { id: userScope, userScope }),
      id: userScope,
      userScope,
      lastSyncAt: nowIso(),
      cursor: data.cursor ?? meta?.cursor,
    } as any);
  });
}

export async function getCachedAnimals(userScope: string, search = '') {
  const query = search.trim().toLowerCase();
  const items = await offlineDb.animalsCatalog.where('userScope').equals(userScope).and((a) => !a.deletedAt).toArray();
  const filtered = query
    ? items.filter((a) => [a.name, a.tagNumber, a.species ?? ''].some((v) => v.toLowerCase().includes(query)))
    : items;
  return filtered.sort((a, b) => a.name.localeCompare(b.name)).map((a) => ({
    id: a.serverId,
    tag_number: a.tagNumber,
    name: a.name,
    sex: a.sex,
    birth_date: a.birthDate,
    stay_status: a.stayStatus,
    species: a.species,
  }));
}

export async function getCachedEnclosures(userScope: string) {
  const items = await offlineDb.enclosuresCatalog.where('userScope').equals(userScope).and((e) => !e.deletedAt).toArray();
  return items.sort((a, b) => a.name.localeCompare(b.name)).map((e) => ({ id: e.serverId, name: e.name }));
}

export async function getCachedSpecies(userScope: string) {
  const items = await offlineDb.speciesCatalog.where('userScope').equals(userScope).and((s) => !s.deletedAt).toArray();
  return items.sort((a, b) => a.commonName.localeCompare(b.commonName)).map((s) => ({ id: s.serverId, common_name: s.commonName }));
}

export async function getCachedAnimalProfile(userScope: string, id: number) {
  // Perfil completo: intento online se hace en capa superior; aquí devolvemos mínimo desde catálogo si existe.
  const animal = await offlineDb.animalsCatalog.get([userScope, id]);
  if (!animal) return null;
  return {
    id: animal.serverId,
    tag_number: animal.tagNumber,
    name: animal.name,
    sex: animal.sex,
    birth_date: animal.birthDate,
    origin: null,
    characteristics: null,
    entry_date: null,
    stay_status: animal.stayStatus,
    enclosure: null,
    photo_path: null,
    species: animal.species ? { common_name: animal.species, scientific_name: null, category: null, conservation_status: null, habitat: null, feeding: null, longevity: null, reproduction: null } : null,
    evaluations: [],
    __fromCache: true,
  };
}

export async function hasBootstrap(userScope: string): Promise<boolean> {
  const meta = await offlineDb.meta.get(userScope);
  return Boolean(meta?.bootstrappedAt);
}