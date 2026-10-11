import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { ScreenContainer, SectionHeader, HeroBanner, BrandHeader, AnimalHighlightCard, EventCard, HighlightNewsCard, GamePromoCard } from '../components/ui';
import { colors, spacing } from '../theme/tokens';
import { Animal, ZooEvent, News } from '../models';

interface HomeScreenProps {
  appName: string;
  featuredAnimals: Animal[];
  events: ZooEvent[];
  news: News;
  onNotificationsPress?: () => void;
  onSeeAllAnimalsPress?: () => void;
  onAnimalPress?: (id: string) => void;
  onEventPress?: (id: string) => void;
  onOpenMissionsPress?: () => void;
}

export function HomeScreen({ 
  appName, featuredAnimals, events, news, 
  onNotificationsPress, onSeeAllAnimalsPress, onAnimalPress, onEventPress, onOpenMissionsPress
}: HomeScreenProps) {
  // Asegurar que los datos sean siempre arrays válidos y filtrar elementos inválidos
  const safeFeaturedAnimals = Array.isArray(featuredAnimals) ? featuredAnimals : [];
  const safeEvents = Array.isArray(events) ? events : [];
  
  // Filtrar cualquier elemento undefined, null o vacío
  const filteredFeaturedAnimals = safeFeaturedAnimals.filter(
    (animal): animal is Animal => animal !== undefined && animal !== null
  );
  const filteredEvents = safeEvents.filter(
    (event): event is ZooEvent => event !== undefined && event !== null
  );
  
  // Si por alguna razón no hay datos válidos, usar arrays vacíos para evitar errores
  const displayAnimals = filteredFeaturedAnimals.length > 0 ? filteredFeaturedAnimals : [];
  const displayEvents = filteredEvents.length > 0 ? filteredEvents : [];
  
  return (
    <ScreenContainer>
      <View style={styles.headerSection}>
        <BrandHeader appName={appName} onBellPress={onNotificationsPress} />
        <HeroBanner 
          overline="¡Hola, explorador!" 
          title="Bienvenido al Zoológico" 
          subtitle="¿Qué hábitat descubriremos juntos hoy?" 
        />
        <SectionHeader 
          title="Animales Destacados" 
          actionLabel="Ver todo" 
          onActionPress={onSeeAllAnimalsPress} 
        />
      </View>

      <FlatList
        horizontal
        data={displayAnimals}
        keyExtractor={(item, index) => {
          // Usar el id del item si está disponible, de lo contrario usar un key estable basado en el índice
          // Esto evita las claves aleatorias que pueden causar problemas en la reconciliación de React
          if (item && item.id) {
            return item.id;
          }
          // Usar un prefijo + índice para asegurar unicidad y estabilidad
          return `item-${index}`;
        }}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carousel}
        renderItem={({ item }) => {
          // Como ya filtramos los elementos inválidos, este debería ser siempre válido
          // Pero añadimos una verificación adicional por seguridad
          if (!item) {
            return null; // React Native maneja mejor los nulls en renderItem que los elementos no filtrados
          }
          return (
            <AnimalHighlightCard 
              animal={item} 
              onPress={() => {
                // Doble verificación para evitar llamadas a funciones con datos inválidos
                if (onAnimalPress && item && item.id) {
                  onAnimalPress(item.id);
                }
              }} 
            />
          );
        }}
      />

      <View style={styles.newsSection}>
        <HighlightNewsCard news={news} />
        <GamePromoCard onPress={() => onOpenMissionsPress?.()} />
        <SectionHeader title="Próximos Eventos" />
        <View style={styles.eventsList}>
          {displayEvents.map((event) => {
            // Filtrado adicional por seguridad
            if (!event) {
              return null;
            }
            return <EventCard key={event.id} event={event} onPress={() => onEventPress?.(event.id)} />;
          })}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerSection: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  carousel: { paddingHorizontal: spacing.lg, gap: spacing.md, marginVertical: spacing.lg },
  newsSection: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  eventsList: { gap: spacing.md },
});
