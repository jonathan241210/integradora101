import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, BackButton, Button, ScreenContainer, TextField } from '../components/ui';
import { colors, radius, spacing } from '../theme/tokens';

interface DeleteAccountScreenProps {
  password: string;
  error: string | null;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  onBackPress: () => void;
}

export function DeleteAccountScreen({ password, error, onPasswordChange, onSubmit, onBackPress }: DeleteAccountScreenProps) {
  return (
    <ScreenContainer>
      <View style={styles.page}>
        <BackButton onPress={onBackPress} accessibilityLabel="Volver a la cuenta" />
        <AppText variant="heading">Borrar cuenta</AppText>
        <View style={styles.warning} accessibilityRole="alert">
          <AppText variant="small">El borrado es definitivo e inmediato. Se eliminan la cuenta y los datos de esta visita de prueba.</AppText>
        </View>
        <TextField label="Contraseña" value={password} onChangeText={onPasswordChange} secureTextEntry />
        {error ? <AppText variant="small" color="danger" accessibilityLiveRegion="polite">{error}</AppText> : null}
        <Button label="Borrar mi cuenta" variant="danger" onPress={onSubmit} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, gap: spacing.md },
  warning: { backgroundColor: colors.accent, borderRadius: radius.md, padding: spacing.md },
});
