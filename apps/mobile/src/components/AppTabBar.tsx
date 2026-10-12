import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../theme/tokens';
import { AppText, Icon } from './ui';

type TabKey = 'index' | 'map' | 'scan' | 'collection' | 'profile';

interface AppTabBarProps {
  state: {
    index: number;
    routes: { key: string; name: string }[];
  };
  navigation: {
    navigate: (routeName: string) => void;
  };
}

const tabs: { key: TabKey; label: string; icon: string; activeIcon: string }[] = [
  { key: 'index', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { key: 'map', label: 'Mapa', icon: 'location-outline', activeIcon: 'location' },
  { key: 'scan', label: 'Escanear', icon: 'camera-outline', activeIcon: 'camera' },
  { key: 'collection', label: 'Colección', icon: 'bookmark-outline', activeIcon: 'bookmark' },
  { key: 'profile', label: 'Perfil', icon: 'person-outline', activeIcon: 'person' },
];

const activeTabByRoute: Record<string, TabKey> = {
  index: 'index',
  map: 'map',
  scan: 'scan',
  collection: 'collection',
  profile: 'profile',
  search: 'index',
  game: 'index',
  'event-detail': 'index',
  'mission-detail': 'index',
  achievements: 'index',
  'achievement-detail': 'index',
  'tour-3d': 'map',
  'qr-result': 'scan',
  'qr-invalid': 'scan',
  'qr-already-discovered': 'scan',
};

export function AppTabBar({ state, navigation }: AppTabBarProps) {
  const insets = useSafeAreaInsets();
  const currentRoute = state.routes[state.index]?.name ?? 'index';
  const activeTab = activeTabByRoute[currentRoute] ?? 'index';

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {tabs.map((tab) => {
        const selected = tab.key === activeTab;
        return (
          <Pressable
            key={tab.key}
            testID={`tab-${tab.key}`}
            onPress={() => navigation.navigate(tab.key)}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected }}
            style={styles.item}
          >
            <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>
              <Icon
                name={selected ? tab.activeIcon : tab.icon}
                size={22}
                color={selected ? colors.primary : colors.textMuted}
              />
            </View>
            <AppText variant="caption" bold={selected} color={selected ? 'primary' : 'textMuted'}>
              {tab.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  item: { flex: 1, alignItems: 'center', gap: 2, minHeight: 48 },
  iconWrap: {
    width: 44,
    height: 30,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapSelected: { backgroundColor: colors.primarySoft },
});
