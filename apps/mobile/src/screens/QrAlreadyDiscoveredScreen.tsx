import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Card, ImageOrPlaceholder, ScreenContainer } from '../components/ui';
import { Animal } from '../models';
import { radius, spacing } from '../theme/tokens';

interface QrAlreadyDiscoveredScreenProps {
  animal: Animal | null;
  onCollectionPress: () => void;
  onContinuePress: () => void;
}

export function QrAlreadyDiscoveredScreen({ animal, onCollectionPress, onContinuePress }: QrAlreadyDiscoveredScreenProps) {
  return (
    <ScreenContainer>
      <View style={styles.content}>
        <AppText variant="title" color="accent" center>¡Ya descubierto!</AppText>
        <AppText variant="body" center>
          {animal ? `Ya descubriste a ${animal.nickname}, ${animal.commonName}.` : 'Este animal ya está guardado en tu colección.'}
        </AppText>
        {animal ? (
          <Card style={styles.animalCard}>
            <ImageOrPlaceholder
              source={animal.imageUrl?.trim() ? { uri: animal.imageUrl.trim() } : null}
              tint={animal.placeholderTint}
              style={styles.animalImage}
            />
            <AppText variant="heading">{animal.commonName}</AppText>
          </Card>
        ) : null}
        <Button label="Ver en colección" onPress={onCollectionPress} />
        <Button label="Seguir explorando" variant="soft" onPress={onContinuePress} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  animalCard: { padding: spacing.md, gap: spacing.sm },
  animalImage: { height: 180, borderRadius: radius.md },
});
