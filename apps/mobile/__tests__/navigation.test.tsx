import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { AppTabBar } from '../src/components/AppTabBar';
import HomeRoute from '../src/app/(tabs)/index';
import QrScannerRoute from '../src/app/(tabs)/scan';
import SearchRoute from '../src/app/(tabs)/search';
import MapRoute from '../src/app/(tabs)/map';
import CollectionRoute from '../src/app/(tabs)/collection';
import ProfileRoute from '../src/app/(tabs)/profile';
import Tour3DRoute from '../src/app/(tabs)/tour-3d';
import GameRoute from '../src/app/(tabs)/game';
import MissionDetailRoute from '../src/app/(tabs)/mission-detail';
import AchievementsRoute from '../src/app/(tabs)/achievements';
import AchievementDetailRoute from '../src/app/(tabs)/achievement-detail';
import AnimalDetailRoute from '../src/app/animal/[id]';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockParams: {
  id?: string;
  selectForTour?: string;
  returnTo?: string;
  destination?: string;
  source?: string;
} = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
  useLocalSearchParams: () => mockParams,
}));

describe('Navegación visitante', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockReplace.mockClear();
    mockBack.mockClear();
    delete mockParams.id;
    delete mockParams.selectForTour;
    delete mockParams.returnTo;
    delete mockParams.destination;
    delete mockParams.source;
  });

  it('test-ca-02: permite navegar a las cinco pestañas principales', async () => {
    const navigate = jest.fn();
    const tabNames = ['index', 'map', 'scan', 'collection', 'profile'];
    const { getByTestId } = await render(
      <AppTabBar
        state={{ index: 0, routes: tabNames.map((name) => ({ key: name, name })) }}
        navigation={{ navigate }}
      />
    );

    for (const [label, route] of [
      ['Home', 'index'],
      ['Mapa', 'map'],
      ['Escanear', 'scan'],
      ['Colección', 'collection'],
      ['Perfil', 'profile'],
    ]) {
      await fireEvent.press(getByTestId(`tab-${route}`));
      expect(navigate).toHaveBeenLastCalledWith(route);
    }
  });

  it.each([
    ['search', 'Home'],
    ['game', 'Home'],
    ['event-detail', 'Home'],
    ['mission-detail', 'Home'],
    ['achievements', 'Home'],
    ['achievement-detail', 'Home'],
    ['tour-3d', 'Mapa'],
    ['qr-result', 'Escanear'],
    ['qr-invalid', 'Escanear'],
    ['qr-already-discovered', 'Escanear'],
  ])('test-ca-03: la ruta secundaria %s conserva activa la pestaña %s', async (route, activeLabel) => {
    const { getByTestId } = await render(
      <AppTabBar
        state={{ index: 0, routes: [{ key: route, name: route }] }}
        navigation={{ navigate: jest.fn() }}
      />
    );

    const activeKey = { Home: 'index', Mapa: 'map', Escanear: 'scan' }[activeLabel];
    expect(getByTestId(`tab-${activeKey}`).props.accessibilityState.selected).toBe(true);
  });

  it('test-ca-04: Home navega a detalle, búsqueda y Game', async () => {
    const view = await render(<HomeRoute />);
    await waitFor(() => expect(view.getByText('Tigre de Bengala')).toBeTruthy());

    await fireEvent.press(view.getByText('Tigre de Bengala'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/animal/[id]', params: { id: 'juan' } });

    await fireEvent.press(view.getByText('Ver todo'));
    expect(mockPush).toHaveBeenCalledWith('/search');

    await fireEvent.press(view.getByText('Ver misiones'));
    expect(mockPush).toHaveBeenCalledWith('/game');
    expect(view.getByText('Nacimiento de Jirafa')).toBeTruthy();

    await fireEvent.press(view.getByText('Alimentación de Pingüinos'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/event-detail', params: { id: 'e1' } });
  });

  it('test-ca-04: Search filtra animales y abre la ficha incluso si no se descubrieron', async () => {
    const view = await render(<SearchRoute />);
    await waitFor(() => expect(view.getByText('Tigre de Bengala')).toBeTruthy());
    await fireEvent.changeText(view.getByPlaceholderText('Buscar animal...'), 'Elefante');
    await waitFor(() => expect(view.getByText('Elefante Asiático')).toBeTruthy());
    expect(view.queryByText('Tigre de Bengala')).toBeNull();

    await fireEvent.press(view.getByText('Elefante Asiático'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/animal/[id]', params: { id: 'elephant' } });
  });

  it('test-ca-10: la vista previa de un animal bloqueado ofrece abrir el escáner QR', async () => {
    mockParams.id = 'elephant';
    const detail = await render(<AnimalDetailRoute />);
    await waitFor(() => expect(detail.getByText('Escanear QR para descubrir')).toBeTruthy());
    await fireEvent.press(detail.getByText('Escanear QR para descubrir'));

    expect(mockPush).toHaveBeenCalledWith('/scan');
  });

  it('test-ca-02: Mapa ofrece el recorrido 3D, Colección abre animales descubiertos y Perfil carga sus datos', async () => {
    const map = await render(<MapRoute />);
    await waitFor(() => expect(map.getByText('Hábitat Tigre')).toBeTruthy());
    await fireEvent.press(map.getByText('Buscar animales'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/search', params: { selectForTour: 'true', returnTo: 'map' } });
    mockPush.mockClear();
    await fireEvent.press(map.getByText('Cambiar a recorrido 3D'));
    expect(mockPush).toHaveBeenCalledWith('/tour-3d');
    await map.unmount();

    const collection = await render(<CollectionRoute />);
    await waitFor(() => expect(collection.getByText('Tigre de Bengala')).toBeTruthy());
    await fireEvent.press(collection.getByText('Tigre de Bengala'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/animal/[id]', params: { id: 'juan' } });
    await fireEvent.press(collection.getByText('Elefante Asiático'));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/animal/[id]', params: { id: 'elephant' } });
    await collection.unmount();

    const profile = await render(<ProfileRoute />);
    await waitFor(() => expect(profile.getByText('María García')).toBeTruthy());
  });

  it('test-ca-03: Tour 3D mantiene su destino y permite regresar al Mapa 2D', async () => {
    const tour = await render(<Tour3DRoute />);
    await waitFor(() => expect(tour.getByText('Hábitat del Tigre')).toBeTruthy());
    await fireEvent.press(tour.getByText('Cambiar a Mapa 2D'));
    expect(mockReplace).toHaveBeenCalledWith('/map');
  });

  it('test-ca-09: la búsqueda iniciada desde el mapa selecciona destino y continúa al recorrido 3D', async () => {
    mockParams.selectForTour = 'true';
    const search = await render(<SearchRoute />);
    await waitFor(() => expect(search.getByText('Tigre de Bengala')).toBeTruthy());

    await fireEvent.press(search.getByText('Tigre de Bengala'));
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/tour-3d',
      params: { destination: 'Juan — Sector Felinos — Zona B3' },
    });
  });

  it('test-ca-09: la búsqueda del recorrido 3D conserva el modo de selección de destino', async () => {
    const tour = await render(<Tour3DRoute />);
    await waitFor(() => expect(tour.getByText('Hábitat del Tigre')).toBeTruthy());
    await fireEvent.press(tour.getByText('Buscar animales'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/search',
      params: { selectForTour: 'true', returnTo: 'tour-3d', destination: 'Hábitat del Tigre' },
    });
  });

  it('la búsqueda de destino ofrece regresar a la ruta de origen', async () => {
    mockParams.selectForTour = 'true';
    mockParams.returnTo = 'tour-3d';
    mockParams.destination = 'Hábitat del Tigre';
    const search = await render(<SearchRoute />);
    await fireEvent.press(search.getByLabelText('Volver al recorrido 3D'));

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/tour-3d',
      params: { destination: 'Hábitat del Tigre' },
    });
  });

  it('test-ca-09: el recorrido 3D muestra el animal elegido como destino', async () => {
    mockParams.destination = 'Juan — Sector Felinos — Zona B3';
    const tour = await render(<Tour3DRoute />);
    expect(tour.getByText(mockParams.destination)).toBeTruthy();
  });

  it('test-ca-09: las misiones activas abren su detalle', async () => {
    const game = await render(<GameRoute />);
    await waitFor(() => expect(game.getByText('Safari Matutino')).toBeTruthy());
    await fireEvent.press(game.getByText('Safari Matutino'));

    expect(mockPush).toHaveBeenCalledWith({ pathname: '/mission-detail', params: { id: 'm1' } });

    mockParams.id = 'm1';
    const detail = await render(<MissionDetailRoute />);
    await waitFor(() => expect(detail.getByText('Objetivo')).toBeTruthy());
    await fireEvent.press(detail.getByLabelText('Volver'));
    expect(mockReplace).toHaveBeenCalledWith('/game');
  });

  it('test-ca-10: la pantalla de juego permite abrir logros y sus detalles', async () => {
    const game = await render(<GameRoute />);
    await waitFor(() => expect(game.getByText('Primer descubrimiento')).toBeTruthy());
    expect(game.getByTestId('achievements-carousel').props.horizontal).toBe(true);
    await fireEvent.press(game.getByLabelText('Volver'));
    expect(mockBack).toHaveBeenCalledTimes(1);
    await fireEvent.press(game.getByText('Ver todos'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/achievements', params: { source: 'game' } });
    await game.unmount();

    mockParams.source = 'game';
    const list = await render(<AchievementsRoute />);
    await waitFor(() => expect(list.getByText('Todos los logros')).toBeTruthy());
    await fireEvent.press(list.getByText('Primer descubrimiento'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/achievement-detail',
      params: { id: 'first-discovery', source: 'game', returnTo: 'achievements' },
    });
    await fireEvent.press(list.getByLabelText('Volver a Aventura en el Zoo'));
    expect(mockReplace).toHaveBeenCalledWith('/game');
    await list.unmount();

    mockParams.id = 'first-discovery';
    mockParams.source = 'game';
    mockParams.returnTo = 'achievements';
    const detail = await render(<AchievementDetailRoute />);
    await waitFor(() => expect(detail.getByText('Cómo lo desbloqueaste')).toBeTruthy());
    expect(detail.getByText('Descubriste al Tigre de Bengala.')).toBeTruthy();
    await fireEvent.press(detail.getByLabelText('Volver'));
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/achievements', params: { source: 'game' } });
  });

  it('test-ca-10: los logros de perfil abren detalle y acceso al listado completo', async () => {
    const profile = await render(<ProfileRoute />);
    await waitFor(() => expect(profile.getByText('Logros Recientes')).toBeTruthy());
    await fireEvent.press(profile.getByLabelText('Ver logro Primer descubrimiento'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/achievement-detail',
      params: { id: 'first-discovery', source: 'profile', returnTo: 'profile' },
    });
    await fireEvent.press(profile.getByText('Ver todos'));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/achievements', params: { source: 'profile' } });

    mockParams.id = 'first-discovery';
    mockParams.source = 'profile';
    mockParams.returnTo = 'profile';
    const detail = await render(<AchievementDetailRoute />);
    await waitFor(() => expect(detail.getByText('Cómo lo desbloqueaste')).toBeTruthy());
    await fireEvent.press(detail.getByLabelText('Volver'));
    expect(mockReplace).toHaveBeenCalledWith('/profile');
  });

  it('test-ca-05: los tres controles del escáner abren sus estados de resultado', async () => {
    const view = await render(<QrScannerRoute />);

    await fireEvent.press(view.getByText('Simular QR válido'));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/qr-result?animalId=elephant'));

    mockPush.mockClear();
    await fireEvent.press(view.getByText('Simular QR inválido'));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/qr-invalid'));

    mockPush.mockClear();
    await fireEvent.press(view.getByText('Simular ya descubierto'));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/qr-already-discovered?animalId=juan'));
  });
});
