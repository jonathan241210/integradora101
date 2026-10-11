import { Tabs } from 'expo-router';
import { AppTabBar } from '../../components/AppTabBar';

export default function VisitorTabsLayout() {
  return (
    <Tabs
      backBehavior="history"
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
    </Tabs>
  );
}
