import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme/tokens';
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
  'scan-result': 'scan',
  settings: 'profile',
  account: 'profile',
  'account-settings': 'profile',
  'change-password': 'profile',
  'delete-account': 'profile',
  privacy: 'profile',
  help: 'profile',
  about: 'profile',
};

const INDICATOR = 36;
const SCAN_SCALE = 48 / INDICATOR;

export function AppTabBar({ state, navigation }: AppTabBarProps) {
  const insets = useSafeAreaInsets();
  const currentRoute = state.routes[state.index]?.name ?? 'index';
  const activeTab = activeTabByRoute[currentRoute] ?? 'index';
  const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.key === activeTab));
  const [barWidth, setBarWidth] = useState(0);
  const slide = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const placed = useRef(false);

  useEffect(() => {
    if (barWidth === 0) return;
    const slot = barWidth / tabs.length;
    const target = activeIndex * slot + (slot - INDICATOR) / 2;
    const nextScale = activeTab === 'scan' ? SCAN_SCALE : 1;
    if (!placed.current) {
      slide.setValue(target);
      scale.setValue(nextScale);
      placed.current = true;
      return;
    }
    Animated.parallel([
      Animated.timing(slide, { toValue: target, duration: 240, useNativeDriver: true }),
      Animated.timing(scale, { toValue: nextScale, duration: 240, useNativeDriver: true }),
    ]).start();
  }, [activeIndex, activeTab, barWidth, scale, slide]);

  return (
    <View
      onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.indicator,
          { backgroundColor: activeTab === 'scan' ? colors.secondary : colors.accent },
          { transform: [{ translateX: slide }, { scale }] },
        ]}
      />
      {tabs.map((tab) => {
        const selected = tab.key === activeTab;
        const onScan = tab.key === 'scan' && selected;
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
            <View style={styles.iconSlot}>
              <Icon
                name={selected ? tab.activeIcon : tab.icon}
                size={onScan ? 26 : 22}
                color={onScan ? colors.textOnSecondary : selected ? colors.secondary : colors.textMuted}
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
    borderTopColor: colors.secondary,
    paddingTop: spacing.sm,
  },
  item: { flex: 1, alignItems: 'center', gap: 2, minHeight: 48 },
  iconSlot: { height: 48, alignItems: 'center', justifyContent: 'center' },
  indicator: {
    position: 'absolute',
    top: spacing.sm + 6,
    left: 0,
    width: INDICATOR,
    height: INDICATOR,
    borderRadius: INDICATOR / 2,
  },
});
