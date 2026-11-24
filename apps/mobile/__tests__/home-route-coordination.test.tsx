import React from 'react';
import { act, render } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
import HomeRoute from '../src/app/(tabs)/index';
import { signalPublicContentPush } from '../src/push/publicContentPush';
import { HomeScreen } from '../src/screens/HomeScreen';
import * as homeViewModel from '../src/viewmodels/useHomeViewModel';

const mockRouter = { push: jest.fn(), replace: jest.fn() };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
}));

jest.mock('../src/screens/HomeScreen', () => ({ HomeScreen: jest.fn(() => null) }));

type HomeLoader = ReturnType<typeof homeViewModel.useHomeViewModel>['loadHomeData'];
type RefreshLists = ReturnType<typeof homeViewModel.useHomeViewModel>['refreshNewsAndEvents'];
const screen = jest.mocked(HomeScreen);
const useHomeViewModel = homeViewModel.useHomeViewModel;
const load = jest.fn<ReturnType<HomeLoader>, Parameters<HomeLoader>>();
const refresh = jest.fn<ReturnType<RefreshLists>, Parameters<RefreshLists>>();
const homeData = { animals: [], events: [], news: [{ id: '1', title: 'Noticia inicial', body: '' }] };
const newerLists = { events: [], news: [{ id: '2', title: 'Noticia actualizada', body: '' }] };

function home() {
  return screen.mock.lastCall![0];
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((complete, fail) => {
    resolve = complete;
    reject = fail;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  screen.mockClear();
  mockRouter.push.mockClear();
  load.mockReset().mockResolvedValue(homeData);
  refresh.mockReset().mockResolvedValue(newerLists);
  jest.spyOn(homeViewModel, 'useHomeViewModel').mockImplementation(() => ({
    ...useHomeViewModel(),
    loadHomeData: load,
    refreshNewsAndEvents: refresh,
  }));
});

afterEach(() => jest.restoreAllMocks());

it('CA-17 de mobile-002 permite reintentar Inicio si la primera carga falla', async () => {
  const first = deferred<Awaited<ReturnType<HomeLoader>>>();
  load.mockReturnValueOnce(first.promise);
  await render(<HomeRoute />);
  expect(home().loading).toBe(true);

  const revalidation = load.mock.calls[0][0]!;
  await act(async () => {
    revalidation.events([]);
    revalidation.news(newerLists.news);
  });
  expect(home().news).toEqual(newerLists.news);

  await act(async () => { first.reject(new Error('Sin red')); });
  expect(home().loading).toBe(false);
  expect(home().error).toBe('No fue posible actualizar la información del zoológico.');

  await act(async () => { home().onRetry?.(); });
  expect(home().error).toBeNull();
  expect(home().news).toEqual(homeData.news);
});

it('CA-05 y CA-14 descarta respuestas viejas aunque una consulta y una recarga se crucen', async () => {
  const outdatedHome = deferred<Awaited<ReturnType<HomeLoader>>>();
  const latestHome = deferred<Awaited<ReturnType<HomeLoader>>>();
  const outdatedLists = deferred<Awaited<ReturnType<RefreshLists>>>();
  await render(<HomeRoute />);
  load.mockReturnValueOnce(outdatedHome.promise).mockReturnValueOnce(latestHome.promise);
  refresh.mockReturnValueOnce(outdatedLists.promise);
  await act(async () => { home().onRetry?.(); });
  const outdatedRevalidation = load.mock.calls[1][0]!;

  await act(async () => {
    signalPublicContentPush({ type: 'news', id: '2' });
    home().onRetry?.();
    outdatedRevalidation.events([]);
    outdatedRevalidation.news(homeData.news);
    outdatedHome.resolve(homeData);
    outdatedLists.resolve(homeData);
  });
  expect(home().news).toEqual(homeData.news);
  expect(load).toHaveBeenCalledTimes(3);

  await act(async () => { signalPublicContentPush({ type: 'news', id: '2' }); });
  expect(home().news).toEqual(newerLists.news);
  await act(async () => { latestHome.resolve(homeData); });
  expect(home().news).toEqual(newerLists.news);
});

it('CA-14 agrupa los avisos simultáneos y da prioridad a la actualización manual', async () => {
  const inFlight = deferred<Awaited<ReturnType<RefreshLists>>>();
  const manual = deferred<Awaited<ReturnType<RefreshLists>>>();
  refresh.mockReturnValueOnce(inFlight.promise).mockReturnValueOnce(manual.promise);
  await render(<HomeRoute />);

  await act(async () => {
    signalPublicContentPush({ type: 'news', id: '2' });
    signalPublicContentPush({ type: 'event', id: '3' });
    signalPublicContentPush({ type: 'news', id: '4' });
    home().onRefresh?.();
  });
  expect(refresh.mock.calls).toEqual([['push']]);
  expect(home().refreshing).toBe(true);

  await act(async () => { inFlight.resolve(homeData); });
  expect(refresh.mock.calls).toEqual([['push'], ['manual']]);
  expect(home().refreshing).toBe(true);

  await act(async () => { manual.resolve(newerLists); });
  expect(home().refreshing).toBe(false);
  expect(home().news).toEqual(newerLists.news);
});

it('CA-03 y CA-04 de mobile-002 conecta las acciones de Inicio con sus rutas y conserva los identificadores', async () => {
  await render(<HomeRoute />);

  home().onSeeAllAnimalsPress?.();
  home().onAnimalPress?.('9');
  home().onEventPress?.('10');
  home().onNewsPress?.('11');
  home().onMissionPress?.('12');
  home().onAchievementsPress?.();

  expect(mockRouter.push.mock.calls).toEqual([
    ['/search'],
    [{ pathname: '/animal/[id]', params: { id: '9' } }],
    [{ pathname: '/event-detail', params: { id: '10' } }],
    [{ pathname: '/news-detail', params: { id: '11' } }],
    [{ pathname: '/mission-detail', params: { id: '12', returnTo: 'home' } }],
    [{ pathname: '/achievements', params: { source: 'game', returnTo: 'home' } }],
  ]);
});

it('CA-03 y CA-08 de mobile-003 pide confirmar antes de abrir el portal', async () => {
  const portalUrl = process.env.EXPO_PUBLIC_PORTAL_URL;
  process.env.EXPO_PUBLIC_PORTAL_URL = 'https://zoo.example/';
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

  try {
    await render(<HomeRoute />);
    home().onSeeAllEventsPress?.();
    home().onSeeAllNewsPress?.();
    expect(alert).toHaveBeenCalledTimes(2);
    expect(open).not.toHaveBeenCalled();

    for (const [, , buttons] of alert.mock.calls) {
      buttons?.find((button) => button.text === 'Continuar')?.onPress?.();
    }
    expect(open.mock.calls).toEqual([
      ['https://zoo.example/eventos.html'],
      ['https://zoo.example/noticias.html'],
    ]);
  } finally {
    if (portalUrl === undefined) delete process.env.EXPO_PUBLIC_PORTAL_URL;
    else process.env.EXPO_PUBLIC_PORTAL_URL = portalUrl;
  }
});
