import React, { memo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { MapPlace } from '../../models';

interface MapMarkerProps {
  place: MapPlace;
  selected?: boolean;
  hitWidth?: number;
  onPress: (id: string) => void;
}

const kindLabels: Record<MapPlace['kind'], string> = {
  animal: 'Animal',
  service: 'Servicio',
  entrance: 'Acceso',
  zoo_place: 'Lugar',
};

function MapMarkerComponent({ place, selected = false, hitWidth = 0.022, onPress }: MapMarkerProps) {
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
          width: `${hitWidth * 100}%`,
          left: `${place.mapX * 100}%` as `${number}%`,
          top: `${place.mapY * 100}%` as `${number}%`,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  marker: {
    position: 'absolute',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateX: '-50%' }, { translateY: '-50%' }],
  },
});

export const MapMarker = memo(MapMarkerComponent);
