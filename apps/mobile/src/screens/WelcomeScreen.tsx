import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Icon, ScreenContainer } from '../components/ui';
import { APP_NAME } from '../constants';
import { colors, radius, spacing } from '../theme/tokens';

interface WelcomeScreenProps {
  onLogin: () => void;
  onRegister: () => void;
}

export function WelcomeScreen({ onLogin, onRegister }: WelcomeScreenProps) {
  return (
    <ScreenContainer>
      <View style={styles.page}>
        <View style={styles.brand}>
          <View style={styles.pawWrap}>
            <Icon name="paw" size={36} color={colors.primary} />
          </View>
          <AppText variant="heading" center color="textOnPrimary">{APP_NAME}</AppText>
          <AppText variant="body" center color="textOnPrimary">Crea tu cuenta o entra para guardar tu visita</AppText>
        </View>
        <Button label="Iniciar sesión" onPress={onLogin} />
        <Button label="Crear cuenta" onPress={onRegister} variant="outline" />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, gap: spacing.md, justifyContent: 'center', flex: 1 },
  brand: {
    backgroundColor: colors.base,
    borderRadius: radius.xl * 2,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  pawWrap: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
});
