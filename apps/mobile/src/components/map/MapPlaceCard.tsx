import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText, Button, Card } from '../ui';
import { MapPlace } from '../../models';
import { spacing } from '../../theme/tokens';

interface MapPlaceCardProps {
  place: MapPlace;
  sectionName?: string;
  isDestination?: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  onClose: () => void;
  onToggleDestination?: (id: string) => void;
}

const kindLabels: Record<MapPlace['kind'], string> = {
  animal: 'Animal',
  service: 'Servicio',
  entrance: 'Acceso',
  zoo_place: 'Lugar',
};

export function MapPlaceCard({
  place,
  sectionName,
  isDestination = false,
  expanded,
  onToggleExpanded,
  onClose,
  onToggleDestination,
}: MapPlaceCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <AppText variant="body" bold numberOfLines={expanded ? undefined : 2} style={styles.title}>
          {place.name}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={onToggleExpanded}
          style={styles.action}
        >
          <AppText variant="small" bold color="primary">{expanded ? 'Ver menos' : 'Ver detalles'}</AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          onPress={onClose}
          style={[styles.action, styles.close]}
        >
          <AppText variant="subheading" color="primary">✕</AppText>
        </Pressable>
      </View>
      {expanded && (
        <ScrollView style={styles.details} contentContainerStyle={styles.detailContent}>
          <AppText variant="overline" color="primary">
            {kindLabels[place.kind]}
          </AppText>
          {sectionName ? (
            <AppText variant="small" color="textMuted">Sección: {sectionName}</AppText>
          ) : null}
          {place.description ? (
            <AppText variant="small" color="textMuted">{place.description}</AppText>
          ) : null}
        </ScrollView>
      )}
      {expanded && onToggleDestination && (
        <View testID="toggle-destination-button">
          <Button
            label={isDestination ? 'Cancelar destino' : 'Fijar como destino'}
            variant={isDestination ? 'soft' : 'primary'}
            onPress={() => onToggleDestination(place.id)}
          />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    maxHeight: '65%',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    flex: 1,
  },
  action: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  close: {
    width: 48,
  },
  details: {
    flexGrow: 0,
    flexShrink: 1,
  },
  detailContent: {
    gap: spacing.xs,
    paddingBottom: spacing.xs,
  },
});
