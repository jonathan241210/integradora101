import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { VisitorFavoriteSpeciesList } from '@arca/api-client';
import { accountSession } from '../session/accountSession';
import {
  createFavoriteSpeciesClient,
  favoriteAnimals,
  type FavoriteStore,
} from '../repositories/favoriteAnimals';
import { useNetworkStatus } from './useNetworkStatus';

export type FavoriteClient = {
  listFavoriteSpecies: () => Promise<VisitorFavoriteSpeciesList>;
  updateFavoriteSpecies: (speciesId: number, favorite: boolean) => Promise<VisitorFavoriteSpeciesList>;
};

const OFFLINE_MESSAGE = 'Sin conexión.';
const SAVE_FAILED = 'No se pudo guardar el favorito.';
const listFlights = new WeakMap<FavoriteStore, Promise<boolean>>();

function isDigits(id: string): boolean {
  return /^\d+$/.test(id);
}

function idsFrom(body: VisitorFavoriteSpeciesList | null | undefined): string[] {
  const rows = Array.isArray(body?.data) ? body.data : [];
  return rows
    .map((row) => row?.id)
    .filter((id): id is number => typeof id === 'number' && Number.isInteger(id))
    .map((id) => String(id));
}

function statusOf(error: unknown): number | null {
  if (typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number') {
    return error.status;
  }
  return null;
}

function messageOf(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return SAVE_FAILED;
}

async function uploadLegacy(client: FavoriteClient, store: FavoriteStore): Promise<boolean> {
  let pending = await store.readLegacy();
  for (const id of pending.filter(isDigits)) {
    try {
      const body = await client.updateFavoriteSpecies(Number(id), true);
      pending = pending.filter((item) => item !== id);
      await store.writeLegacy(pending);
      await store.writeCopy(idsFrom(body));
    } catch (error) {
      if (statusOf(error) === 404) continue;
      if (statusOf(error) === 401) {
        await store.clearAll();
      }
      return true;
    }
  }
  return false;
}

async function synchronize(client: FavoriteClient, store: FavoriteStore): Promise<boolean> {
  const first = await client.listFavoriteSpecies();
  if (store.readerCount() === 0) return false;
  const rows = idsFrom(first);
  if (rows.length > 0) {
    await store.writeCopy(rows);
    await store.writeLegacy([]);
    store.markFresh();
    return true;
  }
  const stopped = await uploadLegacy(client, store);
  if (store.readerCount() === 0 || stopped) return false;
  const confirmed = await client.listFavoriteSpecies();
  if (store.readerCount() === 0) return false;
  const confirmedRows = idsFrom(confirmed);
  await store.writeCopy(confirmedRows);
  if (confirmedRows.length > 0) await store.writeLegacy([]);
  store.markFresh();
  return true;
}

export function animalsInFavoriteOrder<T extends { id: string }>(animals: T[], ids: string[]): T[] {
  return ids.flatMap((id) => {
    const animal = animals.find((item) => item.id === id);
    return animal ? [animal] : [];
  });
}

export function useFavoriteAnimals(
  client: FavoriteClient | null = null,
  store: FavoriteStore = favoriteAnimals,
  isOffline = false,
) {
  const [ids, setIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const flight = useRef(false);

  useEffect(() => {
    let active = true;
    store.retain();
    const unsubscribe = store.subscribe((next) => {
      if (active) setIds(next);
    });

    void load();

    return () => {
      active = false;
      store.release();
      unsubscribe();
    };

    async function load(): Promise<void> {
      if (!client) {
        if (active) {
          setIds([]);
          setError(null);
        }
        return;
      }
      if (isOffline) {
        store.forgetFresh();
        await store.readCopy();
        return;
      }
      if (store.isFresh()) {
        await store.readCopy();
        return;
      }
      let flight = listFlights.get(store);
      if (!flight) {
        flight = synchronize(client, store).finally(() => {
          if (listFlights.get(store) === flight) listFlights.delete(store);
        });
        listFlights.set(store, flight);
      }
      try {
        await flight;
        if (active) await store.readCopy();
      } catch (error) {
        if (!active) return;
        if (statusOf(error) === 401) {
          await store.clearAll();
          setError(null);
          return;
        }
        await store.readCopy();
      }
    }
  }, [client, isOffline, store]);

  const toggle = useCallback(async (id: string) => {
    if (!client || flight.current || !isDigits(id)) return;
    if (isOffline) {
      setError(OFFLINE_MESSAGE);
      return;
    }
    flight.current = true;
    setError(null);
    const favorite = !ids.includes(id);
    try {
      const body = await client.updateFavoriteSpecies(Number(id), favorite);
      await store.writeCopy(idsFrom(body));
    } catch (error) {
      if (statusOf(error) === 401) {
        await store.clearAll();
        setError(null);
        return;
      }
      if (statusOf(error) === 0) {
        setError(OFFLINE_MESSAGE);
        return;
      }
      setError(messageOf(error));
    } finally {
      flight.current = false;
    }
  }, [client, ids, isOffline, store]);

  return { ids, error, toggle };
}

export function useVisitorFavorites() {
  const { isOffline } = useNetworkStatus();
  const [sessionStatus, setSessionStatus] = useState(accountSession.getStatus());
  const client = useMemo(
    () => (sessionStatus === 'authenticated' ? createFavoriteSpeciesClient() : null),
    [sessionStatus],
  );

  useEffect(() => accountSession.subscribe(() => setSessionStatus(accountSession.getStatus())), []);

  return useFavoriteAnimals(client, favoriteAnimals, isOffline);
}
