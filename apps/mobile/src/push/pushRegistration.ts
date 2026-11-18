export const DENIED_NOTIFICATION_TEXT =
  'Los avisos del sistema están apagados. Actívalos en los ajustes del teléfono.';

export type PushPermission = { status: 'granted' | 'denied' | 'undetermined' };

export type DeliveredNotification = {
  title: string;
  body: string;
};

export type IncomingNotification = DeliveredNotification & {
  request?: { content?: { title?: string | null; body?: string | null } };
};

export type PushNotificationsPort = {
  androidVersion: number;
  getPermissionsAsync: () => Promise<PushPermission>;
  requestPermissionsAsync: () => Promise<PushPermission>;
  getExpoPushTokenAsync: () => Promise<{ data: string }>;
  setNotificationChannelAsync: (id: string, channel: { name: string }) => Promise<void>;
  setNotificationHandler: (handler: {
    handleNotification: (notification: IncomingNotification) => Promise<{
      shouldShowBanner: boolean;
      shouldShowList: boolean;
    }>;
  }) => void;
};

type TokenClient = {
  registerPushToken: (token: string) => Promise<unknown>;
  deletePushToken: (token: string) => Promise<unknown>;
};

let currentToken: string | null = null;
let deleteCurrent: ((token: string) => Promise<unknown>) | null = null;
let lastDelivered: DeliveredNotification | null = null;
let registrationFlight: Promise<{ registered: boolean; deniedMessage: string | null }> | null = null;

export function deliveredNotification(): DeliveredNotification | null {
  return lastDelivered;
}

export function resetPushRegistrationForTests(): void {
  currentToken = null;
  deleteCurrent = null;
  lastDelivered = null;
  registrationFlight = null;
}

export async function unregisterPushToken(): Promise<void> {
  if (!currentToken || !deleteCurrent) return;
  const token = currentToken;
  currentToken = null;
  await deleteCurrent(token);
}

export function preparePushRegistration(
  client: TokenClient,
  port: PushNotificationsPort,
): Promise<{ registered: boolean; deniedMessage: string | null }> {
  if (registrationFlight) return registrationFlight;
  const flight = registerPushOnce(client, port).finally(() => {
    if (registrationFlight === flight) registrationFlight = null;
  });
  registrationFlight = flight;
  return flight;
}

async function registerPushOnce(
  client: TokenClient,
  port: PushNotificationsPort,
): Promise<{ registered: boolean; deniedMessage: string | null }> {
  port.setNotificationHandler({
    handleNotification: async (notification) => {
      const content = notification.request?.content;
      lastDelivered = {
        title: content?.title ?? notification.title ?? '',
        body: content?.body ?? notification.body ?? '',
      };
      return { shouldShowBanner: true, shouldShowList: true };
    },
  });

  await port.setNotificationChannelAsync('news-and-events', { name: 'Noticias y eventos' });
  await port.setNotificationChannelAsync('memories', { name: 'Momentos' });

  const current = await port.getPermissionsAsync();
  let granted = current.status === 'granted';
  if (!granted && port.androidVersion >= 33) {
    const asked = await port.requestPermissionsAsync();
    granted = asked.status === 'granted';
  }
  if (!granted) {
    return { registered: false, deniedMessage: DENIED_NOTIFICATION_TEXT };
  }

  const token = (await port.getExpoPushTokenAsync()).data;
  if (currentToken !== token) {
    await client.registerPushToken(token);
    currentToken = token;
  }
  deleteCurrent = client.deletePushToken;
  return { registered: true, deniedMessage: null };
}
