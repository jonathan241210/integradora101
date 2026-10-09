import { View, FlatList, ScrollView, StyleSheet } from 'react-native';
import { ScreenContainer, AppText, SearchBar, Chip, AnimalListItem, BackButton } from '../components/ui';
import { colors, spacing } from '../theme/tokens';
import { Animal } from '../models';

interface SearchScreenProps {
  animals: Animal[];
  query: string;
  activeFilter: 'all' | NonNullable<Animal['category']>;
  selectForTour?: boolean;
  backLabel?: string;
  onQueryChange: (query: string) => void;
  onFilterChange: (filter: SearchScreenProps['activeFilter']) => void;
  onAnimalPress: (id: string) => void;
  onBackPress: () => void;
}

export function SearchScreen({
  animals,
  query,
  activeFilter,
  selectForTour = false,
  backLabel = 'Volver a inicio',
  onQueryChange,
  onFilterChange,
  onAnimalPress,
  onBackPress,
}: SearchScreenProps) {
  const filters: { key: SearchScreenProps['activeFilter']; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'mammals', label: 'Mamíferos' },
    { key: 'birds', label: 'Aves' },
    { key: 'reptiles', label: 'Reptiles' },
    { key: 'aquatic', label: 'Acuáticos' },
  ];

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.container}>
        <BackButton onPress={onBackPress} accessibilityLabel={backLabel} />
        <AppText variant="title" style={styles.title}>Explorar Animales</AppText>
        {selectForTour && (
          <AppText variant="small" color="textMuted">
            Selecciona un animal para definir el destino del recorrido 3D.
          </AppText>
        )}
        
        <SearchBar 
          value={query} 
          onChangeText={onQueryChange}
          placeholder="Buscar animal..." 
        />

        <ScrollView
          horizontal
          testID="animal-category-filters"
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContainer}
          keyboardShouldPersistTaps="handled"
        >
          {filters.map((f) => (
            <Chip
              key={f.key}
              label={f.label}
              selected={activeFilter === f.key}
              onPress={() => onFilterChange(f.key)}
            />
          ))}
        </ScrollView>

        <FlatList
          data={animals}
          keyExtractor={(a) => a.id}
          keyboardShouldPersistTaps="handled"
          style={styles.results}
          testID="animal-results"
          renderItem={({ item }) => (
            <AnimalListItem animal={item} onPress={() => onAnimalPress(item.id)} />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <AppText variant="body" color="textMuted" center>
              No encontramos animales con esta búsqueda.
            </AppText>
          }
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0, padding: spacing.lg, gap: spacing.md },
  title: { marginBottom: spacing.sm },
  filterScroll: { flexGrow: 0, marginBottom: spacing.xs },
  filterContainer: { flexDirection: 'row', gap: spacing.sm },
  results: { flex: 1 },
  list: { gap: spacing.sm, paddingBottom: spacing.lg, flexGrow: 1 },
});
