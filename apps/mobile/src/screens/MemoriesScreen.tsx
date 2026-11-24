import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, BackButton, Button, Card, EmptyView, Icon, ScreenContainer, TitledLoading } from '../components/ui';
import { weeklyText } from '../memories/memoryCopy';
import { colors, radius, spacing } from '../theme/tokens';

export type MemoryCardModel = {
  id: number;
  title: string;
  statusLabel: string;
  reason: string | null;
  notes: string[];
  publication: string | null;
  sentNote: string | null;
  canCorrect: boolean;
  status: 'submitted' | 'in_review' | 'accepted' | 'rejected';
};

interface MemoriesScreenProps {
  loading: boolean;
  error: string | null;
  items: MemoryCardModel[];
  canSubmit: boolean;
  nextSubmissionAt: string | null;
  openRequestId: number | null;
  onCreate: () => void;
  onOpen: (id: number) => void;
  onRetry: () => void;
  onBack: () => void;
}

function edgeColor(status: MemoryCardModel['status']): string {
  if (status === 'rejected') return colors.danger;
  if (status === 'accepted') return colors.accent;
  return colors.primary;
}

function pillColors(status: MemoryCardModel['status']): { backgroundColor: string; text: 'textOnPrimary' | 'text' | 'primary' | 'danger' } {
  if (status === 'rejected') return { backgroundColor: colors.dangerSurface, text: 'danger' };
  if (status === 'accepted') return { backgroundColor: colors.accent, text: 'text' };
  if (status === 'in_review') return { backgroundColor: colors.primarySoft, text: 'primary' };
  return { backgroundColor: colors.primary, text: 'textOnPrimary' };
}

export function MemoriesScreen({
  loading,
  error,
  items,
  canSubmit,
  nextSubmissionAt,
  openRequestId,
  onCreate,
  onOpen,
  onRetry,
  onBack,
}: MemoriesScreenProps) {
  if (loading) {
    return (
      <ScreenContainer scroll={false}>
        <TitledLoading title="Mis memorias" message="Cargando memorias…" />
      </ScreenContainer>
    );
  }

  const blocked = !canSubmit || openRequestId != null;

  return (
    <ScreenContainer>
      <View style={styles.page}>
        <BackButton onPress={onBack} accessibilityLabel="Volver al perfil" />
        <View style={styles.titleRow}>
          <Icon name="images" size={28} color={colors.primary} />
          <AppText variant="title">Mis memorias</AppText>
        </View>
        <AppText variant="body" color="textMuted">
          El zoológico revisa cada foto antes de mostrarla en el portal.
        </AppText>

        {error ? (
          <Card style={styles.notice}>
            <AppText variant="body" color="danger" accessibilityLiveRegion="polite">{error}</AppText>
            <Button label="Reintentar" variant="outline" onPress={onRetry} />
          </Card>
        ) : null}

        {!canSubmit && nextSubmissionAt ? (
          <Card style={styles.notice}>
            <AppText variant="body" accessibilityLiveRegion="polite">{weeklyText(nextSubmissionAt)}</AppText>
          </Card>
        ) : null}

        {blocked ? null : (
          <Button label="Enviar un momento" onPress={onCreate} />
        )}

        {items.length === 0 && !error ? (
          <EmptyView title="Aún no hay memorias" message="Cuando envíes una foto, su estado aparecerá aquí." />
        ) : (
          items.map((item) => {
            const pill = pillColors(item.status);
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`Ver ${item.title}`}
                onPress={() => onOpen(item.id)}
              >
                <Card style={[styles.row, { borderLeftColor: edgeColor(item.status) }]}>
                  <View style={styles.rowHead}>
                    <AppText variant="subheading" bold style={styles.flex}>{item.title}</AppText>
                    <View style={[styles.pill, { backgroundColor: pill.backgroundColor }, item.status === 'in_review' && styles.pillOutline]}>
                      <AppText variant="small" bold color={pill.text}>{item.statusLabel}</AppText>
                    </View>
                  </View>
                  {item.reason ? <AppText variant="body">Motivo: {item.reason}</AppText> : null}
                  {item.notes.map((note) => (
                    <AppText key={note} variant="small">{note}</AppText>
                  ))}
                  {item.sentNote ? <AppText variant="body">{item.sentNote}</AppText> : null}
                  {item.publication ? <AppText variant="small" color="textMuted">{item.publication}</AppText> : null}
                  {item.canCorrect ? (
                    <Button label="Corregir y reenviar" variant="soft" onPress={() => onOpen(item.id)} />
                  ) : (
                    <AppText variant="small" color="textMuted">Toca para ver lo enviado y su estado.</AppText>
                  )}
                </Card>
              </Pressable>
            );
          })
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, gap: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  notice: {
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  row: {
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderRadius: radius.lg,
  },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  pill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pillOutline: { borderWidth: 1, borderColor: colors.primary },
});
