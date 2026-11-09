import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Card } from '../ui';
import { MapPlace } from '../../models';
import { spacing } from '../../theme/tokens';

interface ArrivalBannerProps {
  place: MapPlace | null;
  onDismiss: () => void;
}

/**
 * Banner visual accesible que se despliega cuando el visitante llega a menos de 10 m
 * del recinto destino seleccionado (CA-12).
 */
export function ArrivalBanner({ place, onDismiss }: ArrivalBannerProps) {
  if (!place) {
    return null;
  }

  return (
    <View style={styles.banner} testID="arrival-banner">
      <Card>
        <View style={styles.content}>
          <View style={styles.textGroup}>
            <AppText variant="overline" color="primary">
              Llegada al recinto
            </AppText>
            <AppText variant="subheading">
              {`¡Llegaste a ${place.name}!`}
            </AppText>
            <AppText variant="small" color="textMuted">
              Has alcanzado tu destino en el zoológico.
            </AppText>
          </View>
          <View testID="arrival-banner-dismiss">
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
    zIndex: 10,
  },
  content: {
    gap: spacing.sm,
  },
  textGroup: {
    gap: spacing.xs,
  },
});
