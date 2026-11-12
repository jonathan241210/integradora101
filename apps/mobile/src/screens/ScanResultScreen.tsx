import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, BackButton, Button, Icon, ScreenContainer } from '../components/ui';
import { colors, radius, spacing } from '../theme/tokens';
import type { ScanPresentation } from '../services/scanQueue';

interface ScanResultScreenProps {
  result: ScanPresentation;
  onBackPress: () => void;
  onRetryPress?: () => void;
  onOpenSpecies?: (id: string) => void;
}

type ResultMood = 'party' | 'known' | 'soft';

const MOOD: Record<ScanPresentation['kind'], ResultMood> = {
  discovered: 'party',
  already_discovered: 'known',
  invalid_code: 'soft',
  inactive_code: 'soft',
  expired_scan: 'soft',
  pending: 'soft',
  rate_limited: 'soft',
};

const ICON: Record<ScanPresentation['kind'], string> = {
  discovered: 'stars',
  already_discovered: 'bookmark',
  invalid_code: 'help-outline',
  inactive_code: 'help-outline',
  expired_scan: 'information-circle-outline',
  pending: 'information-circle-outline',
  rate_limited: 'information-circle-outline',
};

const CHEER: Record<ScanPresentation['kind'], string> = {
  discovered: '¡Lo lograste!',
  already_discovered: '¡Este ya es tuyo!',
  invalid_code: 'Probemos otro',
  inactive_code: 'Probemos otro',
  expired_scan: 'Vuelve a intentarlo',
  pending: 'Lo guardamos',
  rate_limited: 'Un momento',
};

export function ScanResultScreen({ result, onBackPress, onRetryPress, onOpenSpecies }: ScanResultScreenProps) {
  const unlocked = result.unlockedSpecies ?? [];
  const known = result.alreadyKnownSpecies ?? [];
  const unlockedNames = unlocked.length > 0 ? unlocked.map((species) => species.name) : (result.newSpecies ?? []);
  const mood = MOOD[result.kind];
  const ink = mood === 'party' ? colors.textOnPrimary : colors.textOnSecondary;

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <BackButton onPress={onBackPress} />
        <View style={[styles.banner, styles[mood]]}>
          <View style={styles.badge}>
            <Icon name={ICON[result.kind]} size={36} color={colors.primary} />
          </View>
          <AppText variant="small" bold center style={{ color: ink }}>{CHEER[result.kind]}</AppText>
          <AppText variant="heading" center style={{ color: ink }} accessibilityRole="header">{result.title}</AppText>
          {result.kind === 'discovered' && result.pointsAwarded !== undefined ? (
            <AppText variant="heading" center style={styles.points}>+{result.pointsAwarded} puntos</AppText>
          ) : null}
          {result.kind === 'discovered' ? null : unlockedNames.map((name) => (
            <AppText key={name} variant="title" center style={{ color: ink }}>{name}</AppText>
          ))}
          <AppText variant="body" center style={{ color: ink }}>{result.message}</AppText>
          {result.kind !== 'discovered' && unlockedNames.length > 0 ? (
            <AppText variant="small" center style={{ color: ink }}>
              {unlockedNames.length === 1
                ? `Se desbloqueó ${unlockedNames[0]}.`
                : `En este recinto se desbloquearon: ${unlockedNames.join(', ')}.`}
            </AppText>
          ) : null}
          {known.length > 0 ? (
            <AppText variant="small" center style={{ color: ink }}>
              Ya estaban en tu colección: {known.map((species) => species.name).join(', ')}.
            </AppText>
          ) : null}
        </View>
        {unlocked.length > 0 ? (
          <View style={styles.actions}>
            {unlocked.map((species) => (
              <Pressable
                key={species.id}
                accessibilityRole="button"
                accessibilityLabel={`Ver ${species.name}`}
                onPress={() => onOpenSpecies?.(species.id)}
                style={styles.animalButton}
              >
                <AppText variant="body" bold center color="textOnPrimary" style={styles.animalLabel}>{`Ver ${species.name}`}</AppText>
              </Pressable>
            ))}
          </View>
        ) : null}
        {result.kind === 'pending' || result.kind === 'rate_limited' ? (
          <Button label="Reintentar" onPress={onRetryPress ?? onBackPress} />
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  banner: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
  party: { backgroundColor: colors.primary },
  known: { backgroundColor: colors.secondary },
  soft: { backgroundColor: colors.accent },
  badge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  points: { color: colors.accent, fontSize: 32, lineHeight: 40 },
  actions: { alignSelf: 'stretch', gap: spacing.sm },
  animalButton: {
    alignSelf: 'stretch',
    flexShrink: 0,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  animalLabel: { flexShrink: 1 },
});
