import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Card } from '../ui';
import { MapPlace } from '../../models';
import { spacing } from '../../theme/tokens';

interface MapPlaceCardProps {
  place: MapPlace;
  sectionName: string;
  isDestination?: boolean;
  onClose: () => void;
  onToggleDestination?: (id: string) => void;
}

const kindLabels: Record<MapPlace['kind'], string> = {
  animal: 'Animal',
  service: 'Servicio',
  entrance: 'Acceso',
};

export function MapPlaceCard({
  place,
  sectionName,
  isDestination = false,
  onClose,
  onToggleDestination,
}: MapPlaceCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <AppText variant="overline" color="primary">
            {kindLabels[place.kind]}
          </AppText>
          <AppText variant="subheading">{place.name}</AppText>
          <AppText variant="small" color="textMuted">
            Sección: {sectionName}
          </AppText>
        </View>
        <Button label="Cerrar" variant="soft" onPress={onClose} />
      </View>
      {place.description ? (
        <AppText variant="small" color="textMuted">
          {place.description}
        </AppText>
      ) : null}
      {onToggleDestination && (
        <View style={styles.actions} testID="toggle-destination-button">
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
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  titleGroup: {
    flex: 1,
    gap: spacing.xs,
  },
  actions: {
    paddingTop: spacing.xs,
  },
});
