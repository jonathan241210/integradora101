import { createVisitorApi } from '@arca/api-client';
import { createSecureTokenStorage } from '../services/tokenStorage';
import { createDevicePushPort } from './devicePush';
import { readNotificationPreferences } from './notificationPreferences';
import { preparePushRegistration } from './pushRegistration';

export async function syncVisitorPush(): Promise<void> {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL?.trim() ?? '';
  if (!baseUrl || process.env.JEST_WORKER_ID !== undefined) return;
  const storage = createSecureTokenStorage();
  const client = createVisitorApi({
    baseUrl,
    getAccessToken: async () => (await storage.read())?.accessToken ?? null,
    getRefreshToken: async () => (await storage.read())?.refreshToken ?? null,
    onTokens: async (tokens) => {
      const current = await storage.read();
      await storage.write({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? current?.refreshToken ?? '',
      });
    },
    onSessionExpired: async (accessToken) => {
      await storage.clearIfCurrent(accessToken);
    },
  });
  try {
    const loaded = await readNotificationPreferences(client);
    if (!loaded.news_and_events && !loaded.memory_status) return;
    await preparePushRegistration(client, createDevicePushPort());
  } catch {
    // Ajustes vuelve a intentarlo y muestra el error.
  }
}
