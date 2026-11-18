import type { VisitorNotificationPreferences } from '@arca/api-client';

type Reader = {
  getNotificationPreferences: () => Promise<VisitorNotificationPreferences>;
};

let cached: VisitorNotificationPreferences | null = null;
let flight: Promise<VisitorNotificationPreferences> | null = null;

export function rememberNotificationPreferences(value: VisitorNotificationPreferences): void {
  cached = value;
}

export function clearNotificationPreferences(): void {
  cached = null;
  flight = null;
}

export function readNotificationPreferences(client: Reader): Promise<VisitorNotificationPreferences> {
  if (cached) return Promise.resolve(cached);
  if (flight) return flight;
  const pending = client.getNotificationPreferences().then((value) => {
    cached = value;
    return value;
  }).finally(() => {
    if (flight === pending) flight = null;
  });
  flight = pending;
  return pending;
}
