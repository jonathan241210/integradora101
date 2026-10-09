import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HomeScreen } from '../src/screens/HomeScreen';
import { SearchScreen } from '../src/screens/SearchScreen';
import { AnimalDetailScreen } from '../src/screens/AnimalDetailScreen';
import { AnimalHighlightCard } from '../src/components/ui/AnimalHighlightCard';
import { AnimalListItem } from '../src/components/ui/AnimalListItem';
import { EventDetailScreen } from '../src/screens/EventDetailScreen';
import { MissionDetailScreen } from '../src/screens/MissionDetailScreen';
import { AchievementsScreen } from '../src/screens/AchievementsScreen';
import { AchievementDetailScreen } from '../src/screens/AchievementDetailScreen';
import { MOCK_ANIMALS, MOCK_EVENTS, MOCK_MISSIONS, MOCK_NEWS } from '../src/mocks/zoo';
import { MOCK_ACHIEVEMENTS } from '../src/mocks/zoo';

describe('Exploration Core Views', () => {
  it('test-ca-04: HomeScreen should call onAnimalPress when animal is clicked', async () => {
    const onAnimalPress = jest.fn();
    const { getByText } = await render(
      <HomeScreen 
        appName="ARCA-NB" 
        featuredAnimals={[MOCK_ANIMALS[0]]} 
        events={MOCK_EVENTS} 
        news={MOCK_NEWS} 
        onAnimalPress={onAnimalPress} 
      />
    );
    
    const animalCard = getByText(MOCK_ANIMALS[0].commonName);
    await fireEvent.press(animalCard);
    expect(onAnimalPress).toHaveBeenCalledWith(MOCK_ANIMALS[0].id);
  });

  it('test-ca-04: SearchScreen sends the query to its ViewModel owner', async () => {
    const onQueryChange = jest.fn();
    const view = await render(
      <SearchScreen
        animals={MOCK_ANIMALS}
        query=""
        activeFilter="all"
        onQueryChange={onQueryChange}
        onFilterChange={jest.fn()}
        onAnimalPress={jest.fn()}
        onBackPress={jest.fn()}
      />
    );
    
    const input = view.getByPlaceholderText('Buscar animal...');
    await fireEvent.changeText(input, 'Tigre');
    expect(onQueryChange).toHaveBeenCalledWith('Tigre');
    expect(view.getByText('León Africano')).toBeTruthy();
    expect(view.getByTestId('animal-category-filters').props.horizontal).toBe(true);
    expect(view.getByTestId('animal-results').props.style).toEqual(expect.objectContaining({ flex: 1 }));
    expect(view.getByLabelText('Volver a inicio')).toBeTruthy();
  });

  it('test-ca-04: AnimalDetailScreen should show "No encontrado" for null animal', async () => {
    const { getByText } = await render(<AnimalDetailScreen animal={null} />);
    expect(getByText('No se encontró el animal.')).toBeTruthy();
  });

  it('test-ca-08: AnimalDetailScreen should render animal details', async () => {
    const { getByText } = await render(<AnimalDetailScreen animal={MOCK_ANIMALS[0]} />);
    expect(getByText(/Tigre de Bengala/)).toBeTruthy();
    expect(getByText(/Sector Felinos/)).toBeTruthy();
  });

  it('test-ca-04: el detalle muestra si el animal está descubierto', async () => {
    const discovered = await render(<AnimalDetailScreen animal={MOCK_ANIMALS[0]} />);
    expect(discovered.getByText('Descubierto')).toBeTruthy();
    await discovered.unmount();

    const notDiscovered = await render(<AnimalDetailScreen animal={MOCK_ANIMALS[2]} onNavigatePress={jest.fn()} />);
    expect(notDiscovered.getByText('Por descubrir')).toBeTruthy();
    expect(notDiscovered.getByText('Escanea el código QR de este hábitat para conocer sus características y curiosidades.')).toBeTruthy();
    expect(notDiscovered.getByText('Escanear QR para descubrir')).toBeTruthy();
    expect(notDiscovered.queryByText(MOCK_ANIMALS[2].curiosities ?? '')).toBeNull();
  });

  it('test-ca-07: los animales sin imagen usan placeholder en lugar de una URI vacía', async () => {
    const { getAllByText } = await render(
      <>
        <AnimalHighlightCard animal={MOCK_ANIMALS[0]} onPress={() => {}} />
        <AnimalListItem animal={MOCK_ANIMALS[0]} onPress={() => {}} />
      </>
    );
    expect(getAllByText('IMAGEN')).toHaveLength(2);
  });

  it('test-ca-09: muestra detalles básicos del evento y permite deslizar sus imágenes', async () => {
    const view = await render(
      <EventDetailScreen event={MOCK_EVENTS[0]} onBackPress={jest.fn()} />
    );

    expect(view.getByText(MOCK_EVENTS[0].title)).toBeTruthy();
    expect(view.getByText(new RegExp(MOCK_EVENTS[0].date))).toBeTruthy();
    expect(view.getByText(MOCK_EVENTS[0].description)).toBeTruthy();
    expect(view.getByText('IMAGEN')).toBeTruthy();
    expect(view.getByTestId('event-image-carousel').props.horizontal).toBe(true);
  });

  it('test-ca-09: presenta como carrusel las imágenes mock disponibles para un evento', async () => {
    const view = await render(
      <EventDetailScreen
        event={{ ...MOCK_EVENTS[0], imageUrls: ['https://example.test/event-1.jpg', 'https://example.test/event-2.jpg'] }}
        onBackPress={jest.fn()}
      />
    );

    expect(view.getByTestId('event-image-carousel').props.data).toHaveLength(2);
    expect(view.queryByText('IMAGEN')).toBeNull();
  });

  it('test-ca-09: muestra el objetivo, progreso restante y premio de la misión', async () => {
    const view = await render(
      <MissionDetailScreen mission={MOCK_MISSIONS[0]} onBackPress={jest.fn()} />
    );

    expect(view.getByText(MOCK_MISSIONS[0].objective)).toBeTruthy();
    expect(view.getByText('3 de 5 completados')).toBeTruthy();
    expect(view.getByText('Te faltan 2 pasos para completar la misión.')).toBeTruthy();
    expect(view.getByText(MOCK_MISSIONS[0].reward)).toBeTruthy();
  });

  it('test-ca-10: filtra logros obtenidos y pendientes y ordena por nombre', async () => {
    const view = await render(
      <AchievementsScreen
        achievements={MOCK_ACHIEVEMENTS}
        source="game"
        onAchievementPress={jest.fn()}
        onBackPress={jest.fn()}
      />
    );
    expect(view.getByText('Primer descubrimiento')).toBeTruthy();
    expect(view.queryByText('Observador de aves')).toBeNull();
    expect(view.getByTestId('achievements-list').props.data.map((item: { id: string }) => item.id)).toEqual([
      'first-discovery',
      'habitat-explorer',
      'mission-starter',
    ]);

    await fireEvent.press(view.getByText('Por obtener'));
    expect(view.getByText('Observador de aves')).toBeTruthy();
    expect(view.queryByText('Primer descubrimiento')).toBeNull();
    expect(view.getByTestId('achievements-list').props.data.map((item: { id: string }) => item.id)).toEqual([
      'mission-master',
      'zoo-photographer',
      'bird-watcher',
    ]);

    await fireEvent.press(view.getByText('Nombre Z–A'));
    expect(view.getByTestId('achievements-list').props.data.map((item: { id: string }) => item.id)).toEqual([
      'bird-watcher',
      'zoo-photographer',
      'mission-master',
    ]);

    await fireEvent.press(view.getByText('Obtenidos'));
    await fireEvent.press(view.getByText('Más antiguos'));
    expect(view.getByTestId('achievements-list').props.data.map((item: { id: string }) => item.id)).toEqual([
      'mission-starter',
      'habitat-explorer',
      'first-discovery',
    ]);
  });

  it('test-ca-10: muestra los datos del logro y los requisitos si aún está pendiente', async () => {
    const obtained = await render(
      <AchievementDetailScreen achievement={MOCK_ACHIEVEMENTS[0]} onBackPress={jest.fn()} />
    );
    expect(obtained.getByText('100 puntos obtenidos')).toBeTruthy();
    expect(obtained.getByText('Descubriste al Tigre de Bengala.')).toBeTruthy();
    await obtained.unmount();

    const pending = await render(
      <AchievementDetailScreen achievement={MOCK_ACHIEVEMENTS[3]} onBackPress={jest.fn()} />
    );
    expect(pending.getByText('200 puntos al obtenerlo')).toBeTruthy();
    expect(pending.getByText('Descubre tres especies de aves.')).toBeTruthy();
    expect(pending.queryByText('Fecha de obtención')).toBeNull();
  });
});
