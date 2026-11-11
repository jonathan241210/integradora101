import React, { useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Modal, Image, useWindowDimensions, PanResponder, Animated } from 'react-native';
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

function formatDiscoveredAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
}

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
  const [photoOpen, setPhotoOpen] = useState(false);

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
  const photo = animal.imageUrl?.trim() ? { uri: animal.imageUrl.trim() } : null;
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
          <Pressable
            disabled={!isDiscovered || !photo}
            accessibilityRole={isDiscovered && photo ? 'imagebutton' : undefined}
            accessibilityLabel={isDiscovered && photo ? `Ver foto de ${animal.commonName}` : undefined}
            onPress={() => setPhotoOpen(true)}
          >
            <ImageOrPlaceholder
              source={photo}
              tint={animal.placeholderTint}
              style={styles.heroImage}
              blurRadius={isDiscovered ? 0 : 16}
            />
          </Pressable>
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
          {isDiscovered && onNavigatePress ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ver en el mapa"
              onPress={onNavigatePress}
              style={[styles.locate, { top: insets.top + spacing.sm }]}
            >
              <Icon name="location" size={22} color={colors.primary} />
            </Pressable>
          ) : null}
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
            {isDiscovered
              ? `Descubierto${animal.discoveredAt ? ` · ${formatDiscoveredAt(animal.discoveredAt)}` : ''}`
              : 'Por descubrir'}
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
      {photoOpen && photo ? (
        <PhotoViewer source={photo} name={animal.commonName} onClose={() => setPhotoOpen(false)} />
      ) : null}
    </View>
  );
}

function clamp(value: number, limit: number) {
  return Math.min(limit, Math.max(-limit, value));
}

function PhotoViewer({ source, name, onClose }: { source: { uri: string }; name: string; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const [zoomed, setZoomed] = useState(false);
  const zoomedRef = useRef(false);
  const frameHeight = Math.max(height - 140, 240);
  const scale = zoomed ? 2.5 : 1;
  const imageWidth = width * scale;
  const imageHeight = frameHeight * scale;
  const limits = useRef({ x: 0, y: 0 });
  const offset = useRef({ x: 0, y: 0 });
  const translate = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  limits.current = {
    x: Math.max(0, (imageWidth - width) / 2),
    y: Math.max(0, (imageHeight - frameHeight) / 2),
  };
  zoomedRef.current = zoomed;

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gesture) =>
        zoomedRef.current && (Math.abs(gesture.dx) > 6 || Math.abs(gesture.dy) > 6),
      onPanResponderMove: (_, gesture) => {
        translate.setValue({
          x: clamp(offset.current.x + gesture.dx, limits.current.x),
          y: clamp(offset.current.y + gesture.dy, limits.current.y),
        });
      },
      onPanResponderRelease: (_, gesture) => {
        offset.current = {
          x: clamp(offset.current.x + gesture.dx, limits.current.x),
          y: clamp(offset.current.y + gesture.dy, limits.current.y),
        };
        translate.setValue(offset.current);
      },
      onPanResponderTerminate: (_, gesture) => {
        offset.current = {
          x: clamp(offset.current.x + gesture.dx, limits.current.x),
          y: clamp(offset.current.y + gesture.dy, limits.current.y),
        };
        translate.setValue(offset.current);
      },
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  function toggleZoom() {
    setZoomed((current) => {
      if (current) {
        offset.current = { x: 0, y: 0 };
        translate.setValue({ x: 0, y: 0 });
      }
      return !current;
    });
  }

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.viewer}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar foto" onPress={onClose} style={styles.viewerClose}>
          <AppText variant="body" bold color="textOnPrimary">Cerrar</AppText>
        </Pressable>
        <View
          style={{ width, height: frameHeight, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}
          {...responder.panHandlers}
        >
          <Animated.View style={{ transform: translate.getTranslateTransform() }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={zoomed ? `Alejar foto de ${name}` : `Ampliar foto de ${name}`}
              onPress={toggleZoom}
            >
              <Image source={source} resizeMode="contain" style={{ width: imageWidth, height: imageHeight }} />
            </Pressable>
          </Animated.View>
        </View>
        <AppText variant="caption" center color="textOnPrimary">
          Toca la foto para acercarla o alejarla. Con el zoom, arrástrala en cualquier dirección.
        </AppText>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  heroImage: { width: '100%', height: 280 },
  lockedImageShade: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: colors.text, opacity: 0.35 },
  lockedImageOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  topActions: { position: 'absolute', left: spacing.lg },
  locate: {
    position: 'absolute',
    right: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: spacing.lg, gap: spacing.md },
  titleGroup: { gap: 2 },
  card: { gap: spacing.md },
  lockedCard: { gap: spacing.md, backgroundColor: colors.surface },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  viewer: { flex: 1, backgroundColor: colors.text, justifyContent: 'center', paddingVertical: spacing.lg },
  viewerClose: { alignSelf: 'flex-end', marginRight: spacing.lg, minHeight: 44, justifyContent: 'center' },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
