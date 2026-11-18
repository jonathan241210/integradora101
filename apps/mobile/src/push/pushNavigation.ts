import { Alert } from 'react-native';
import { createHttpClient } from '@arca/api-client';
import { openPush, readPushData } from './openPush';

type PushResponse = {
  notification?: {
    request?: {
      identifier?: string;
      content?: {
        data?: unknown;
      };
    };
  };
};

type PushSubscription = { remove: () => void };

export async function publicDetailExists(type: 'news' | 'event', id: string): Promise<boolean> {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL?.trim() ?? '';
  if (!baseUrl) return true;
  try {
    const response = await createHttpClient({ baseUrl }).get<{ data?: unknown }>(
      `/${type === 'news' ? 'news' : 'events'}/${id}`,
    );
    return Boolean(response?.data);
  } catch (error) {
    return (error as { status?: number }).status !== 404;
  }
}

export async function followPushResponse(response: PushResponse | null): Promise<void> {
  if (!response) return;
  const message = await openPush(
    readPushData(response.notification?.request?.content?.data),
    pushRouter,
    publicDetailExists,
  );
  if (message) Alert.alert(message);
}

let lastHandled = '';

function responseKey(response: PushResponse): string {
  const request = response.notification?.request;
  return `${request?.identifier ?? ''}:${JSON.stringify(request?.content?.data ?? {})}`;
}

const pushRouter = {
  push(href: { pathname: string; params: { id: string } }) {
    routerRef?.push(href);
  },
  replace(href: string) {
    routerRef?.replace(href);
  },
};

let routerRef: {
  push: (href: { pathname: string; params: { id: string } }) => void;
  replace: (href: string) => void;
} | null = null;

export function listenForPushOpens(router: {
  push: (href: { pathname: string; params: { id: string } }) => void;
  replace: (href: string) => void;
}): () => void {
  routerRef = router;
  const notifications = require('expo-notifications') as {
    addNotificationResponseReceivedListener: (listener: (response: PushResponse) => void) => PushSubscription;
    getLastNotificationResponse: () => PushResponse | null;
    clearLastNotificationResponseAsync: () => Promise<void>;
  };

  const handle = (response: PushResponse | null) => {
    if (!response) return;
    const key = responseKey(response);
    if (key === lastHandled) return;
    lastHandled = key;
    void followPushResponse(response).finally(() => {
      void notifications.clearLastNotificationResponseAsync();
    });
  };

  const subscription = notifications.addNotificationResponseReceivedListener(handle);
  handle(notifications.getLastNotificationResponse());
  return () => subscription.remove();
}
