import React from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { AppText, BackButton, Button, Card, Icon, ScreenContainer } from '../components/ui';
import { VisitorPreferenceKey, VisitorPreferences } from '../models';
import { colors, radius, spacing } from '../theme/tokens';

interface SettingsScreenProps {
  accountName: string;
  accountEmail: string;
  preferences: VisitorPreferences;
  onToggle: (key: VisitorPreferenceKey, value: boolean) => void;
  onAccountPress: () => void;
  onPrivacyPress: () => void;
  onHelpPress: () => void;
  onAboutPress: () => void;
  onLogout: () => void;
  onBackPress: () => void;
}

const preferenceRows: { key: VisitorPreferenceKey; label: string; icon: string; hint: string }[] = [
  { key: 'notifications', label: 'Notificaciones', icon: 'notifications', hint: 'Solo cambia el estado en pantalla' },
  { key: 'darkMode', label: 'Modo oscuro', icon: 'moon-outline', hint: 'No cambia el tema; la aplicación permanece en modo claro' },
  { key: 'location', label: 'Ubicación', icon: 'location-outline', hint: 'No solicita la ubicación del teléfono' },
];

export function SettingsScreen({
  accountName,
  accountEmail,
  preferences,
  onToggle,
  onAccountPress,
  onPrivacyPress,
  onHelpPress,
  onAboutPress,
  onLogout,
  onBackPress,
}: SettingsScreenProps) {
  return (
    <ScreenContainer>
      <View style={styles.page}>
        <BackButton onPress={onBackPress} accessibilityLabel="Volver al perfil" />
        <AppText variant="heading">Ajustes</AppText>
        <Pressable onPress={onAccountPress} accessibilityRole="button" accessibilityLabel={`Cuenta de ${accountName}`}>
          <Card style={styles.accountCard}>
            <View style={styles.avatar}>
              <Icon name="person" size={22} color={colors.primary} />
            </View>
            <View style={styles.accountText}>
              <AppText variant="subheading" bold>{accountName}</AppText>
              <AppText variant="small" color="textMuted">{accountEmail}</AppText>
            </View>
            <Icon name="chevron-forward" size={20} color={colors.textMuted} />
          </Card>
        </Pressable>

        <AppText variant="overline" color="textMuted">Preferencias</AppText>
        <Card style={styles.group}>
          {preferenceRows.map((row) => (
            <View key={row.key} style={styles.row}>
              <Icon name={row.icon} size={20} color={colors.primary} />
              <AppText variant="body" style={styles.rowLabel}>{row.label}</AppText>
              <Switch
                accessibilityLabel={row.label}
                accessibilityHint={row.hint}
                value={preferences[row.key]}
                onValueChange={(value) => onToggle(row.key, value)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </View>
          ))}
        </Card>

        <AppText variant="overline" color="textMuted">Ayuda y privacidad</AppText>
        <Card style={styles.group}>
          <SettingsLink icon="shield-outline" label="Privacidad" onPress={onPrivacyPress} />
          <SettingsLink icon="help-outline" label="Ayuda y soporte" onPress={onHelpPress} />
          <SettingsLink icon="information-circle-outline" label="Acerca de ARCA-NB" detail="v1.0.0" onPress={onAboutPress} />
        </Card>
        <Button label="Cerrar sesión" variant="outline" onPress={onLogout} />
      </View>
    </ScreenContainer>
  );
}

function SettingsLink({ icon, label, detail, onPress }: { icon: string; label: string; detail?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={detail ? `${label} ${detail}` : label} style={styles.row}>
      <Icon name={icon} size={20} color={colors.primary} />
      <AppText variant="body" style={styles.rowLabel}>{label}</AppText>
      {detail ? <AppText variant="small" color="textMuted">{detail}</AppText> : null}
      <Icon name="chevron-forward" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, gap: spacing.md },
  accountCard: {
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountText: { flex: 1, gap: 2 },
  group: { backgroundColor: colors.surface, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48 },
  rowLabel: { flex: 1 },
});
