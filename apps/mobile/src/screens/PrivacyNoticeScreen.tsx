import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, BackButton, ScreenContainer } from '../components/ui';
import { spacing } from '../theme/tokens';

interface PrivacyNoticeScreenProps {
  version: string;
  content: string;
  onBackPress: () => void;
}

export function PrivacyNoticeScreen({ version, content, onBackPress }: PrivacyNoticeScreenProps) {
  return (
    <ScreenContainer>
      <View style={styles.page}>
        <BackButton onPress={onBackPress} accessibilityLabel="Volver al registro" />
        <AppText variant="heading">Aviso de privacidad</AppText>
        <AppText variant="small" color="textMuted">Versión {version}</AppText>
        <AppText variant="body">{content}</AppText>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, gap: spacing.md },
});
