import { useCallback, useEffect, useState } from 'react';
import type { VisitorNotificationPreferences } from '@arca/api-client';
import {
  preparePushRegistration,
  type PushNotificationsPort,
} from '../push/pushRegistration';
import {
  readNotificationPreferences,
  rememberNotificationPreferences,
} from '../push/notificationPreferences';

export type NotificationClient = {
  getNotificationPreferences: () => Promise<VisitorNotificationPreferences>;
  updateNotificationPreferences: (
    patch: Partial<VisitorNotificationPreferences>,
  ) => Promise<VisitorNotificationPreferences>;
  registerPushToken: (token: string) => Promise<unknown>;
  deletePushToken: (token: string) => Promise<unknown>;
};

export type NotificationKey = 'news_and_events' | 'memory_status';

const initial: VisitorNotificationPreferences = {
  news_and_events: false,
  memory_status: true,
};

export function useNotificationPreferences(
  client: NotificationClient | null,
  port: PushNotificationsPort | null,
) {
  const [preferences, setPreferences] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [deniedMessage, setDeniedMessage] = useState<string | null>(null);

  const registerIfNeeded = useCallback(async (next: VisitorNotificationPreferences) => {
    if (!client || !port) return;
    if (!next.news_and_events && !next.memory_status) return;
    const result = await preparePushRegistration(client, port);
    setDeniedMessage(result.deniedMessage);
  }, [client, port]);

  useEffect(() => {
    if (!client) return;
    let active = true;
    void readNotificationPreferences(client).then((loaded) => {
      if (!active) return;
      setPreferences(loaded);
      if (loaded.memory_status || loaded.news_and_events) {
        void registerIfNeeded(loaded);
      }
    }).catch(() => {
      if (active) setError('No se pudieron leer los avisos.');
    });
    return () => {
      active = false;
    };
  }, [client, registerIfNeeded]);

  const toggle = useCallback(async (key: NotificationKey, value: boolean) => {
    if (!client) return;
    const previous = preferences;
    const optimistic = { ...previous, [key]: value };
    setPreferences(optimistic);
    setError(null);
    try {
      const saved = await client.updateNotificationPreferences({ [key]: value });
      rememberNotificationPreferences(saved);
      setPreferences(saved);
      if (value) await registerIfNeeded(saved);
    } catch {
      setPreferences(previous);
      setError('No se pudo guardar el aviso. Inténtalo de nuevo.');
    }
  }, [client, preferences, registerIfNeeded]);

  return { preferences, error, deniedMessage, toggle };
}
