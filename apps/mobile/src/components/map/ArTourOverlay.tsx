import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../ui';
import { MapPlace } from '../../models';
import { colors, radius, spacing } from '../../theme/tokens';
import { ArGuidanceResult } from '../../utils/arMath';
import { WalkRouteResult } from '../../utils/pathfinding';
import { TourForkBranch } from '../../utils/tourPlanner';
import { ArVisualMode } from '../../viewmodels/useArTourViewModel';
import { ThreeTourScene } from './ThreeTourScene';

interface ArTourOverlayProps {
  visualMode: ArVisualMode;
  currentStopIndex: number;
  totalStops: number;
  currentStop: MapPlace | null;
  walkRoute: WalkRouteResult | null;
  guidance: ArGuidanceResult | null;
  forkBranches: TourForkBranch[];
  onClose: () => void;
  onToggleVisualMode: () => void;
  onNextStop: () => void;
  onPrevStop: () => void;
  onSelectForkStop: (placeId: string) => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onAlignFront: () => void;
  onStepAnimation?: () => void;
}

export function ArTourOverlay({
  visualMode,
  currentStopIndex,
  totalStops,
  currentStop,
  walkRoute,
  guidance,
  forkBranches,
  onClose,
  onToggleVisualMode,
  onNextStop,
  onPrevStop,
  onSelectForkStop,
  onRotateLeft,
  onRotateRight,
  onAlignFront,
  onStepAnimation,
}: ArTourOverlayProps) {
  const modeLabel =
    visualMode === 'camera-ar' ? 'Modo Escena 3D' : 'Modo Cámara AR';

  return (
    <View testID="ar-tour-overlay" style={styles.overlay}>
      <ThreeTourScene
        visualMode={visualMode}
        guidance={guidance}
        forkBranches={forkBranches}
        onStepAnimation={onStepAnimation}
      />

      <View style={styles.topHud}>
        <View style={styles.topRow}>
          <View style={styles.stopBadge}>
            <AppText variant="caption" bold color="primary">
              {`Parada ${currentStopIndex + 1} de ${Math.max(1, totalStops)} • Offline 3D`}
            </AppText>
          </View>

          <View style={styles.topActions}>
            <Pressable
              testID="toggle-ar-visual-mode"
              accessibilityRole="button"
              accessibilityLabel="Cambiar entre Cámara AR y Escena 3D"
              onPress={onToggleVisualMode}
              style={styles.actionPill}
            >
              <AppText variant="caption" bold color="text">
                {modeLabel}
              </AppText>
            </Pressable>

            <Pressable
              testID="close-ar-tour-button"
              accessibilityRole="button"
              accessibilityLabel="Volver al mapa 2D"
              onPress={onClose}
              style={[styles.actionPill, styles.closePill]}
            >
              <AppText variant="caption" bold color="textOnPrimary">
                Volver al mapa 2D
              </AppText>
            </Pressable>
          </View>
        </View>

        {currentStop && (
          <View testID="ar-guidance-card" style={styles.guidanceCard}>
            <AppText variant="body" bold color="text">
              {currentStop.name}
            </AppText>
            <AppText variant="body" bold color="primary">
              {guidance?.instruction ?? 'Sigue por el sendero principal'}
            </AppText>
            {walkRoute && (
              <AppText variant="caption" color="textMuted">
                {`Distancia por sendero: ~${walkRoute.distanceMeters} m • ${walkRoute.estimatedMinutes} min a pie`}
              </AppText>
            )}
          </View>
        )}
      </View>

      <View style={styles.bottomHud}>
        {forkBranches.length > 0 && (
          <View testID="ar-forks-panel" style={styles.forksCard}>
            <AppText variant="caption" bold color="textMuted">
              Bifurcaciones y conexiones en el sendero:
            </AppText>
            <View style={styles.forksList}>
              {forkBranches.map((branch) => (
                <Pressable
                  key={branch.id}
                  testID={`fork-select-${branch.targetPlaceId}`}
                  accessibilityRole="button"
                  accessibilityLabel={
                    branch.isPrimary
                      ? `Ruta activa hacia ${branch.targetPlaceName}`
                      : `Tomar bifurcación hacia ${branch.targetPlaceName}`
                  }
                  onPress={() => onSelectForkStop(branch.targetPlaceId)}
                  style={[
                    styles.forkChip,
                    branch.isPrimary ? styles.forkChipPrimary : styles.forkChipSecondary,
                  ]}
                >
                  <AppText
                    variant="caption"
                    bold
                    color={branch.isPrimary ? 'textOnPrimary' : 'text'}
                  >
                    {branch.isPrimary
                      ? `↗ Ruta: ${branch.targetPlaceName} (${branch.distanceMeters} m)`
                      : `↖ Desvío: ${branch.targetPlaceName} (${branch.distanceMeters} m)`}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={styles.controlsRow}>
          <Pressable
            testID="ar-rotate-left"
            accessibilityRole="button"
            accessibilityLabel="Girar vista a la izquierda"
            onPress={onRotateLeft}
            style={styles.controlButton}
          >
            <AppText variant="small" bold color="text">
              ⟲ Izq
            </AppText>
          </Pressable>

          <Pressable
            testID="ar-align-front"
            accessibilityRole="button"
            accessibilityLabel="Alinear al frente"
            onPress={onAlignFront}
            style={styles.controlButton}
          >
            <AppText variant="small" bold color="primary">
              Alinear
            </AppText>
          </Pressable>

          <Pressable
            testID="ar-rotate-right"
            accessibilityRole="button"
            accessibilityLabel="Girar vista a la derecha"
            onPress={onRotateRight}
            style={styles.controlButton}
          >
            <AppText variant="small" bold color="text">
              Der ⟳
            </AppText>
          </Pressable>
        </View>

        <View style={styles.tourNavRow}>
          <Pressable
            testID="prev-tour-stop-button"
            accessibilityRole="button"
            accessibilityLabel="Recinto anterior"
            onPress={onPrevStop}
            style={styles.navButtonSecondary}
          >
            <AppText variant="small" bold color="text">
              Anterior
            </AppText>
          </Pressable>

          <Pressable
            testID="next-tour-stop-button"
            accessibilityRole="button"
            accessibilityLabel="Siguiente recinto"
            onPress={onNextStop}
            style={styles.navButtonPrimary}
          >
            <AppText variant="small" bold color="textOnPrimary">
              Siguiente recinto
            </AppText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 20,
    justifyContent: 'space-between',
  },
  topHud: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stopBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionPill: {
    minHeight: 38,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closePill: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  guidanceCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 2,
    elevation: 3,
  },
  bottomHud: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  forksCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  forksList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  forkChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  forkChipPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  forkChipSecondary: {
    backgroundColor: colors.background,
    borderColor: colors.border,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  controlButton: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tourNavRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  navButtonSecondary: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonPrimary: {
    flex: 2,
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
