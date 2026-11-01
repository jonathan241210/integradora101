import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Card } from '../ui';
import { MapPlace } from '../../models';
import { spacing } from '../../theme/tokens';

interface MapPlaceCardProps {
  place: MapPlace;
  sectionName: string;
  onClose: () => void;
}

const kindLabels: Record<MapPlace['kind'], string> = {
  animal: 'Animal',
  service: 'Servicio',
  entrance: 'Acceso',
};

export function MapPlaceCard({ place, sectionName, onClose }: MapPlaceCardProps) {
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  titleGroup: {
    flex: 1,
    gap: 2,
  },
});
