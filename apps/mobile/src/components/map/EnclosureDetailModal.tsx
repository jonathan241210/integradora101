import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { AppText } from '../ui';
import { MapPlace } from '../../models';
import { colors, radius, spacing } from '../../theme/tokens';
import {
  EnclosureAnimalDetail,
  getEnclosureAnimalsList,
} from '../../utils/enclosureAnimals';

interface EnclosureDetailModalProps {
  visible: boolean;
  place: MapPlace | null;
  onClose: () => void;
}

export function EnclosureDetailModal({
  visible,
  place,
  onClose,
}: EnclosureDetailModalProps) {
  if (!place) {
    return null;
  }

  const animals = getEnclosureAnimalsList(place);
  // Por defecto el primer animal viene desplegado para ver su información al instante
  const [expandedAnimalIds, setExpandedAnimalIds] = useState<Record<string, boolean>>({
    [animals[0]?.id || '']: true,
  });

  const toggleAccordion = (id: string) => {
    setExpandedAnimalIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <Pressable
          testID="enclosure-modal-backdrop-dismiss"
          accessibilityRole="button"
          accessibilityLabel="Cerrar ficha del recinto"
          style={styles.backdropTouchArea}
          onPress={onClose}
        />

        <View style={styles.sheetContainer} testID="enclosure-detail-sheet">
          {/* Barra de arrastre / Handle superior */}
          <View style={styles.dragHandle} />

          {/* Pastilla superior destacada con el nombre del recinto (boceto del usuario) */}
          <View style={styles.headerPillContainer}>
            <View style={styles.enclosurePill} testID="enclosure-sheet-title-pill">
              <AppText variant="subheading" bold color="text" center numberOfLines={1}>
                {place.name}
              </AppText>
            </View>

            <Pressable
              testID="enclosure-sheet-close-btn"
              accessibilityRole="button"
              accessibilityLabel="Cerrar ficha técnica del recinto"
              onPress={onClose}
              style={styles.closeCircleButton}
            >
              <AppText variant="body" bold color="text">
                ✕
              </AppText>
            </Pressable>
          </View>

          <AppText variant="caption" color="textMuted" style={styles.subtitleText}>
            {`🐾 Ejemplares que habitan en este recinto (${animals.length}) • Toca cada ficha para desplegar`}
          </AppText>

          {/* Lista de acordeones con cada animal del recinto (boceto del usuario con V desplegable) */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {animals.map((animal: EnclosureAnimalDetail) => {
              const isExpanded = Boolean(expandedAnimalIds[animal.id]);

              return (
                <View
                  key={animal.id}
                  testID={`enclosure-animal-accordion-${animal.id}`}
                  style={[
                    styles.accordionCard,
                    isExpanded && styles.accordionCardExpanded,
                  ]}
                >
                  {/* Cabecera del acordeón con icono, nombre, sexo y chevron desplegable V */}
                  <Pressable
                    testID={`toggle-animal-${animal.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isExpanded
                        ? `Ocultar datos de ${animal.nickname}`
                        : `Desplegar ficha de ${animal.nickname}`
                    }
                    onPress={() => toggleAccordion(animal.id)}
                    style={styles.accordionHeader}
                  >
                    <View style={styles.animalHeaderLeft}>
                      <View style={styles.emojiBadge}>
                        <AppText style={styles.emojiText}>{animal.iconEmoji}</AppText>
                      </View>

                      <View style={styles.nameGroup}>
                        <View style={styles.titleSexRow}>
                          <AppText variant="body" bold color="text">
                            {animal.nickname}
                          </AppText>
                          <View
                            style={[
                              styles.sexTag,
                              animal.sex === 'Macho'
                                ? styles.sexTagMale
                                : styles.sexTagFemale,
                            ]}
                          >
                            <AppText
                              variant="caption"
                              bold
                              color={animal.sex === 'Macho' ? 'primary' : 'text'}
                            >
                              {animal.sex === 'Macho' ? '♂ Macho' : '♀ Hembra'}
                            </AppText>
                          </View>
                        </View>
                        <AppText variant="caption" color="textMuted">
                          {animal.commonName}
                        </AppText>
                      </View>
                    </View>

                    {/* V desplegable dibujada en el boceto del usuario */}
                    <View style={styles.chevronWrapper}>
                      <AppText variant="body" bold color="primary">
                        {isExpanded ? '▲' : '∨'}
                      </AppText>
                    </View>
                  </Pressable>

                  {/* Cuerpo desplegado con la ficha técnica completa */}
                  {isExpanded && (
                    <View style={styles.accordionBody}>
                      {animal.scientificName ? (
                        <View style={styles.fieldRow}>
                          <AppText variant="caption" bold color="text">
                            🔬 Nombre científico:{' '}
                          </AppText>
                          <AppText
                            variant="caption"
                            color="textMuted"
                            style={styles.italicText}
                          >
                            {animal.scientificName}
                          </AppText>
                        </View>
                      ) : null}

                      <View style={styles.fieldRow}>
                        <AppText variant="caption" bold color="text">
                          🎂 Edad:{' '}
                        </AppText>
                        <AppText variant="caption" color="textMuted">
                          {animal.age}
                        </AppText>
                      </View>

                      <View style={styles.fieldRow}>
                        <AppText variant="caption" bold color="text">
                          📍 Origen / Procedencia:{' '}
                        </AppText>
                        <AppText variant="caption" color="textMuted">
                          {animal.origin}
                        </AppText>
                      </View>

                      <View style={styles.fieldRow}>
                        <AppText variant="caption" bold color="text">
                          ⏳ Longevidad:{' '}
                        </AppText>
                        <AppText variant="caption" color="textMuted">
                          {animal.longevity}
                        </AppText>
                      </View>

                      <View style={styles.fieldRow}>
                        <AppText variant="caption" bold color="text">
                          🥩/🌿 Dieta:{' '}
                        </AppText>
                        <AppText variant="caption" color="textMuted">
                          {animal.diet}
                        </AppText>
                      </View>

                      <View style={styles.fieldRow}>
                        <AppText variant="caption" bold color="text">
                          🍼 Reproducción:{' '}
                        </AppText>
                        <AppText variant="caption" color="textMuted">
                          {animal.reproduction}
                        </AppText>
                      </View>

                      <View style={styles.fieldRow}>
                        <AppText variant="caption" bold color="text">
                          🩺 Estado veterinario:{' '}
                        </AppText>
                        <AppText variant="caption" color="primary">
                          {animal.veterinaryStatus}
                        </AppText>
                      </View>

                      {animal.funFact ? (
                        <View style={styles.funFactBox}>
                          <AppText variant="caption" bold color="primary">
                            💡 Curiosidad biológica:{' '}
                          </AppText>
                          <AppText variant="caption" color="text">
                            {animal.funFact}
                          </AppText>
                        </View>
                      ) : null}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>

          {/* Botón inferior para regresar limpiamente al recorrido AR */}
          <View style={styles.footerRow}>
            <Pressable
              testID="enclosure-sheet-return-btn"
              accessibilityRole="button"
              accessibilityLabel="Volver al recorrido con cámara AR"
              onPress={onClose}
              style={styles.returnButton}
            >
              <AppText variant="body" bold color="textOnPrimary">
                ✕ Volver a la cámara AR
              </AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  backdropTouchArea: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    maxHeight: '82%',
    elevation: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginVertical: spacing.xs,
  },
  headerPillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  enclosurePill: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.text,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.overlaySubtle,
  },
  closeCircleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.overlaySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitleText: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  scrollContent: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  accordionCard: {
    borderWidth: 2,
    borderColor: colors.text,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  accordionCardExpanded: {
    borderColor: colors.primary,
    elevation: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    minHeight: 58,
  },
  animalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  emojiBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.successSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 20,
  },
  nameGroup: {
    flex: 1,
    gap: 2,
  },
  titleSexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sexTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
  },
  sexTagMale: {
    backgroundColor: colors.infoSurface,
  },
  sexTagFemale: {
    backgroundColor: colors.dangerSurface,
  },
  chevronWrapper: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionBody: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
    gap: 6,
  },
  fieldRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  italicText: {
    fontStyle: 'italic',
  },
  funFactBox: {
    backgroundColor: colors.successSurfaceSoft,
    borderRadius: radius.sm,
    padding: spacing.xs,
    marginTop: 4,
  },
  footerRow: {
    paddingTop: spacing.xs,
  },
  returnButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
