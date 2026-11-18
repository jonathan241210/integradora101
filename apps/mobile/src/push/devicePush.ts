import { Platform } from 'react-native';
import type { PushNotificationsPort } from './pushRegistration';

export function createDevicePushPort(): PushNotificationsPort {
  const notifications = require('expo-notifications') as {
    getPermissionsAsync: () => Promise<{ status: string }>;
    requestPermissionsAsync: () => Promise<{ status: string }>;
    getExpoPushTokenAsync: () => Promise<{ data: string }>;
    setNotificationChannelAsync: (id: string, channel: { name: string; importance: number }) => Promise<void>;
    setNotificationHandler: PushNotificationsPort['setNotificationHandler'];
    AndroidImportance: { DEFAULT: number };
  };

  const asPermission = (status: string) => ({
    status: status === 'granted' || status === 'denied' ? status : 'undetermined' as const,
  });

  return {
    androidVersion: Platform.OS === 'android' ? Number(Platform.Version) : 0,
    getPermissionsAsync: async () => asPermission((await notifications.getPermissionsAsync()).status),
    requestPermissionsAsync: async () => asPermission((await notifications.requestPermissionsAsync()).status),
    getExpoPushTokenAsync: () => notifications.getExpoPushTokenAsync(),
    setNotificationChannelAsync: (id, channel) => notifications.setNotificationChannelAsync(id, {
      name: channel.name,
      importance: notifications.AndroidImportance.DEFAULT,
    }),
    setNotificationHandler: notifications.setNotificationHandler,
  };
}
