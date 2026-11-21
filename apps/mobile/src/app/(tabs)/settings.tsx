import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { SettingsScreen } from '../../screens/SettingsScreen';
import { goBackWithinTabs } from '../../navigation/tabBack';
import { useVisitorPreferencesViewModel } from '../../viewmodels/useAccessViewModels';
import { useCameraPermissionSetting } from '../../viewmodels/useCameraPermissionSetting';
import { useLocationPermissionSetting } from '../../viewmodels/useLocationPermissionSetting';
import { useAccountSession } from '../../viewmodels/useAccountSession';
import { useVisitorProfile } from '../../viewmodels/useVisitorProfile';
import { useNotificationPreferences } from '../../viewmodels/useNotificationPreferences';
import { createVisitorApi } from '@arca/api-client';
import { createSecureTokenStorage } from '../../services/tokenStorage';
import { createDevicePushPort } from '../../push/devicePush';

export default function SettingsRoute() {
  const router = useRouter();
  const { preferences, setPreference } = useVisitorPreferencesViewModel();
  const camera = useCameraPermissionSetting();
  const location = useLocationPermissionSetting();
  const { logout } = useAccountSession();
  const { profile, loading } = useVisitorProfile();
  const notificationApi = useMemo(() => notificationClient(), []);
  const pushPort = useMemo(() => devicePushPort(), []);
  const notifications = useNotificationPreferences(notificationApi, pushPort);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  return (
    <SettingsScreen
      accountName={profile?.firstName ?? ''}
      accountEmail={profile?.email ?? ''}
      accountBusy={loading && !profile}
      preferences={preferences}
      onToggle={setPreference}
      cameraGranted={camera.granted}
      cameraReady={camera.ready}
      onCameraToggle={(enabled) => { void camera.onToggle(enabled); }}
      locationGranted={location.granted}
      locationReady={location.ready}
      onLocationToggle={(enabled) => { void location.onToggle(enabled); }}
      onAccountPress={() => router.push('/account-settings')}
      onPrivacyPress={() => router.push('/privacy')}
      onHelpPress={() => router.push('/help')}
      onAboutPress={() => router.push('/about')}
      onLogout={() => {
        if (inFlight.current) return;
        inFlight.current = true;
        setBusy(true);
        void logout()
          .then(() => router.replace('/login'))
          .finally(() => {
            inFlight.current = false;
            setBusy(false);
          });
      }}
      onBackPress={() => goBackWithinTabs(router)}
      newsAndEvents={notifications.preferences.news_and_events}
      memoryStatus={notifications.preferences.memory_status}
      onNotificationToggle={(key, value) => { void notifications.toggle(key, value); }}
      notificationError={notifications.error}
      notificationDenied={notifications.deniedMessage}
      busy={busy}
    />
  );
}

function notificationClient() {
  if (process.env.JEST_WORKER_ID !== undefined) return null;
  const baseUrl = process.env.EXPO_PUBLIC_API_URL?.trim() ?? '';
  if (!baseUrl) return null;
  const storage = createSecureTokenStorage();
  return createVisitorApi({
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
}

function devicePushPort() {
  if (process.env.JEST_WORKER_ID !== undefined) return null;
  return createDevicePushPort();
}
