import { View, FlatList, ScrollView, StyleSheet, Pressable } from 'react-native';
import { ScreenContainer, AppText, SearchBar, Chip, AnimalListItem, BackButton, OfflineBanner } from '../components/ui';
import { colors, radius, spacing } from '../theme/tokens';
import { Animal, MapPlace } from '../models';

export type SearchFilter = 'all' | 'animal' | 'service';

export interface SearchPlaceResult {
  id: string;
  name: string;
  description?: string;
  kind: MapPlace['kind'];
  placeTypeLabel?: string;
}

interface SearchScreenProps {
  animals: Animal[];
  places?: SearchPlaceResult[];
  query: string;
  activeFilter: SearchFilter;
  selectForTour?: boolean;
  selectionHint?: string;
  backLabel?: string;
  isOffline?: boolean;
  onQueryChange: (query: string) => void;
  onFilterChange: (filter: SearchFilter) => void;
  onAnimalPress: (id: string) => void;
  onPlacePress?: (id: string) => void;
  onBackPress: () => void;
}

function placeKindLabel(place: SearchPlaceResult): string {
  if (place.placeTypeLabel) return place.placeTypeLabel;
  if (place.kind === 'service' || place.kind === 'zoo_place') return 'Servicio';
  if (place.kind === 'entrance') return 'Acceso';
  return 'Lugar';
}

function PlaceResultItem({ place, onPress }: { place: SearchPlaceResult; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.placeItem} accessibilityRole="button" accessibilityLabel={`${place.name}, ${placeKindLabel(place)}`}>
      <View style={styles.placeIcon}>
        <AppText variant="body" bold style={styles.placeIconText}>
          {place.kind === 'animal' ? 'A' : 'S'}
        </AppText>
      </View>
      <View style={styles.placeContent}>
        <AppText variant="body" bold>{place.name}</AppText>
        <AppText variant="small" color="textMuted">
          {place.description || placeKindLabel(place)}
        </AppText>
      </View>
    </Pressable>
  );
}

export function SearchScreen({
  animals,
  places = [],
  query,
  activeFilter,
  selectForTour = false,
  selectionHint,
  backLabel = 'Volver a inicio',
  isOffline = false,
  onQueryChange,
  onFilterChange,
  onAnimalPress,
  onPlacePress,
  onBackPress,
}: SearchScreenProps) {
  const filters: { key: SearchFilter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'animal', label: 'Animales' },
    { key: 'service', label: 'Servicios' },
  ];

  const showAnimals = activeFilter === 'all' || activeFilter === 'animal';
  const showPlaces = activeFilter === 'all' || activeFilter === 'service';
  const visibleAnimals = showAnimals ? animals : [];
  const visiblePlaces = showPlaces ? places : [];
  const hasResults = visibleAnimals.length > 0 || visiblePlaces.length > 0;

  return (
    <ScreenContainer scroll={false}>
      {isOffline && <OfflineBanner />}
      <View style={styles.container}>
        <BackButton onPress={onBackPress} accessibilityLabel={backLabel} />
        <AppText variant="title" style={styles.title}>Buscar</AppText>
        {selectForTour && (
          <AppText variant="small" color="textMuted">
            {selectionHint ?? 'Selecciona un resultado para definir el destino en el mapa.'}
          </AppText>
        )}

        <SearchBar
          value={query}
          onChangeText={onQueryChange}
          placeholder="Buscar animal o servicio..."
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
          data={[{ key: 'results' }]}
          keyExtractor={(item) => item.key}
          keyboardShouldPersistTaps="handled"
          style={styles.results}
          testID="animal-results"
          renderItem={() => (
            <View style={styles.list}>
              {visibleAnimals.length > 0 && (
                <View style={styles.section}>
                  {activeFilter === 'all' && <AppText variant="small" bold color="textMuted">Animales</AppText>}
                  {visibleAnimals.map((animal) => (
                    <AnimalListItem key={`animal-${animal.id}`} animal={animal} onPress={() => onAnimalPress(animal.id)} />
                  ))}
                </View>
              )}
              {visiblePlaces.length > 0 && (
                <View style={styles.section}>
                  {activeFilter === 'all' && <AppText variant="small" bold color="textMuted">Servicios y lugares</AppText>}
                  {visiblePlaces.map((place) => (
                    <PlaceResultItem
                      key={`place-${place.id}`}
                      place={place}
                      onPress={() => onPlacePress?.(place.id)}
                    />
                  ))}
                </View>
              )}
              {!hasResults && (
                <AppText variant="body" color="textMuted" center>
                  No encontramos resultados con esta búsqueda.
                </AppText>
              )}
            </View>
          )}
          contentContainerStyle={styles.listContainer}
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
  listContainer: { paddingBottom: spacing.lg, flexGrow: 1 },
  list: { gap: spacing.sm, flexGrow: 1 },
  section: { gap: spacing.sm },
  placeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  placeIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeIconText: {
    color: colors.primary,
  },
  placeContent: {
    flex: 1,
    gap: 2,
  },
});
