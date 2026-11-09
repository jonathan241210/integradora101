import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../ui';
import { MapPlace } from '../../models';
import { colors, radius, spacing } from '../../theme/tokens';
import { getAnimalCardData } from '../../utils/enclosureAnimals';

interface ArAnimalProximityCardProps {
  place: MapPlace;
  distanceMeters: number;
  isArrived?: boolean;
  onDismiss: () => void;
  onNextStop?: () => void;
  onOpenEnclosureSheet?: () => void;
}

export function ArAnimalProximityCard({
  place,
  distanceMeters,
  isArrived = false,
  onDismiss,
  onNextStop,
  onOpenEnclosureSheet,
}: ArAnimalProximityCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const animalData = getAnimalCardData(place);

  const displayDistance = isArrived ? 0 : Math.max(1, Math.round(distanceMeters));
  const badgeLabel = isArrived
    ? '🎉 ¡HAS LLEGADO AL RECINTO! • 0 m'
    : `🐾 ¡Cerca del recinto! • ~${displayDistance} m`;

  return (
    <View
      testID="ar-animal-proximity-card"
      style={[styles.cardContainer, isArrived && styles.cardContainerArrived]}
    >
      {/* Cabecera con indicador de proximidad o llegada y botón de cierre */}
      <View style={styles.headerRow}>
        <View
          testID="ar-proximity-badge"
          style={[styles.proximityBadge, isArrived && styles.arrivedBadge]}
        >
          <AppText variant="caption" bold color="textOnPrimary">
            {badgeLabel}
          </AppText>
        </View>

        <Pressable
          testID="ar-close-proximity-card"
          accessibilityRole="button"
          accessibilityLabel="Cerrar ficha interactiva del recinto"
          onPress={onDismiss}
          style={styles.closeButton}
        >
          <AppText variant="caption" bold color="textMuted">
            ✕
          </AppText>
        </Pressable>
      </View>

      {/* Contenido principal con emoji, nombre y categoría */}
      <View style={styles.contentRow}>
        <View style={[styles.iconCircle, isArrived && styles.iconCircleArrived]}>
          <AppText style={styles.emojiText}>{animalData.iconEmoji}</AppText>
        </View>

        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <AppText variant="body" bold color="text" numberOfLines={1}>
              {isArrived ? `¡Llegaste a ${animalData.title}!` : animalData.title}
            </AppText>
          </View>

          <AppText variant="caption" color="textMuted" numberOfLines={1}>
            {animalData.subtitle}
          </AppText>

          {animalData.categoryLabel ? (
            <View style={styles.categoryChip}>
              <AppText variant="caption" bold color="primary">
                {isArrived ? `Destino alcanzado • ${animalData.categoryLabel}` : animalData.categoryLabel}
              </AppText>
            </View>
          ) : null}
        </View>
      </View>

      {/* Datos del animal: dieta y descripción / dato curioso */}
      <View style={styles.detailsContainer}>
        {animalData.diet ? (
          <View style={styles.factRow}>
            <AppText variant="caption" bold color="text">
              Dieta:{' '}
            </AppText>
            <AppText variant="caption" color="textMuted" numberOfLines={1}>
              {animalData.diet}
            </AppText>
          </View>
        ) : null}

        {isExpanded && animalData.funFact ? (
          <View style={styles.funFactBox}>
            <AppText variant="caption" bold color="primary">
              💡 Curiosidad:{' '}
            </AppText>
            <AppText variant="caption" color="text">
              {animalData.funFact}
            </AppText>
          </View>
        ) : null}

        {isExpanded && animalData.description ? (
          <View style={styles.expandedSection}>
            <AppText variant="caption" color="textMuted">
              {animalData.description}
            </AppText>
          </View>
        ) : null}
      </View>

      {/* Botones de acción interactiva: Ficha del recinto (Nivel 2), siguiente parada y descarte */}
      <View style={styles.actionRow}>
        {onOpenEnclosureSheet && (
          <Pressable
            testID="ar-card-open-sheet-btn"
            accessibilityRole="button"
            accessibilityLabel="Ver ficha técnica completa del recinto y sus animales"
            onPress={onOpenEnclosureSheet}
            style={styles.sheetButton}
          >
            <AppText variant="caption" bold color="primary">
              📋 Ficha del recinto
            </AppText>
          </Pressable>
        )}

        <Pressable
          testID="ar-card-action-button"
          accessibilityRole="button"
          accessibilityLabel={isExpanded ? 'Ver menos datos' : 'Ver más datos del animal'}
          onPress={() => setIsExpanded((prev) => !prev)}
          style={styles.expandButton}
        >
          <AppText variant="caption" bold color="textMuted">
            {isExpanded ? '▲ Menos' : '▼ Info'}
          </AppText>
        </Pressable>

        <View style={styles.rightButtonsRow}>
          {isArrived && onNextStop && (
            <Pressable
              testID="ar-card-next-stop-btn"
              accessibilityRole="button"
              accessibilityLabel="Continuar hacia el siguiente recinto"
              onPress={onNextStop}
              style={styles.nextStopPill}
            >
              <AppText variant="caption" bold color="textOnPrimary">
                Siguiente recinto ›
              </AppText>
            </Pressable>
          )}

          <Pressable
            testID="ar-card-dismiss-btn"
            accessibilityRole="button"
            accessibilityLabel="Entendido, continuar recorrido"
            onPress={onDismiss}
            style={styles.dismissPill}
          >
            <AppText
              variant="caption"
              bold
              color={isArrived ? 'text' : 'textOnPrimary'}
            >
              Entendido
            </AppText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    elevation: 6,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  cardContainerArrived: {
    borderWidth: 2.5,
    borderColor: colors.primary,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  proximityBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  arrivedBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  closeButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(46, 125, 50, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleArrived: {
    backgroundColor: 'rgba(46, 125, 50, 0.22)',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  emojiText: {
    fontSize: 22,
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(46, 125, 50, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
    marginTop: 2,
  },
  detailsContainer: {
    gap: 3,
    marginBottom: spacing.xs,
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  funFactBox: {
    backgroundColor: 'rgba(46, 125, 50, 0.06)',
    borderRadius: radius.sm,
    padding: spacing.xs,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  expandedSection: {
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  sheetButton: {
    backgroundColor: 'rgba(46, 125, 50, 0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  expandButton: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  rightButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  nextStopPill: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  dismissPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
});
