import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppText } from './AppText';
import { Button } from './Button';
import { Card } from './Card';
import { Icon } from './Icon';
import { colors, spacing } from '../../theme/tokens';

interface GamePromoCardProps {
  onPress: () => void;
}

export function GamePromoCard({ onPress }: GamePromoCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.heading}>
        <Icon name="emoji-events" size={28} color={colors.primary} />
        <AppText variant="subheading" bold>Tu próxima aventura te espera</AppText>
      </View>
      <AppText variant="small" color="textMuted">
        Completa misiones, descubre animales y suma puntos durante tu visita.
      </AppText>
      <Button label="Ver misiones" onPress={onPress} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
