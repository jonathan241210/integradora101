import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MapPlace } from '../../models';
import { colors, radius } from '../../theme/tokens';

interface MapMarkerProps {
  place: MapPlace;
  selected?: boolean;
  onPress: (id: string) => void;
}

const kindLabels: Record<MapPlace['kind'], string> = {
  animal: 'Animal',
  service: 'Servicio',
  entrance: 'Acceso',
  zoo_place: 'Lugar',
};

function MapMarkerComponent({ place, selected = false, onPress }: MapMarkerProps) {
  return (
    <Pressable
      testID={`map-marker-${place.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${place.name}, ${kindLabels[place.kind]}`}
      accessibilityState={{ selected }}
      onPress={() => onPress(place.id)}
      hitSlop={10}
      style={({ pressed }) => [
        styles.marker,
        {
          left: `${place.mapX * 100}%` as `${number}%`,
          top: `${place.mapY * 100}%` as `${number}%`,
        },
        pressed && styles.markerPressed,
      ]}
    >
      <View
        style={[
          styles.hitArea,
          selected && styles.hitAreaSelected,
          place.kind === 'zoo_place' && styles.hitAreaZooPlace,
          selected && place.kind === 'zoo_place' && styles.hitAreaZooPlaceSelected,
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  marker: {
    position: 'absolute',
    width: '2.2%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateX: '-50%' }, { translateY: '-50%' }],
  },
  markerPressed: {
    opacity: 0.8,
  },
  hitArea: {
    width: '100%',
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: 'transparent',
  },
  hitAreaSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: 'rgba(46, 125, 50, 0.12)',
  },
  hitAreaZooPlace: {
    borderRadius: radius.pill,
  },
  hitAreaZooPlaceSelected: {
    borderColor: colors.base,
    backgroundColor: 'rgba(135, 41, 58, 0.12)',
  },
});

export const MapMarker = memo(MapMarkerComponent);
