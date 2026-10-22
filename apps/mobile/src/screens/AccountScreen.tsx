import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, BackButton, Card, Icon, ScreenContainer } from '../components/ui';
import { colors, radius, spacing } from '../theme/tokens';

interface AccountScreenProps {
  displayName: string;
  email: string;
  warning: string;
  onBackPress: () => void;
}

export function AccountScreen({ displayName, email, warning, onBackPress }: AccountScreenProps) {
  return (
    <ScreenContainer>
      <View style={styles.page}>
        <BackButton onPress={onBackPress} accessibilityLabel="Volver a ajustes" />
        <AppText variant="heading">Mi cuenta</AppText>
        <Card style={styles.card}>
          <View style={styles.avatar}>
            <Icon name="person" size={28} color={colors.primary} />
          </View>
          <AppText variant="title" center>{displayName}</AppText>
          <AppText variant="body" center color="textMuted">{email}</AppText>
        </Card>
        <View style={styles.warning} accessibilityRole="alert">
          <AppText variant="small">{warning}</AppText>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, gap: spacing.md },
  card: { backgroundColor: colors.surface, alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warning: { backgroundColor: colors.accent, borderRadius: radius.md, padding: spacing.md },
});
