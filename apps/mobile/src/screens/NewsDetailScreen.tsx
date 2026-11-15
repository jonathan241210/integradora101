import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, BackButton, Card, ImageOrPlaceholder, OfflineBanner, ScreenContainer } from '../components/ui';
import { News } from '../models';
import { colors, spacing } from '../theme/tokens';

interface NewsDetailScreenProps {
  news: News | null;
  loading?: boolean;
  error?: string | null;
  isOffline?: boolean;
  onBackPress: () => void;
}

export function NewsDetailScreen({ news, loading = false, error, isOffline = false, onBackPress }: NewsDetailScreenProps) {
  if (loading) {
    return (
      <ScreenContainer scroll={false}>
        <View style={styles.message}>
          <AppText variant="body">Cargando la noticia…</AppText>
        </View>
      </ScreenContainer>
    );
  }

  if (error || !news) {
    return (
      <ScreenContainer>
        <View style={styles.message}>
          <AppText variant="body">{error || 'No se encontró la noticia.'}</AppText>
          <BackButton onPress={onBackPress} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {isOffline && <OfflineBanner />}
      <View style={styles.content}>
        <BackButton onPress={onBackPress} />
        <AppText variant="title">{news.title}</AppText>
        {news.date ? <AppText variant="body" color="textMuted">{news.date}</AppText> : null}
        <ImageOrPlaceholder
          source={news.imageUrl?.trim() ? { uri: news.imageUrl.trim() } : null}
          tint={colors.primary}
          style={styles.image}
        />
        {news.content ? (
          <Card style={styles.details}>
            <AppText variant="body">{news.content}</AppText>
          </Card>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  message: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  image: { width: '100%', height: 200, borderWidth: 1, borderColor: colors.accent },
  details: { gap: spacing.sm },
});
