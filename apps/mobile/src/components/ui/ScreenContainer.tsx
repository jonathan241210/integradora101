import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, StyleProp, ViewStyle, KeyboardAvoidingView, Keyboard, Platform, TextInput, Dimensions, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { BusyOverlay } from './StateViews';

function useAndroidKeyboardOverlap(bottomInset: number): { open: boolean; extra: number } {
  const [overlap, setOverlap] = useState({ open: false, extra: 0 });
  const baseline = useRef(Dimensions.get('window').height);
  const keyboardTop = useRef<number | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;

    const recompute = () => {
      if (keyboardTop.current == null) {
        setOverlap({ open: false, extra: 0 });
        return;
      }
      const covered = Math.max(0, Dimensions.get('screen').height - keyboardTop.current);
      const shrunk = Math.max(0, baseline.current - Dimensions.get('window').height);
      setOverlap({ open: true, extra: Math.max(0, covered - shrunk - bottomInset) });
    };

    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      keyboardTop.current = event.endCoordinates.screenY;
      recompute();
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardTop.current = null;
      baseline.current = Dimensions.get('window').height;
      setOverlap({ open: false, extra: 0 });
    });
    const dimensions = Dimensions.addEventListener('change', recompute);
    return () => {
      show.remove();
      hide.remove();
      dimensions.remove();
    };
  }, [bottomInset]);

  return Platform.OS === 'android' ? overlap : { open: false, extra: 0 };
}

type MeasurableInput = {
  measureInWindow?: (callback: (x: number, y: number, width: number, height: number) => void) => void;
};

function revealFocusedField(scroll: ScrollView | null, offsetY: number, visibleBottom: number): void {
  const focused = TextInput.State.currentlyFocusedInput?.() as MeasurableInput | null;
  if (!scroll || typeof focused?.measureInWindow !== 'function') return;
  focused.measureInWindow((_x, y, _width, height) => {
    const overlap = y + height + 20 - visibleBottom;
    if (overlap > 0) scroll.scrollTo({ y: offsetY + overlap, animated: true });
  });
}

interface ScreenContainerProps {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  busyMessage?: string | null;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function ScreenContainer({ children, scroll = true, contentStyle, busyMessage, refreshing = false, onRefresh }: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const keyboard = useAndroidKeyboardOverlap(insets.bottom);
  const keyboardHeight = keyboard.extra;
  const scrollRef = useRef<ScrollView>(null);
  const offsetRef = useRef(0);

  useEffect(() => {
    if (!scroll || keyboardHeight === 0) return undefined;
    const visibleBottom = Dimensions.get('window').height - insets.bottom - keyboardHeight;
    const timer = setTimeout(() => revealFocusedField(scrollRef.current, offsetRef.current, visibleBottom), 80);
    return () => clearTimeout(timer);
  }, [insets.bottom, keyboardHeight, scroll]);
  const safeAreaStyle = {
    ...styles.safeArea,
    paddingTop: insets.top,
    paddingBottom: keyboard.open ? 0 : insets.bottom,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };

  const body = scroll ? (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        ref={scrollRef}
        style={[styles.container, keyboardHeight > 0 ? { marginBottom: keyboardHeight } : null]}
        contentContainerStyle={[styles.scrollContent, contentStyle]}
        showsVerticalScrollIndicator={false}
        refreshControl={onRefresh ? (
          <RefreshControl
            testID="home-refresh"
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
            progressBackgroundColor={theme.colors.surface}
            accessibilityLabel="Actualizar noticias y eventos"
          />
        ) : undefined}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={(event) => {
          offsetRef.current = event.nativeEvent.contentOffset.y;
        }}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  ) : (
    <View style={[styles.container, contentStyle]}>
      {children}
    </View>
  );

  return (
    <View style={safeAreaStyle}>
      {body}
      {busyMessage ? <BusyOverlay message={busyMessage} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xxl,
  },
});
