import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Card, ImageOrPlaceholder, ScreenContainer } from '../components/ui';
import { Animal } from '../models';
import { colors, radius, spacing } from '../theme/tokens';

interface QrResultScreenProps {
  animal: Animal | null;
  onDetailsPress: () => void;
  onContinuePress: () => void;
}

export function QrResultScreen({ animal, onDetailsPress, onContinuePress }: QrResultScreenProps) {
  if (!animal) {
    return (
      <ScreenContainer>
        <View style={styles.content}>
          <AppText variant="title">No se encontró el animal</AppText>
          <Button label="Seguir explorando" onPress={onContinuePress} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <AppText variant="title" color="primary" center>¡Descubierto!</AppText>
        <AppText variant="overline" color="textMuted" center>Guardado en colección</AppText>
        <Card style={styles.animalCard}>
          <ImageOrPlaceholder
            source={animal.imageUrl?.trim() ? { uri: animal.imageUrl.trim() } : null}
            tint={animal.placeholderTint}
            style={styles.animalImage}
          />
          <AppText variant="heading">{animal.nickname} — {animal.commonName}</AppText>
          <AppText variant="small" color="textMuted">{animal.scientificName}</AppText>
        </Card>
        {animal.funFact ? (
          <Card style={styles.fact}>
            <AppText variant="subheading">Dato divertido</AppText>
            <AppText variant="body">{animal.funFact}</AppText>
          </Card>
        ) : null}
        <Button label="Ver detalles" onPress={onDetailsPress} />
        <Button label="Seguir explorando" variant="soft" onPress={onContinuePress} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: spacing.lg, justifyContent: 'center', gap: spacing.md },
  animalCard: { padding: spacing.md, gap: spacing.xs },
  animalImage: { height: 180, borderRadius: radius.md },
  fact: { padding: spacing.md, backgroundColor: colors.accent, gap: spacing.xs },
});
