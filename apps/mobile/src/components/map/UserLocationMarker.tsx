import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { SVG_WIDTH, SVG_HEIGHT } from '../../constants/zoo';
import {
  LOCATION_DOT_COLOR,
  LOCATION_DOT_BORDER,
  LOCATION_PULSE_COLOR,
  LOCATION_DOT_SHADOW,
} from '../../constants/zoo';

interface UserLocationMarkerProps {
  svgX: number;
  svgY: number;
  searching: boolean;
}

/**
 * Punto azul que indica la posición del visitante sobre el mapa SVG.
 * Cuando searching=true muestra un anillo pulsante exterior.
 * Se posiciona con porcentajes sobre el contenedor del mapa.
 */
export function UserLocationMarker({
  svgX,
  svgY,
  searching,
}: UserLocationMarkerProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (searching) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.8,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
    pulseAnim.setValue(1);
    return undefined;
  }, [searching, pulseAnim]);

  const leftPercent = `${(svgX / SVG_WIDTH) * 100}%` as `${number}%`;
  const topPercent = `${(svgY / SVG_HEIGHT) * 100}%` as `${number}%`;

  return (
    <View
      testID="user-location-marker"
      accessibilityLabel="Tu ubicación actual"
      style={[styles.container, { left: leftPercent, top: topPercent }]}
    >
      {searching && (
        <Animated.View
          testID="location-searching"
          style={[
            styles.pulse,
            { transform: [{ scale: pulseAnim }] },
          ]}
        />
      )}
      <View style={styles.dot} />
    </View>
  );
}

const DOT_SIZE = 16;
const PULSE_SIZE = 28;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: PULSE_SIZE,
    height: PULSE_SIZE,
    marginLeft: -(PULSE_SIZE / 2),
    marginTop: -(PULSE_SIZE / 2),
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: LOCATION_DOT_COLOR,
    borderWidth: 2,
    borderColor: LOCATION_DOT_BORDER,
    elevation: 3,
    shadowColor: LOCATION_DOT_SHADOW,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  pulse: {
    position: 'absolute',
    width: PULSE_SIZE,
    height: PULSE_SIZE,
    borderRadius: PULSE_SIZE / 2,
    backgroundColor: LOCATION_PULSE_COLOR,
  },
});
