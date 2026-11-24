const FIVE_MINUTES_MS = 5 * 60 * 1000;
const MAX_BYTES = 2_000_000;
const MAX_ENTRIES = 12;

type Entry = { uri: string; at: number };

const entries = new Map<string, Entry>();
const flights = new Map<string, Promise<string>>();

export function resetMediaImageCacheForTests(): void {
  entries.clear();
  flights.clear();
}

function remember(remote: string, uri: string): string {
  if (entries.has(remote)) entries.delete(remote);
  entries.set(remote, { uri, at: Date.now() });
  while (entries.size > MAX_ENTRIES) {
    const oldest = entries.keys().next().value;
    if (oldest === undefined) break;
    entries.delete(oldest);
  }
  return uri;
}

function fresh(remote: string): string | null {
  const hit = entries.get(remote);
  if (!hit) return null;
  if (Date.now() - hit.at >= FIVE_MINUTES_MS) {
    entries.delete(remote);
    return null;
  }
  return hit.uri;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return globalThis.btoa(binary);
}

/** Reuses a photo for 5 minutes. A forced call downloads it again. */
export async function retainMediaUri(remote: string, force = false): Promise<string> {
  if (!remote.startsWith('http')) return remote;
  if (!force) {
    const hit = fresh(remote);
    if (hit) return hit;
    const pending = flights.get(remote);
    if (pending) return pending;
  } else {
    entries.delete(remote);
  }

  const flight = (async () => {
    const response = await fetch(remote);
    if (!response.ok) return remote;
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_BYTES) return remote;
    const type = response.headers.get('content-type')?.split(';')[0]?.trim() || 'image/jpeg';
    return remember(remote, `data:${type};base64,${bytesToBase64(new Uint8Array(buffer))}`);
  })().catch(() => remote).finally(() => {
    flights.delete(remote);
  });
  flights.set(remote, flight);
  return flight;
}
