import React from 'react';
import { View, StyleSheet, ScrollView, StyleProp, ViewStyle, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { BusyOverlay } from './StateViews';

interface ScreenContainerProps {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  busyMessage?: string | null;
}

export function ScreenContainer({ children, scroll = true, contentStyle, busyMessage }: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const safeAreaStyle = {
    ...styles.safeArea,
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };

  const body = scroll ? (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, contentStyle]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
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
