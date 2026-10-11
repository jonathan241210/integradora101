import React from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { ScreenContainer, AppText, ProgressBar, Chip, Card, ImageOrPlaceholder } from '../components/ui';
import { colors, spacing, radius } from '../theme/tokens';
import { Animal } from '../models';

interface CollectionScreenProps {
  animals: Animal[];
  progress: { discovered: number; total: number };
  onAnimalPress: (id: string) => void;
}

export function CollectionScreen({ animals, progress, onAnimalPress }: CollectionScreenProps) {
  const [filter, setFilter] = React.useState('all');

  const filteredAnimals = animals.filter(a => {
    if (filter === 'discovered') return a.isDiscovered;
    if (filter === 'undiscovered') return !a.isDiscovered;
    return true;
  });

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.header}>
        <AppText variant="title">Mi Colección</AppText>
        <View style={styles.progressCard}>
          <AppText variant="overline" color="accent">Nivel de explorador</AppText>
          <AppText variant="title" color="textOnPrimary">
            {progress.discovered} de {progress.total} descubiertos
          </AppText>
          <ProgressBar
            value={progress.discovered / progress.total}
            label="Progreso de la colección"
            labelColor="textOnPrimary"
          />
          <AppText variant="caption" color="textOnPrimary">
            ¡Buen trabajo! Te faltan {progress.total - progress.discovered} animales para completar el zoológico.
          </AppText>
        </View>
        <View style={styles.filterRow}>
          {['all', 'discovered', 'undiscovered'].map(f => (
            <Chip 
              key={f} 
              label={f === 'all' ? 'Todos' : f === 'discovered' ? 'Descubiertos' : 'Por Descubrir'} 
              selected={filter === f} 
              onPress={() => setFilter(f)} 
            />
          ))}
        </View>
      </View>

      <FlatList
        data={filteredAnimals}
        keyExtractor={(a) => a.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.animalCardSlot}
              accessibilityRole="button"
              accessibilityLabel={item.isDiscovered ? `Ver ${item.commonName}` : `Vista previa de ${item.commonName}, por descubrir`}
              onPress={() => onAnimalPress(item.id)}
            >
              <Card style={styles.animalCard}>
                <ImageOrPlaceholder
                  source={item.imageUrl?.trim() ? { uri: item.imageUrl.trim() } : null}
                  tint={item.placeholderTint}
                  style={styles.imagePlaceholder}
                />
                <AppText variant="small" bold center style={styles.animalName}>{item.commonName}</AppText>
                <AppText variant="caption" center>{item.isDiscovered ? '✓ Descubierto' : '🔒 Bloqueado'}</AppText>
              </Card>
            </TouchableOpacity>
          );
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { padding: spacing.lg, gap: spacing.md },
  progressCard: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  filterRow: { flexDirection: 'row', gap: spacing.sm },
  list: { padding: spacing.lg, gap: spacing.md },
  gridRow: { justifyContent: 'space-between' },
  animalCardSlot: { width: '48%' },
  animalCard: { width: '100%', padding: spacing.sm, alignItems: 'center', gap: spacing.xs },
  animalName: { width: '100%', minHeight: 36 },
  imagePlaceholder: { width: 80, height: 80, borderRadius: radius.md, marginBottom: spacing.sm }
});
