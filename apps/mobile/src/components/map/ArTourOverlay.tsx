import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../ui';
import { MapPlace } from '../../models';
import { colors, radius, spacing } from '../../theme/tokens';
import { ArGuidanceResult } from '../../utils/arMath';
import { WalkRouteResult } from '../../utils/pathfinding';
import { TourForkBranch } from '../../utils/tourPlanner';
import { ArVisualMode } from '../../viewmodels/useArTourViewModel';
import { ArAnimalProximityCard } from './ArAnimalProximityCard';
import { EnclosureDetailModal } from './EnclosureDetailModal';
import { ThreeTourScene } from './ThreeTourScene';

interface ArTourOverlayProps {
  visualMode: ArVisualMode;
  currentStopIndex: number;
  totalStops: number;
  currentStop: MapPlace | null;
  walkRoute: WalkRouteResult | null;
  guidance: ArGuidanceResult | null;
  forkBranches: TourForkBranch[];
  showProximityCard?: boolean;
  proximityDistanceMeters?: number | null;
  isArrived?: boolean;
  onDismissProximityCard?: () => void;
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
  showProximityCard = false,
  proximityDistanceMeters,
  isArrived = false,
  onDismissProximityCard,
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
  const [isEnclosureModalOpen, setIsEnclosureModalOpen] = useState(false);

  const modeLabel =
    visualMode === 'camera-ar' ? 'Modo Escena 3D' : 'Modo Cámara AR';

  return (
    <View testID="ar-tour-overlay" style={styles.overlay}>
      {/* Capa de fondo 3D / Cámara AR a pantalla completa */}
      <ThreeTourScene
        visualMode={visualMode}
        guidance={guidance}
        forkBranches={forkBranches}
        currentStop={currentStop}
        isArrived={isArrived}
        onStepAnimation={onStepAnimation}
      />

      {/* Barra superior minimalista y flotante */}
      <View style={styles.topContainer}>
        <View style={styles.topRow}>
          <Pressable
            testID="close-ar-tour-button"
            accessibilityRole="button"
            accessibilityLabel="Volver al mapa 2D"
            onPress={onClose}
            style={styles.closeCircleButton}
          >
            <AppText variant="body" bold color="text">
              ✕
            </AppText>
          </Pressable>

          <View style={styles.stopPill}>
            <AppText variant="caption" bold color="primary">
              {`Parada ${currentStopIndex + 1} de ${Math.max(1, totalStops)} • Offline 3D`}
            </AppText>
          </View>

          <Pressable
            testID="toggle-ar-visual-mode"
            accessibilityRole="button"
            accessibilityLabel="Cambiar entre Cámara AR y Escena 3D"
            onPress={onToggleVisualMode}
            style={styles.modePill}
          >
            <AppText variant="caption" bold color="text">
              {modeLabel}
            </AppText>
          </Pressable>
        </View>

        {/* Tarjeta de guía flotante estilo Live View */}
        {currentStop && (
          <View
            testID="ar-guidance-card"
            style={[styles.guidanceCard, isArrived && styles.guidanceCardArrived]}
          >
            <View style={styles.guidanceHeader}>
              <View
                style={[
                  styles.destinationBadge,
                  isArrived && styles.destinationBadgeArrived,
                ]}
              >
                <AppText
                  variant="caption"
                  bold
                  color={isArrived ? 'textOnPrimary' : 'primary'}
                >
                  {isArrived ? '🎯 ¡LLEGADA AL RECINTO!' : currentStop.name}
                </AppText>
              </View>
              {isArrived ? (
                <AppText variant="caption" bold color="primary">
                  ¡Estás aquí!
                </AppText>
              ) : walkRoute ? (
                <AppText variant="caption" color="textMuted">
                  {`~${walkRoute.distanceMeters} m • ${walkRoute.estimatedMinutes} min`}
                </AppText>
              ) : null}
            </View>

            <AppText variant="body" bold color="text" style={styles.instructionText}>
              {isArrived
                ? `¡Has llegado a ${currentStop.name}!`
                : (guidance?.instruction ?? 'Sigue por el sendero principal')}
            </AppText>
          </View>
        )}

        {/* Tarjeta interactiva flotante con datos del animal por proximidad o llegada */}
        {showProximityCard && currentStop && (
          <ArAnimalProximityCard
            place={currentStop}
            distanceMeters={proximityDistanceMeters ?? walkRoute?.distanceMeters ?? (isArrived ? 0 : 10)}
            isArrived={isArrived}
            onDismiss={onDismissProximityCard ?? (() => {})}
            onNextStop={onNextStop}
            onOpenEnclosureSheet={() => setIsEnclosureModalOpen(true)}
          />
        )}
      </View>

      {/* Modal deslizante / Bottom Sheet con la ficha técnica completa del recinto (Boceto del usuario) */}
      <EnclosureDetailModal
        visible={isEnclosureModalOpen}
        place={currentStop}
        onClose={() => setIsEnclosureModalOpen(false)}
      />

      {/* Área inferior minimalista y flotante */}
      <View style={styles.bottomContainer}>
        {/* Panel compacto de bifurcaciones si existen desvíos */}
        {forkBranches.length > 0 && (
          <View testID="ar-forks-panel" style={styles.forksCard}>
            <AppText variant="caption" bold color="textMuted" style={styles.forksTitle}>
              Desvíos en el sendero:
            </AppText>
            <View style={styles.forksRow}>
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
                      ? `✓ ${branch.targetPlaceName}`
                      : `⌥ ${branch.targetPlaceName} (${branch.distanceMeters} m)`}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Controles de orientación sutiles y compactos */}
        <View style={styles.orientationRow}>
          <Pressable
            testID="ar-rotate-left"
            accessibilityRole="button"
            accessibilityLabel="Girar vista a la izquierda"
            onPress={onRotateLeft}
            style={styles.microButton}
          >
            <AppText variant="small" bold color="text">
              ⟲
            </AppText>
          </Pressable>

          <Pressable
            testID="ar-align-front"
            accessibilityRole="button"
            accessibilityLabel="Alinear al frente"
            onPress={onAlignFront}
            style={[styles.microButton, styles.microButtonCenter]}
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
            style={styles.microButton}
          >
            <AppText variant="small" bold color="text">
              ⟳
            </AppText>
          </Pressable>
        </View>

        {/* Botones de navegación del recorrido flotantes */}
        <View style={styles.navRow}>
          <Pressable
            testID="prev-tour-stop-button"
            accessibilityRole="button"
            accessibilityLabel="Recinto anterior"
            onPress={onPrevStop}
            style={styles.navPillSecondary}
          >
            <AppText variant="body" bold color="text">
              ‹ Anterior
            </AppText>
          </Pressable>

          <Pressable
            testID="next-tour-stop-button"
            accessibilityRole="button"
            accessibilityLabel="Siguiente recinto"
            onPress={onNextStop}
            style={styles.navPillPrimary}
          >
            <AppText variant="body" bold color="textOnPrimary">
              Siguiente recinto ›
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
    zIndex: 99,
    justifyContent: 'space-between',
  },
  topContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeCircleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
  },
  stopPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    elevation: 3,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
  },
  modePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    elevation: 3,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
  },
  guidanceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    elevation: 5,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    marginTop: spacing.xs,
  },
  guidanceCardArrived: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  guidanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  destinationBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  destinationBadgeArrived: {
    backgroundColor: colors.primary,
  },
  instructionText: {
    fontSize: 16,
    lineHeight: 22,
  },
  bottomContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  forksCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    elevation: 3,
  },
  forksTitle: {
    fontSize: 11,
    marginBottom: 4,
  },
  forksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  forkChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  forkChipPrimary: {
    backgroundColor: colors.primary,
  },
  forkChipSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orientationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  microButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
  },
  microButtonCenter: {
    width: 'auto',
    paddingHorizontal: spacing.md,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  navPillSecondary: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  navPillPrimary: {
    flex: 1.4,
    minHeight: 46,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
