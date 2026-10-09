import React, { useEffect } from 'react';
import { Text } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import { AnimalRepository, AnimalRepositoryImpl, MapRepositoryImpl, QrRepositoryImpl, UserRepository, UserRepositoryImpl, ZooRepositoryImpl } from '../src/repositories';
import { useAnimalViewModel } from '../src/viewmodels/useAnimalViewModel';
import { useHomeViewModel } from '../src/viewmodels/useHomeViewModel';
import { useMapViewModel } from '../src/viewmodels/useMapViewModel';
import { useQrViewModel } from '../src/viewmodels/useQrViewModel';
import { useUserViewModel } from '../src/viewmodels/useUserViewModel';
import { MOCK_ANIMALS } from '../src/mocks/zoo';

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

    render(<Probe />);
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
        Promise.all([vm.getFeaturedAnimals(), vm.getEvents(), vm.getNews()]).then(onLoaded);
      }, [vm.getEvents, vm.getFeaturedAnimals, vm.getNews]);
      return <Text>Home probe</Text>;
    };

    render(<Probe />);
    await waitFor(() => expect(onLoaded).toHaveBeenCalled());
    expect(onLoaded.mock.calls[0][0][0]).toHaveLength(3);
    expect(onLoaded.mock.calls[0][0][1]).toHaveLength(2);
    expect(onLoaded.mock.calls[0][0][2].title).toBe('Nacimiento de Jirafa');
  });

  it('test-ca-08: obtiene ubicaciones y ruta del zoológico', async () => {
    const onLoaded = jest.fn();
    const Probe = () => {
      const { getMapData } = useMapViewModel(new MapRepositoryImpl());
      useEffect(() => {
        getMapData().then(onLoaded);
      }, [getMapData]);
      return <Text>Map probe</Text>;
    };

    render(<Probe />);
    await waitFor(() => expect(onLoaded).toHaveBeenCalled());
    expect(onLoaded.mock.calls[0][0].locations).toHaveLength(2);
    expect(onLoaded.mock.calls[0][0].activeRoute.destination).toBe('Hábitat del Tigre');
  });

  it.each([
    ['valid', { outcome: 'valid', animalId: 'elephant' }],
    ['invalid', { outcome: 'invalid' }],
    ['already-discovered', { outcome: 'already-discovered', animalId: 'juan' }],
  ] as const)('test-ca-05: el repositorio simula resultado %s', async (outcome, expected) => {
    await expect(new QrRepositoryImpl().simulateScan(outcome)).resolves.toEqual(expected);
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

    render(<Probe />);
    await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'falló' })));
  });

  it.each([
    [new Error('falló el perfil'), 'falló el perfil'],
    ['falló el perfil', 'No se pudieron cargar los datos del perfil.'],
  ])('test-ca-08: User ViewModel expone y registra errores del repositorio', async (failure, expected) => {
    const repository: UserRepository = {
      getUser: async () => { throw failure; },
      getMissions: async () => [],
      getRewards: async () => [],
      getLeaderboard: async () => [],
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
    await expect(userRepository.getRewards()).resolves.toHaveLength(4);
    await expect(userRepository.getLeaderboard()).resolves.toHaveLength(3);
    await expect(userRepository.getAchievements()).resolves.toHaveLength(6);
    await expect(userRepository.getMilestones()).resolves.toHaveLength(3);
    await expect(zooRepository.getEvents()).resolves.toHaveLength(2);
    await expect(zooRepository.getNews()).resolves.toMatchObject({ title: 'Nacimiento de Jirafa' });
    await expect(mapRepository.getLocations()).resolves.toHaveLength(2);
    await expect(mapRepository.getActiveRoute()).resolves.toMatchObject({ destination: 'Hábitat del Tigre' });
  });
});
