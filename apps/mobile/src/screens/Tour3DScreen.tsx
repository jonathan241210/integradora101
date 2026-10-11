import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Card, Icon, ScreenContainer } from '../components/ui';
import { colors, spacing } from '../theme/tokens';

interface Tour3DScreenProps {
  destination: string;
  onStopPress: () => void;
  onSwitchToMapPress: () => void;
  onSearchPress: () => void;
}

export function Tour3DScreen({ destination, onStopPress, onSwitchToMapPress, onSearchPress }: Tour3DScreenProps) {
  return (
    <ScreenContainer scroll={false} contentStyle={styles.screen}>
      <View style={styles.viewer}>
        <Icon name="cube-outline" size={64} color={colors.primary} />
        <AppText variant="heading" center>Recorrido 3D</AppText>
        <AppText variant="body" center color="textMuted">Recorrido de demostración · visor 3D próximamente</AppText>
      </View>
      <Card style={styles.route}>
        <AppText variant="overline" color="primary">Recorrido en curso</AppText>
        <AppText variant="heading">{destination}</AppText>
        <AppText variant="small" color="textMuted">Sigue explorando el zoológico</AppText>
        <Button label="Buscar animales" variant="soft" onPress={onSearchPress} />
        <Button label="Cambiar a Mapa 2D" onPress={onSwitchToMapPress} />
        <Button label="Detener recorrido" variant="outline" onPress={onStopPress} />
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: spacing.md, gap: spacing.md },
  viewer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.primarySoft, borderRadius: spacing.md, padding: spacing.lg },
  route: { gap: spacing.sm, padding: spacing.md },
});
