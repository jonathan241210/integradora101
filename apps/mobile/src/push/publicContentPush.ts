import { readPushData } from './openPush';

let pending = false;
const listeners = new Set<() => void>();

export function signalPublicContentPush(payload: unknown): void {
  const { type, id } = readPushData(payload);
  if ((type !== 'news' && type !== 'event') || !id || !/^[1-9]\d*$/.test(id)) return;

  pending = listeners.size === 0;
  listeners.forEach((listener) => listener());
}

export function listenForPublicContentPush(listener: () => void): () => void {
  listeners.add(listener);
  if (pending) {
    pending = false;
    listener();
  }
  return () => { listeners.delete(listener); };
}
