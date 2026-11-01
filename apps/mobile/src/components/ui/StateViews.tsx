import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Modal } from 'react-native';
import { AppText } from './AppText';
import { colors, spacing, radius } from '../../theme/tokens';

export interface LoadingViewProps {
  message?: string;
}

export function BusyOverlay({ message }: { message: string }) {
  return (
    <Modal visible transparent statusBarTranslucent animationType="fade" onRequestClose={() => undefined}>
      <View style={styles.overlay} pointerEvents="auto" accessibilityViewIsModal>
        <LoadingView message={message} />
      </View>
    </Modal>
  );
}

export function LoadingView({ message = 'Cargando información del zoológico...' }: LoadingViewProps) {
  return (
    <View style={styles.centerContainer} accessibilityRole="progressbar" accessibilityLabel={message}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
}

export function TitledLoading({ title, message }: { title: string; message: string }) {
  return (
    <View style={styles.titledPage}>
      <AppText variant="title">{title}</AppText>
      <View style={styles.titledFill}>
        <LoadingView message={message} />
      </View>
    </View>
  );
}

export interface EmptyViewProps {
  title?: string;
  message?: string;
}

export function EmptyView({
  title = 'No hay elementos disponibles',
  message = 'En este momento no hay información para mostrar.',
}: EmptyViewProps) {
  return (
    <View style={styles.centerContainer} accessibilityRole="text">
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
    </View>
  );
}

export interface ErrorViewProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorView({
  title = 'No fue posible cargar la información',
  message = 'Tuvimos un problema al conectar con el zoológico. Revisa tu conexión e intenta de nuevo.',
  onRetry,
  retryLabel = 'Reintentar',
}: ErrorViewProps) {
  return (
    <View style={styles.centerContainer} accessibilityRole="alert">
      <Text style={styles.errorTitle}>{title}</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      {onRetry && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
        >
          <Text style={styles.retryButtonText}>{retryLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titledPage: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  titledFill: {
    flex: 1,
    justifyContent: 'center',
  },
  centerContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.danger,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  retryButtonText: {
    color: colors.textOnPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
});
