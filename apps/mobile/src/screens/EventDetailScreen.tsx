import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { AppText, BackButton, Card, ImageOrPlaceholder, ScreenContainer } from '../components/ui';
import { ZooEvent } from '../models';
import { colors, spacing } from '../theme/tokens';

interface EventDetailScreenProps {
  event: ZooEvent | null;
  loading?: boolean;
  error?: string | null;
  onBackPress: () => void;
}

export function EventDetailScreen({ event, loading = false, error, onBackPress }: EventDetailScreenProps) {
  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.message}>
          <AppText variant="body">Cargando información del evento…</AppText>
        </View>
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer>
        <View style={styles.message}>
          <AppText variant="body">{error}</AppText>
          <BackButton onPress={onBackPress} />
        </View>
      </ScreenContainer>
    );
  }

  if (!event) {
    return (
      <ScreenContainer>
        <View style={styles.message}>
          <AppText variant="body">No se encontró el evento.</AppText>
          <BackButton onPress={onBackPress} />
        </View>
      </ScreenContainer>
    );
  }

  const images = event.imageUrls?.length ? event.imageUrls : [null];

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <BackButton onPress={onBackPress} />
        <AppText variant="title">{event.title}</AppText>
        <FlatList
          horizontal
          testID="event-image-carousel"
          data={images}
          keyExtractor={(image, index) => image ? `${index}:${image}` : `placeholder-${index}`}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.imageList}
          renderItem={({ item }) => (
            <ImageOrPlaceholder
              source={item?.trim() ? { uri: item.trim() } : null}
              tint={colors.primary}
              style={styles.eventImage}
            />
          )}
        />
        <Card style={styles.details}>
          <AppText variant="subheading" bold>Fecha y horario</AppText>
          <AppText variant="body">{event.date} · {event.time}</AppText>
          <AppText variant="subheading" bold style={styles.locationTitle}>Lugar</AppText>
          <AppText variant="body">{event.location}</AppText>
        </Card>
        <Card style={styles.details}>
          <AppText variant="subheading" bold>Acerca del evento</AppText>
          <AppText variant="body" color="textMuted">{event.description}</AppText>
        </Card>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  message: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  imageList: { gap: spacing.md },
  eventImage: { width: 280, height: 180 },
  details: { gap: spacing.sm },
  locationTitle: { marginTop: spacing.sm },
});
