import React, { useEffect } from 'react';
import { Pressable, Text } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { AnimalRepository, AnimalRepositoryImpl, MapRepositoryImpl, UserRepository, UserRepositoryImpl, ZooRepositoryImpl } from '../src/repositories';
import { favoriteAnimals } from '../src/repositories/favoriteAnimals';
import { useAnimalViewModel } from '../src/viewmodels/useAnimalViewModel';
import { useFavoriteAnimals } from '../src/viewmodels/useFavoriteAnimals';
import { useHomeViewModel } from '../src/viewmodels/useHomeViewModel';
import { useMapViewModel } from '../src/viewmodels/useMapViewModel';
import { useUserViewModel } from '../src/viewmodels/useUserViewModel';
import { MOCK_ANIMALS } from '../src/mocks/zoo';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('ViewModels y Repositories', () => {
  it('test-ca-08: filtra animales por texto y categoría y resuelve IDs', async () => {
    const onLoaded = jest.fn();
    const Probe = () => {
      const { getAnimals, getAnimalDetails } = useAnimalViewModel(new AnimalRepositoryImpl());
      useEffect(() => {
        Promise.all([
          getAnimals('tigre'),
          getAnimals('', 'birds'),
          getAnimals('inexistente'),
          getAnimalDetails('juan'),
          getAnimalDetails('missing'),
        ]).then(onLoaded);
      }, [getAnimalDetails, getAnimals]);
      return <Text>Animal probe</Text>;
    };

    await render(<Probe />);
    await waitFor(() => expect(onLoaded).toHaveBeenCalled());
    expect(onLoaded).toHaveBeenCalledWith([
      [MOCK_ANIMALS[0]],
      [MOCK_ANIMALS[4]],
      [],
      MOCK_ANIMALS[0],
      null,
    ]);
  });

  it('test-ca-08: carga los datos de Home mediante sus repositorios', async () => {
    const onLoaded = jest.fn();
    const Probe = () => {
      const vm = useHomeViewModel(new AnimalRepositoryImpl(), new ZooRepositoryImpl());
      useEffect(() => {
        Promise.all([
          vm.getFeaturedAnimals(),
          vm.getEvents(),
          vm.getNews(),
          vm.getEventDetails('e1'),
          vm.getNewsDetails('n1'),
          vm.getNewsDetails('missing'),
          vm.refreshNewsAndEvents(),
        ]).then(onLoaded);
      }, [vm.getEventDetails, vm.getEvents, vm.getFeaturedAnimals, vm.getNews, vm.getNewsDetails, vm.refreshNewsAndEvents]);
      return <Text>Home probe</Text>;
    };

    await render(<Probe />);
    await waitFor(() => expect(onLoaded).toHaveBeenCalled());
    const [animals, events, news, event, article, missing, refreshed] = onLoaded.mock.calls[0][0];
    expect(animals).toHaveLength(3);
    expect(events).toHaveLength(2);
    expect(news[0].title).toBe('Nacimiento de Jirafa');
    expect(event).toMatchObject({ id: 'e1' });
    expect(article).toMatchObject({ id: 'n1' });
    expect(missing).toBeNull();
    expect(refreshed.news[0].title).toBe('Nacimiento de Jirafa');
    expect(refreshed.events).toHaveLength(2);
  });

  it('test-ca-08: obtiene puntos y secciones del mapa del zoológico', async () => {
    const mapRepository = new MapRepositoryImpl();
    const Probe = () => {
      const { places, sections, isLoading } = useMapViewModel(mapRepository);
      return <Text>{isLoading ? 'cargando' : `${places.length}:${sections.length}`}</Text>;
    };

    const view = await render(<Probe />);
    await waitFor(() => expect(view.getByText('10:8')).toBeTruthy());
  });

  it('test-ca-08: Home ViewModel reporta el fallo del repositorio al consumidor', async () => {
    const onError = jest.fn();
    const failingRepository: AnimalRepository = {
      getAllAnimals: async () => { throw new Error('falló'); },
      getAnimalById: async () => null,
      getFeaturedAnimals: async () => [],
    };
    const Probe = () => {
      const { getAnimals } = useAnimalViewModel(failingRepository);
      useEffect(() => {
        getAnimals().catch(onError);
      }, [getAnimals]);
      return <Text>Error probe</Text>;
    };

    await render(<Probe />);
    await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'falló' })));
  });

  it.each([
    [new Error('falló el perfil'), 'falló el perfil'],
    ['falló el perfil', 'No se pudieron cargar los datos del perfil.'],
  ])('test-ca-08: User ViewModel expone y registra errores del repositorio', async (failure, expected) => {
    const repository: UserRepository = {
      getUser: async () => { throw failure; },
      getMissions: async () => [],
      getAchievements: async () => [],
      getMilestones: async () => [],
    };
    const logError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const Probe = () => {
      const { error, loading } = useUserViewModel(repository);
      return <Text>{loading ? 'cargando' : error}</Text>;
    };

    const view = await render(<Probe />);
    await waitFor(() => expect(view.getByText(expected)).toBeTruthy());
    expect(logError).toHaveBeenCalledWith('Error loading user data:', failure);
    logError.mockRestore();
  });

  it('test-ca-08: los repositorios mock exponen colecciones y datos tipados', async () => {
    const animalRepository = new AnimalRepositoryImpl();
    const userRepository = new UserRepositoryImpl();
    const zooRepository = new ZooRepositoryImpl();
    const mapRepository = new MapRepositoryImpl();

    await expect(animalRepository.getAllAnimals()).resolves.toHaveLength(5);
    await expect(animalRepository.getFeaturedAnimals()).resolves.toHaveLength(3);
    await expect(userRepository.getUser()).resolves.toMatchObject({ name: 'María García' });
    await expect(userRepository.getMissions()).resolves.toHaveLength(2);
    await expect(userRepository.getAchievements()).resolves.toHaveLength(6);
    await expect(userRepository.getMilestones()).resolves.toHaveLength(3);
    await expect(zooRepository.getEvents()).resolves.toHaveLength(2);
    await expect(zooRepository.getNews()).resolves.toEqual([expect.objectContaining({ title: 'Nacimiento de Jirafa' })]);
    await expect(mapRepository.getPlaces()).resolves.toHaveLength(10);
    await expect(mapRepository.getSections()).resolves.toHaveLength(8);
  });

  it('CA-16: el hook muestra el favorito al marcarlo', async () => {
    favoriteAnimals.resetForTests();
    await AsyncStorage.clear();
    const Probe = () => {
      const { ids, toggle } = useFavoriteAnimals();
      return (
        <Pressable onPress={() => { void toggle('juan'); }}>
          <Text>{ids.join(',') || 'vacio'}</Text>
        </Pressable>
      );
    };

    const view = await render(<Probe />);
    await waitFor(() => expect(view.getByText('vacio')).toBeTruthy());
    await fireEvent.press(view.getByText('vacio'));
    await waitFor(() => expect(view.getByText('juan')).toBeTruthy());
    view.unmount();
  });

  it('CA-16: ignora una respuesta que llega después de salir', async () => {
    favoriteAnimals.resetForTests();
    let resolveList: (ids: string[]) => void = () => undefined;
    let listener: (ids: string[]) => void = () => undefined;
    const list = jest.spyOn(favoriteAnimals, 'list').mockImplementation(
      () => new Promise((resolve) => { resolveList = resolve; }),
    );
    const subscribe = jest.spyOn(favoriteAnimals, 'subscribe').mockImplementation((next) => {
      listener = next;
      return () => undefined;
    });
    const Probe = () => {
      useFavoriteAnimals();
      return <Text>favoritos</Text>;
    };

    try {
      const view = await render(<Probe />);
      await act(async () => {
        view.unmount();
      });
      await act(async () => {
        resolveList(['tarde']);
        listener(['fuera']);
      });
    } finally {
      list.mockRestore();
      subscribe.mockRestore();
    }
  });
});
