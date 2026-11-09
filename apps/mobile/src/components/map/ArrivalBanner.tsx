import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Card } from '../ui';
import { MapPlace } from '../../models';
import { colors, radius, spacing } from '../../theme/tokens';

interface ArrivalBannerProps {
  place: MapPlace | null;
  onDismiss: () => void;
}

/**
 * Banner visual prominente y accesible que se despliega cuando el visitante llega a menos de 4 m
 * del recinto destino seleccionado (CA-12).
 */
export function ArrivalBanner({ place, onDismiss }: ArrivalBannerProps) {
  if (!place) {
    return null;
  }

  return (
    <View style={styles.banner} testID="arrival-banner">
      <Card style={styles.cardHighlight}>
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <View style={styles.badge}>
              <AppText variant="caption" style={styles.badgeText}>
                🎯 LLEGADA AL RECINTO
              </AppText>
            </View>
          </View>
          <View style={styles.textGroup}>
            <AppText variant="subheading" style={styles.title}>
              {`¡Llegaste a ${place.name}!`}
            </AppText>
            <AppText variant="body" color="textMuted">
              {place.description || 'Has alcanzado tu destino en el zoológico.'}
            </AppText>
          </View>
          <View style={styles.buttonWrapper} testID="arrival-banner-dismiss">
            <Button
              label="Entendido"
              variant="primary"
              onPress={onDismiss}
            />
          </View>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    zIndex: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  cardHighlight: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  content: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  badgeText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  textGroup: {
    gap: 4,
  },
  title: {
    color: colors.text,
    fontWeight: '700',
  },
  buttonWrapper: {
    marginTop: spacing.xs,
  },
});
