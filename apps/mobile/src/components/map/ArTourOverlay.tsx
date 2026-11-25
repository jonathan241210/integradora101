import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '../ui';
import { MapPlace, ZooPlace } from '../../models';
import { colors, radius, spacing } from '../../theme/tokens';
import { ArLocationPoint } from '../../utils/arLocationMath';
import { ArAnimalProximityCard } from './ArAnimalProximityCard';
import { EnclosureDetailModal } from './EnclosureDetailModal';
import { LocationArScene } from './LocationArScene';

export interface ArrivedArPoint {
  id: string;
  name: string;
  kind: 'enclosure' | 'zoo_place';
  placeType?: string;
  description?: string | null;
}

interface NearbyPathNode {
  id: string;
  name: string;
  nodeType: string;
  distanceMeters: number;
  instruction?: string | null;
}

interface ArTourOverlayProps {
  arPoints: ArLocationPoint[];
  nearbyPoints?: ArLocationPoint[];
  visitedArIds: Set<string>;
  selectedArPointId: string | null;
  onSelectArPoint: (id: string | null) => void;
  onClose: () => void;
  hasLocation: boolean;
  headingAvailable: boolean;
  lowAccuracy: boolean;
  arrivedArPoint?: ArrivedArPoint | null;
  onDismissArrival?: () => void;
  selectedPlace?: MapPlace | null;
  selectedZooPlace?: ZooPlace | null;
  nearbyPathNode?: NearbyPathNode | null;
}

function formatDistance(distanceMeters: number): string {
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) return '0 m';
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m`;
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

function formatPathNodeType(nodeType: string): string {
  const normalized = nodeType.toLowerCase();
  if (normalized === 'interseccion') return 'Intersección';
  if (normalized === 'inicio') return 'Inicio de sendero';
  if (normalized === 'fin') return 'Fin de sendero';
  if (normalized === 'paso') return 'Punto de paso';
  return 'Punto de sendero';
}

export function ArTourOverlay({
  arPoints,
  nearbyPoints: nearbyPointsProp,
  visitedArIds,
  selectedArPointId,
  onSelectArPoint,
  onClose,
  hasLocation,
  headingAvailable,
  lowAccuracy,
  arrivedArPoint,
  onDismissArrival,
  selectedPlace,
  selectedZooPlace,
  nearbyPathNode,
}: ArTourOverlayProps) {
  const [isEnclosureModalOpen, setIsEnclosureModalOpen] = useState(false);

  const nearbyPoints = useMemo(
    () => [...(nearbyPointsProp ?? arPoints)].sort((a, b) => a.distanceMeters - b.distanceMeters),
    [arPoints, nearbyPointsProp],
  );
  const selectedPoint = useMemo(
    () => nearbyPoints.find((point) => point.id === selectedArPointId) ?? null,
    [nearbyPoints, selectedArPointId],
  );

  const selectedIsArrived = selectedPoint ? visitedArIds.has(selectedPoint.id) || arrivedArPoint?.id === selectedPoint.id : false;

  return (
    <View testID="ar-tour-overlay" style={styles.overlay}>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <LocationArScene
          points={arPoints}
          hasLocation={hasLocation}
          headingAvailable={headingAvailable}
          lowAccuracy={lowAccuracy}
        />
      </View>

      <View style={styles.topContainer}>
        <Pressable
          testID="close-ar-tour-button"
          accessibilityRole="button"
          accessibilityLabel="Volver al mapa 2D"
          onPress={onClose}
          style={styles.closeCircleButton}
        >
          <AppText variant="body" bold color="text">✕</AppText>
        </Pressable>
      </View>

      <EnclosureDetailModal
        visible={isEnclosureModalOpen}
        place={selectedPlace ?? null}
        onClose={() => setIsEnclosureModalOpen(false)}
      />

      <View style={styles.bottomContainer}>
        {selectedPoint && selectedPoint.kind === 'zoo_place' && (
          <View style={styles.selectedCard} testID="ar-selected-zoo-place-card">
            <AppText variant="caption" bold color="primary">{selectedIsArrived ? 'Visitado' : 'Lugar cercano'}</AppText>
            <AppText variant="body" bold color="text">{selectedPoint.name}</AppText>
            <AppText variant="caption" color="textMuted">
              {(selectedZooPlace?.placeType ?? selectedPoint.placeType ?? 'Lugar') + ` • ${formatDistance(selectedPoint.distanceMeters)}`}
            </AppText>
            {(selectedZooPlace?.description ?? selectedPoint.description) ? (
              <AppText variant="caption" color="text">{selectedZooPlace?.description ?? selectedPoint.description}</AppText>
            ) : null}
          </View>
        )}

        {selectedPoint && selectedPoint.kind === 'enclosure' && selectedPlace && (
          <ArAnimalProximityCard
            place={selectedPlace}
            distanceMeters={selectedPoint.distanceMeters}
            isArrived={selectedIsArrived}
            onDismiss={() => onSelectArPoint(null)}
            onOpenEnclosureSheet={() => setIsEnclosureModalOpen(true)}
          />
        )}

        {arrivedArPoint && (
          <View style={styles.arrivalCard} testID="ar-arrival-banner">
            <AppText variant="caption" bold color="primary">Llegaste a</AppText>
            <AppText variant="body" bold color="text">{arrivedArPoint.name}</AppText>
            <AppText variant="caption" color="textMuted">
              {arrivedArPoint.kind === 'zoo_place'
                ? `${arrivedArPoint.placeType ?? 'Lugar'}${arrivedArPoint.description ? ` • ${arrivedArPoint.description}` : ''}`
                : 'Recinto cercano'}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar aviso de llegada"
              onPress={onDismissArrival}
              style={styles.dismissButton}
            >
              <AppText variant="caption" bold color="primary">Cerrar</AppText>
            </Pressable>
          </View>
        )}

        {nearbyPathNode && (
          <View style={styles.pathNodeCard} testID="ar-nearby-path-node-card">
            <AppText variant="caption" bold color="primary">Punto de sendero cercano</AppText>
            <AppText variant="body" bold color="text">{formatPathNodeType(nearbyPathNode.nodeType)}</AppText>
            <AppText variant="caption" color="textMuted">
              {`${nearbyPathNode.name} • ${formatDistance(nearbyPathNode.distanceMeters)}`}
            </AppText>
            {nearbyPathNode.instruction ? (
              <AppText variant="caption" bold color="text">{nearbyPathNode.instruction}</AppText>
            ) : null}
          </View>
        )}

        <View style={styles.nearbyCard} testID="ar-nearby-panel">
          <AppText variant="caption" bold color="textMuted" style={styles.nearbyTitle}>
            Cerca de ti
          </AppText>
          {nearbyPoints.length === 0 ? (
            <AppText variant="caption" color="textMuted">
              Apunta la cámara hacia recintos o lugares cercanos.
            </AppText>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.nearbyRow}>
              {nearbyPoints.map((point) => {
                const isSelected = point.id === selectedArPointId;
                const isVisited = visitedArIds.has(point.id);
                const isZooPlace = point.kind === 'zoo_place';
                return (
                  <Pressable
                    key={point.id}
                    testID={`ar-nearby-item-${point.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${point.name}, ${formatDistance(point.distanceMeters)}${isVisited ? ', visitado' : ''}`}
                    onPress={() => onSelectArPoint(isSelected ? null : point.id)}
                    style={[styles.nearbyChip, isSelected && styles.nearbyChipSelected, isZooPlace && styles.nearbyChipZoo]}
                  >
                    <AppText variant="caption" bold color={isSelected ? 'textOnPrimary' : 'text'} numberOfLines={1}>
                      {point.name}
                    </AppText>
                    <AppText variant="caption" color={isSelected ? 'textOnPrimary' : 'textMuted'}>
                      {`${isZooPlace ? point.placeType ?? 'Lugar' : 'Recinto'} • ${formatDistance(point.distanceMeters)}${isVisited ? ' • Visitado' : ''}`}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 99, justifyContent: 'space-between' },
  topContainer: { paddingHorizontal: spacing.md, paddingTop: spacing.xl },
  closeCircleButton: {
    alignSelf: 'flex-start', width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceOverlay,
    alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 3,
  },
  arrivalCard: {
    backgroundColor: colors.surfaceOverlay, borderRadius: radius.md, padding: spacing.md,
    gap: 2, borderWidth: 1, borderColor: colors.primary,
  },
  pathNodeCard: {
    backgroundColor: colors.surfaceOverlay, borderRadius: radius.md, padding: spacing.sm,
    gap: 2, borderWidth: 1, borderColor: colors.border,
  },
  dismissButton: { alignSelf: 'flex-start', marginTop: spacing.xs, paddingVertical: 4 },
  nearbyCard: {
    backgroundColor: colors.surfaceOverlay, borderRadius: radius.md, padding: spacing.sm,
    gap: spacing.xs, elevation: 3,
  },
  nearbyTitle: { fontSize: 11 },
  nearbyRow: { gap: spacing.xs, paddingVertical: 2 },
  nearbyChip: {
    maxWidth: 220, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  nearbyChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  nearbyChipZoo: { borderColor: colors.primary },
  selectedCard: {
    backgroundColor: colors.surfaceOverlay, borderRadius: radius.md, padding: spacing.md,
    gap: 2, borderWidth: 1, borderColor: colors.primary,
  },
  bottomContainer: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg, gap: spacing.xs },
});
