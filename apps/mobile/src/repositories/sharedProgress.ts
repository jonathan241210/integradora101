import type { ProgressRepository, ProgressSnapshot } from './progressRepository';

type SharedRead = {
  repository: ProgressRepository;
  snapshot: ProgressSnapshot | null;
  flight: Promise<ProgressSnapshot> | null;
};

let shared: SharedRead | null = null;
let generation = 0;

export function sharedProgressGeneration(): number {
  return generation;
}

export function peekSharedProgress(repository: ProgressRepository): ProgressSnapshot | null {
  if (shared?.repository !== repository) return null;
  return shared.snapshot;
}

export function clearSharedProgress(): void {
  generation += 1;
  shared = null;
}

export function readSharedProgress(repository: ProgressRepository, force = false): Promise<ProgressSnapshot> {
  if (!force && shared?.repository === repository) {
    if (shared.flight) return shared.flight;
    if (shared.snapshot) return Promise.resolve(shared.snapshot);
  }

  const previous = shared?.repository === repository ? shared.snapshot : null;
  const flight = repository.load().then(
    (snapshot) => {
      if (shared?.flight === flight) {
        shared = { repository, snapshot, flight: null };
      }
      return snapshot;
    },
    (error: unknown) => {
      if (shared?.flight === flight) {
        shared = previous ? { repository, snapshot: previous, flight: null } : null;
      }
      throw error;
    },
  );

  shared = { repository, snapshot: previous, flight };
  return flight;
}
