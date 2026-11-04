import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Icon } from '../ui';
import { MapPlace } from '../../models';
import { colors, radius, spacing } from '../../theme/tokens';

interface MapMarkerProps {
  place: MapPlace;
  selected?: boolean;
  onPress: (id: string) => void;
}

const kindLabels: Record<MapPlace['kind'], string> = {
  animal: 'Animal',
  service: 'Servicio',
  entrance: 'Acceso',
};

const kindIcons: Record<MapPlace['kind'], string> = {
  animal: 'paw',
  service: 'information-circle-outline',
  entrance: 'location',
};

export function MapMarker({ place, selected = false, onPress }: MapMarkerProps) {
  return (
    <Pressable
      testID={`map-marker-${place.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${place.name}, ${kindLabels[place.kind]}`}
      accessibilityState={{ selected }}
      onPress={() => onPress(place.id)}
      style={[
        styles.marker,
        {
          left: `${place.mapX * 100}%` as `${number}%`,
          top: `${place.mapY * 100}%` as `${number}%`,
        },
      ]}
    >
      <View style={[styles.pin, selected && styles.pinSelected]}>
        <Icon
          name={kindIcons[place.kind]}
          size={18}
          color={selected ? colors.textOnPrimary : colors.primary}
        />
      </View>
      <AppText
        variant="caption"
        bold
        center
        color={selected ? 'primary' : 'text'}
        style={styles.label}
      >
        {place.name}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  marker: {
    position: 'absolute',
    width: 108,
    alignItems: 'center',
    transform: [{ translateX: -54 }, { translateY: -18 }],
  },
  pin: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  pinSelected: {
    backgroundColor: colors.primary,
  },
  label: {
    maxWidth: 108,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
});
