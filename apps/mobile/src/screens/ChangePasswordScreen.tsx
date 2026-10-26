import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, BackButton, Button, ScreenContainer, TextField } from '../components/ui';
import { spacing } from '../theme/tokens';

interface ChangePasswordScreenProps {
  currentPassword: string;
  password: string;
  confirmation: string;
  error: string | null;
  notice: string | null;
  onCurrentPasswordChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmationChange: (value: string) => void;
  onSubmit: () => void;
  onBackPress: () => void;
  busy?: boolean;
}

export function ChangePasswordScreen(props: ChangePasswordScreenProps) {
  return (
    <ScreenContainer busyMessage={props.busy ? 'Guardando contraseña…' : null}>
      <View style={styles.page}>
        <BackButton onPress={props.onBackPress} accessibilityLabel="Volver a la cuenta" />
        <AppText variant="heading">Cambiar contraseña</AppText>
        <TextField label="Contraseña actual" value={props.currentPassword} onChangeText={props.onCurrentPasswordChange} secureTextEntry />
        <TextField label="Nueva contraseña" value={props.password} onChangeText={props.onPasswordChange} secureTextEntry />
        <TextField label="Confirmar contraseña" value={props.confirmation} onChangeText={props.onConfirmationChange} secureTextEntry />
        {props.notice ? <AppText variant="small">{props.notice}</AppText> : null}
        {props.error ? <AppText variant="small" color="danger" accessibilityLiveRegion="polite">{props.error}</AppText> : null}
        <Button label="Guardar contraseña" onPress={props.onSubmit} disabled={props.busy} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, gap: spacing.md },
});
