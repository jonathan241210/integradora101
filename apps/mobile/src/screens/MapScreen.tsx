import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Card, Chip, Icon, ScreenContainer } from '../components/ui';
import { MapLocation, MapRoute } from '../models';
import { colors, radius, spacing } from '../theme/tokens';

interface MapScreenProps {
  locations: MapLocation[];
  activeRoute: MapRoute;
  onSearchPress: () => void;
  onTourPress: () => void;
}

const filters = ['Todo', 'Animales', 'Servicios'] as const;

export function MapScreen({ locations, activeRoute, onSearchPress, onTourPress }: MapScreenProps) {
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>('Todo');
  const visibleLocations = locations.filter((location) =>
    activeFilter === 'Todo' || (activeFilter === 'Animales' ? location.kind === 'animal' : location.kind === 'service')
  );

  return (
    <ScreenContainer scroll={false} contentStyle={styles.screen}>
      <View style={styles.map}>
        <View style={styles.controls}>
          <Button label="Buscar animales" variant="soft" onPress={onSearchPress} />
          <View style={styles.filters}>
            {filters.map((filter) => (
              <Chip
                key={filter}
                label={filter}
                selected={activeFilter === filter}
                onPress={() => setActiveFilter(filter)}
              />
            ))}
          </View>
        </View>
        <View style={[styles.water, styles.waterOne]} />
        <View style={[styles.water, styles.waterTwo]} />
        <View style={styles.pathOne} />
        <View style={styles.pathTwo} />
        {visibleLocations.map((location) => (
          <View key={location.id} style={[styles.pin, { left: `${location.left}%`, top: `${location.top}%` }]}>
            <Icon name={location.kind === 'animal' ? 'paw' : 'water'} size={20} color={colors.primary} />
            <AppText variant="caption" bold>{location.label}</AppText>
          </View>
        ))}
        <View style={styles.userPin} accessibilityLabel="Tu ubicación aproximada" />
        <Card style={styles.routeCard}>
          <AppText variant="overline" color="primary">Ruta a: {activeRoute.destination}</AppText>
          <AppText variant="small" color="textMuted">{activeRoute.duration} · {activeRoute.distance} · {activeRoute.direction}</AppText>
          {activeRoute.steps.map((step, index) => (
            <AppText key={step} variant="caption">{index + 1}. {step}</AppText>
          ))}
          <Button label="Cambiar a recorrido 3D" variant="soft" onPress={onTourPress} />
        </Card>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  map: { flex: 1, overflow: 'hidden', backgroundColor: colors.primarySoft },
  controls: { position: 'absolute', zIndex: 2, top: spacing.md, left: spacing.md, right: spacing.md, gap: spacing.sm },
  filters: { flexDirection: 'row', gap: spacing.xs },
  water: { position: 'absolute', backgroundColor: colors.border, borderRadius: radius.pill },
  waterOne: { width: 180, height: 68, top: '37%', left: '5%', transform: [{ rotate: '-20deg' }] },
  waterTwo: { width: 150, height: 54, top: '56%', right: '3%', transform: [{ rotate: '22deg' }] },
  pathOne: { position: 'absolute', width: '130%', height: 20, top: '47%', left: '-10%', backgroundColor: colors.surface, transform: [{ rotate: '28deg' }] },
  pathTwo: { position: 'absolute', width: 20, height: '75%', top: '12%', left: '55%', backgroundColor: colors.surface, transform: [{ rotate: '-18deg' }] },
  pin: { position: 'absolute', alignItems: 'center', gap: 2, padding: spacing.xs, borderRadius: radius.md, backgroundColor: colors.surface, elevation: 2 },
  userPin: { position: 'absolute', width: 16, height: 16, top: '48%', left: '48%', borderRadius: radius.pill, borderWidth: 3, borderColor: colors.surface, backgroundColor: colors.primary },
  routeCard: { position: 'absolute', bottom: spacing.md, left: spacing.md, right: spacing.md, padding: spacing.md, gap: spacing.xs },
});
