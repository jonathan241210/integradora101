import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme/tokens';
import {
  AppText,
  BackButton,
  Button,
  Card,
  Icon,
  ImageOrPlaceholder,
  LocationPill,
  OfflineBanner,
  SectionTitle,
  Stat,
} from '../components/ui';
import { Animal } from '../models';

interface AnimalDetailProps {
  animal: Animal | null;
  loading?: boolean;
  error?: string | null;
  isOffline?: boolean;
  onRetry?: () => void;
  onBackPress?: () => void;
  onNavigatePress?: () => void;
}

export function AnimalDetailScreen({
  animal,
  loading = false,
  error = null,
  isOffline = false,
  onBackPress,
  onNavigatePress,
}: AnimalDetailProps) {
  const insets = useSafeAreaInsets();

  if (loading) {
    return (
      <View style={[styles.center, { marginTop: insets.top }]}>
        <AppText variant="body" center>Cargando información del animal…</AppText>
      </View>
    );
  }

  if (error || !animal) {
    return (
      <View style={[styles.center, { marginTop: insets.top }]}>
        <AppText variant="body" center>No se encontró el animal.</AppText>
        {onBackPress && <BackButton onPress={onBackPress} />}
      </View>
    );
  }

  const isDiscovered = Boolean(animal.isDiscovered);
  const stats = [
    { label: 'Peso', value: animal.stats?.avgWeight?.trim() },
    { label: 'Tamaño', value: animal.stats?.size?.trim() },
    { label: 'Vida', value: animal.stats?.lifeExpectancy?.trim() },
  ].filter((stat): stat is { label: string; value: string } => Boolean(stat.value));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {isOffline && <OfflineBanner />}
        <View>
          <ImageOrPlaceholder
            source={animal.imageUrl?.trim() ? { uri: animal.imageUrl.trim() } : null}
            tint={animal.placeholderTint}
            style={styles.heroImage}
            blurRadius={isDiscovered ? 0 : 16}
          />
          {!isDiscovered && (
            <>
              <View pointerEvents="none" style={styles.lockedImageShade} />
              <View style={styles.lockedImageOverlay}>
                <Icon name="lock" size={32} color={colors.textOnPrimary} />
                <AppText variant="small" bold color="textOnPrimary">Animal por descubrir</AppText>
              </View>
            </>
          )}
          {onBackPress && (
            <View style={[styles.topActions, { top: insets.top + spacing.sm }]}>
              <BackButton onPress={onBackPress} />
            </View>
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.titleGroup}>
            <AppText variant="title">
              {animal.nickname} — {animal.commonName}
            </AppText>
            {isDiscovered && animal.scientificName ? (
              <AppText variant="small" color="textMuted" style={{ fontStyle: 'italic' }}>
                {animal.scientificName}
              </AppText>
            ) : null}
          </View>

          <LocationPill label={animal.zone} variant="filled" />
          <AppText variant="caption" color={isDiscovered ? 'primary' : 'textMuted'}>
            {isDiscovered ? 'Descubierto' : 'Por descubrir'}
          </AppText>

          {isDiscovered ? (
            <>
              {stats.length > 0 ? (
                <Card style={styles.card}>
                  <SectionTitle icon="information-circle-outline" text="Características" />
                  <View style={styles.statsRow}>
                    {stats.map((stat) => (
                      <Stat key={stat.label} label={stat.label} value={stat.value} />
                    ))}
                  </View>
                </Card>
              ) : null}

              <Card style={styles.card}>
                <SectionTitle icon="restaurant-outline" text="Alimentación" />
                <AppText variant="small" color="textMuted">{animal.diet}</AppText>
              </Card>

              <Card style={styles.card}>
                <SectionTitle icon="sparkles-outline" text="Curiosidades" />
                <AppText variant="small" color="textMuted">{animal.curiosities}</AppText>
              </Card>
              {onNavigatePress && <Button label="Ir Ahora (Navegar)" onPress={onNavigatePress} />}
            </>
          ) : (
            <Card style={styles.lockedCard}>
              <SectionTitle icon="sparkles-outline" text="Un secreto por descubrir" />
              <AppText variant="body" color="textMuted">
                Escanea el código QR de este hábitat para conocer sus características y curiosidades.
              </AppText>
              {onNavigatePress && <Button label="Escanear QR para descubrir" onPress={onNavigatePress} />}
            </Card>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  heroImage: { width: '100%', height: 280 },
  lockedImageShade: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: colors.text, opacity: 0.35 },
  lockedImageOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  topActions: { position: 'absolute', left: spacing.lg },
  content: { padding: spacing.lg, gap: spacing.md },
  titleGroup: { gap: 2 },
  card: { gap: spacing.md },
  lockedCard: { gap: spacing.md, backgroundColor: colors.surface },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
