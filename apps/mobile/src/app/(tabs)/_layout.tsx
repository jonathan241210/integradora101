import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { AppTabBar } from '../../components/AppTabBar';
import { goBackWithinTabs, isVisitorTabRoot, notePathname } from '../../navigation/tabBack';

export default function VisitorTabsLayout() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    notePathname(pathname);
  }, [pathname]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isVisitorTabRoot(pathname)) return false;
      goBackWithinTabs(router);
      return true;
    });
    return () => subscription.remove();
  }, [pathname, router]);

  return (
    <Tabs
      backBehavior="none"
      tabBar={({ state, navigation }) => <AppTabBar state={state} navigation={navigation} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="map" options={{ title: 'Mapa' }} />
      <Tabs.Screen name="scan" options={{ title: 'Escanear' }} />
      <Tabs.Screen name="collection" options={{ title: 'Colección' }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
      <Tabs.Screen name="search" options={{ href: null }} />
      <Tabs.Screen name="game" options={{ href: null }} />
      <Tabs.Screen name="tour-3d" options={{ href: null }} />
      <Tabs.Screen name="event-detail" options={{ href: null }} />
      <Tabs.Screen name="mission-detail" options={{ href: null }} />
      <Tabs.Screen name="achievements" options={{ href: null }} />
      <Tabs.Screen name="achievement-detail" options={{ href: null }} />
      <Tabs.Screen name="qr-result" options={{ href: null }} />
      <Tabs.Screen name="qr-invalid" options={{ href: null }} />
      <Tabs.Screen name="qr-already-discovered" options={{ href: null }} />
      <Tabs.Screen name="scan-result" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="account" options={{ href: null }} />
      <Tabs.Screen name="account-settings" options={{ href: null }} />
      <Tabs.Screen name="change-password" options={{ href: null }} />
      <Tabs.Screen name="delete-account" options={{ href: null }} />
      <Tabs.Screen name="privacy" options={{ href: null }} />
      <Tabs.Screen name="help" options={{ href: null }} />
      <Tabs.Screen name="about" options={{ href: null }} />
    </Tabs>
  );
}
