import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import HomeRoute from '../src/app/(tabs)/index';
import { signalPublicContentPush } from '../src/push/publicContentPush';
import * as homeViewModel from '../src/viewmodels/useHomeViewModel';
import * as networkStatus from '../src/viewmodels/useNetworkStatus';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

describe('Home route', () => {
  it('renders the visitor home screen and its mock data', async () => {
    const { getByText } = await render(<HomeRoute />);

    await waitFor(() => {
      expect(getByText('Bienvenido al Zoológico')).toBeTruthy();
      expect(getByText('Animales favoritos')).toBeTruthy();
      expect(getByText('Marca el corazón en la ficha de un animal para verlo aquí.')).toBeTruthy();
    });
  });

  it('CA-05: muestra en Inicio las noticias y eventos revalidados sin reabrir la pantalla', async () => {
    const news = { id: '1', title: 'Noticia anterior', body: 'Contenido' };
    const event = { id: '2', title: 'Evento anterior', date: '25 de noviembre', time: '12:00', location: 'Entrada', description: '' };
    const loadHomeData = jest.fn<ReturnType<HomeLoader>, Parameters<HomeLoader>>()
      .mockResolvedValue({ animals: [], events: [event], news: [news] });
    const useHomeViewModel = homeViewModel.useHomeViewModel;
    const spy = jest.spyOn(homeViewModel, 'useHomeViewModel').mockImplementation(() => ({
      ...useHomeViewModel(),
      loadHomeData,
    }));

    try {
      const { findByText, getByText, queryByText } = await render(<HomeRoute />);
      await findByText(news.title);
      expect(getByText(event.title)).toBeTruthy();

      const onRevalidated = loadHomeData.mock.calls[0][0]!;
      await act(async () => {
        onRevalidated.news([{ ...news, id: '3', title: 'Noticia nueva' }]);
        onRevalidated.events([{ ...event, id: '4', title: 'Evento nuevo' }]);
      });

      expect(getByText('Noticia nueva')).toBeTruthy();
      expect(getByText('Evento nuevo')).toBeTruthy();
      expect(queryByText(news.title)).toBeNull();
      expect(queryByText(event.title)).toBeNull();
    } finally {
      spy.mockRestore();
    }
  });
});

type HomeLoader = ReturnType<typeof homeViewModel.useHomeViewModel>['loadHomeData'];

it('CA-14: actualiza por aviso público, primer plano y reconexión, y conserva contenido si falla', async () => {
  let offline = true;
  const net = jest.spyOn(networkStatus, 'useNetworkStatus').mockImplementation(() => ({ isOffline: offline }));
  const appState = jest.spyOn(AppState, 'addEventListener');
  const refreshNewsAndEvents = jest.fn()
    .mockResolvedValue({ news: [{ id: '9', title: 'Noticia por aviso', body: '' }], events: [] });
  const useHomeViewModel = homeViewModel.useHomeViewModel;
  const spy = jest.spyOn(homeViewModel, 'useHomeViewModel').mockImplementation(() => ({
    ...useHomeViewModel(),
    refreshNewsAndEvents,
  }));

  try {
    const view = await render(<HomeRoute />);
    await act(async () => {
      signalPublicContentPush({ type: 'memory', id: '9' });
      signalPublicContentPush({ type: 'news', id: ' ' });
    });
    expect(refreshNewsAndEvents).not.toHaveBeenCalled();
    await act(async () => { signalPublicContentPush({ type: 'news', id: '9' }); });
    expect(refreshNewsAndEvents).toHaveBeenCalledWith('push');
    await view.findByText('Noticia por aviso');

    refreshNewsAndEvents.mockRejectedValueOnce(new Error('Sin red'));
    await act(async () => {
      for (const [event, listener] of appState.mock.calls) {
        if (event === 'change') listener('active');
      }
    });
    expect(refreshNewsAndEvents).toHaveBeenLastCalledWith('stale');
    expect(view.getByText('Noticia por aviso')).toBeTruthy();

    offline = false;
    await view.rerender(<HomeRoute />);
    expect(refreshNewsAndEvents.mock.calls).toEqual([['push'], ['stale'], ['stale']]);
  } finally {
    appState.mockRestore();
    net.mockRestore();
    spy.mockRestore();
  }
});
