import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert, Text } from 'react-native';
import { SettingsScreen } from '../src/screens/SettingsScreen';
import { useNotificationPreferences, type NotificationClient } from '../src/viewmodels/useNotificationPreferences';
import {
  deliveredNotification,
  DENIED_NOTIFICATION_TEXT,
  preparePushRegistration,
  resetPushRegistrationForTests,
  type IncomingNotification,
  type PushNotificationsPort,
} from '../src/push/pushRegistration';
import { clearNotificationPreferences } from '../src/push/notificationPreferences';
import { openPush, readPushData, UNAVAILABLE_PUSH_TEXT } from '../src/push/openPush';
import { followPushResponse, listenForPushOpens } from '../src/push/pushNavigation';
import { listenForPublicContentPush, signalPublicContentPush } from '../src/push/publicContentPush';
import { accountSession } from '../src/session/accountSession';
import { authRepository } from '../src/repositories/mockAuthRepository';

jest.mock('expo-notifications', () => ({
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  getLastNotificationResponse: jest.fn(() => null),
  clearLastNotificationResponseAsync: jest.fn(async () => undefined),
}));

declare const __dirname: string;

const fs = jest.requireActual<{
  readFileSync: (file: string, encoding: string) => string;
}>('fs');
const path = jest.requireActual<{ join: (...parts: string[]) => string }>('path');

const screenProps = {
  accountName: 'Ana',
  accountEmail: 'ana@correo.com',
  preferences: { notifications: false, location: false },
  onToggle: jest.fn(),
  cameraGranted: true,
  cameraReady: true,
  onCameraToggle: jest.fn(),
  onAccountPress: jest.fn(),
  onPrivacyPress: jest.fn(),
  onHelpPress: jest.fn(),
  onAboutPress: jest.fn(),
  onLogout: jest.fn(),
  onBackPress: jest.fn(),
};

function Probe({
  client,
  port,
}: {
  client: NotificationClient;
  port: PushNotificationsPort;
}) {
  const state = useNotificationPreferences(client, port);
  return (
    <SettingsScreen
      {...screenProps}
      newsAndEvents={state.preferences.news_and_events}
      memoryStatus={state.preferences.memory_status}
      onNotificationToggle={(key, value) => { void state.toggle(key, value); }}
      notificationError={state.error}
      notificationDenied={state.deniedMessage}
    />
  );
}

function port(overrides: Partial<PushNotificationsPort> = {}): PushNotificationsPort {
  return {
    androidVersion: 34,
    getPermissionsAsync: async () => ({ status: 'granted' }),
    requestPermissionsAsync: async () => ({ status: 'granted' }),
    getExpoPushTokenAsync: async () => ({ data: 'ExponentPushToken[test]' }),
    setNotificationChannelAsync: async () => undefined,
    setNotificationHandler: () => undefined,
    ...overrides,
  };
}

function client(overrides: Partial<NotificationClient> = {}): NotificationClient {
  return {
    getNotificationPreferences: async () => ({ news_and_events: false, memory_status: true }),
    updateNotificationPreferences: async (patch) => ({ news_and_events: false, memory_status: true, ...patch }),
    registerPushToken: async () => ({ platform: 'android' }),
    deletePushToken: async () => undefined,
    ...overrides,
  };
}

function notification(type: string, id: string) {
  return {
    date: 0,
    request: {
      identifier: `${type}-${id}`,
      trigger: null,
      content: {
        title: null,
        subtitle: null,
        body: null,
        categoryIdentifier: null,
        sound: null,
        data: { type, id },
      },
    },
  };
}

describe('avisos push del visitante', () => {
  beforeEach(async () => {
    resetPushRegistrationForTests();
    await accountSession.resetForTests();
  });

  it('CA-01 muestra los dos interruptores y conserva cámara, ubicación y las filas', async () => {
    const view = await render(
      <SettingsScreen {...screenProps} newsAndEvents={false} memoryStatus onNotificationToggle={jest.fn()} />,
    );
    expect(view.getByLabelText('Noticias y eventos')).toBeTruthy();
    expect(view.getByLabelText('Estado de mis momentos')).toBeTruthy();
    expect(view.getByLabelText('Cámara')).toBeTruthy();
    expect(view.getByLabelText('Ubicación')).toBeTruthy();
    expect(view.getByLabelText('Privacidad')).toBeTruthy();
    expect(view.getByLabelText('Ayuda y soporte')).toBeTruthy();
    expect(view.getByLabelText('Acerca de ARCA-NB v1.0.0')).toBeTruthy();
    expect(view.queryByText('Modo oscuro')).toBeNull();
    expect(view.queryByText('Idioma')).toBeNull();
    expect(view.queryByText('Sonidos y efectos')).toBeNull();
  });

  it('CA-02 pinta los valores de la API y revierte el interruptor si el PATCH falla', async () => {
    const api = client({
      updateNotificationPreferences: async () => {
        throw new Error('falló');
      },
    });
    const view = await render(<Probe client={api} port={port()} />);
    expect(view.getByLabelText('Noticias y eventos').props.value).toBe(false);
    expect(view.getByLabelText('Estado de mis momentos').props.value).toBe(true);

    await fireEvent(view.getByLabelText('Noticias y eventos'), 'valueChange', true);
    expect(await view.findByText('No se pudo guardar el aviso. Inténtalo de nuevo.')).toBeTruthy();
    expect(view.getByLabelText('Noticias y eventos').props.value).toBe(false);
  });

  it('si no puede leer los avisos, lo dice', async () => {
    const api = client({
      getNotificationPreferences: async () => { throw new Error('red'); },
    });
    const view = await render(<Probe client={api} port={port()} />);
    expect(await view.findByText('No se pudieron leer los avisos.')).toBeTruthy();
  });

  it('con ambos avisos apagados no registra el teléfono y sin cliente no guarda', async () => {
    function Flags({
      api,
      notifications,
    }: {
      api: NotificationClient | null;
      notifications: PushNotificationsPort | null;
    }) {
      const state = useNotificationPreferences(api, notifications);
      return (
        <>
          <Text>{`${state.preferences.news_and_events ? 'noticias' : 'sin-noticias'} ${state.preferences.memory_status ? 'momentos' : 'sin-momentos'}`}</Text>
          <Text onPress={() => state.toggle('news_and_events', true)}>encender</Text>
        </>
      );
    }

    let finishSave: (value: { news_and_events: boolean; memory_status: boolean }) => void = () => undefined;
    const save = new Promise<{ news_and_events: boolean; memory_status: boolean }>((resolve) => {
      finishSave = resolve;
    });
    const quiet = await render(
      <Flags
        api={client({
          getNotificationPreferences: async () => ({ news_and_events: false, memory_status: false }),
          updateNotificationPreferences: () => save,
        })}
        notifications={port()}
      />,
    );
    expect(await quiet.findByText('sin-noticias sin-momentos')).toBeTruthy();
    await act(async () => {
      fireEvent.press(quiet.getByText('encender'));
    });
    await act(async () => {
      finishSave({ news_and_events: false, memory_status: false });
      await save;
    });
    expect(quiet.getByText('sin-noticias sin-momentos')).toBeTruthy();

    clearNotificationPreferences();
    const newsOnly = await render(
      <Flags
        api={client({
          getNotificationPreferences: async () => ({ news_and_events: true, memory_status: false }),
        })}
        notifications={null}
      />,
    );
    expect(await newsOnly.findByText('noticias sin-momentos')).toBeTruthy();

    const absent = await render(<Flags api={null} notifications={null} />);
    await act(async () => {
      fireEvent.press(absent.getByText('encender'));
    });
    expect(absent.getByText('sin-noticias momentos')).toBeTruthy();
  });

  it('CA-02 deja el valor que la API confirma', async () => {
    const api = client();
    const view = await render(<Probe client={api} port={port({ androidVersion: 28, getPermissionsAsync: async () => ({ status: 'denied' }) })} />);
    await fireEvent(view.getByLabelText('Noticias y eventos'), 'valueChange', true);
    expect(view.getByLabelText('Noticias y eventos').props.value).toBe(true);
  });

  it('CA-03 en Android 13 pide el permiso y en versiones anteriores no muestra otro diálogo', async () => {
    const modernRequest = jest.fn(async () => ({ status: 'granted' as const }));
    await preparePushRegistration(client(), port({ androidVersion: 34, getPermissionsAsync: async () => ({ status: 'undetermined' }), requestPermissionsAsync: modernRequest }));
    expect(modernRequest).toHaveBeenCalledTimes(1);

    const legacyRequest = jest.fn(async () => ({ status: 'granted' as const }));
    await preparePushRegistration(client(), port({
      androidVersion: 28,
      getPermissionsAsync: async () => ({ status: 'denied' }),
      requestPermissionsAsync: legacyRequest,
    }));
    expect(legacyRequest).not.toHaveBeenCalled();
  });

  it('CA-04 registra el token android una sola vez y no lo escribe en almacenamiento', async () => {
    const register = jest.fn(async () => ({ platform: 'android' as const }));
    const storage = { setItem: jest.fn(), log: jest.fn() };
    const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    await preparePushRegistration(client({ registerPushToken: register }), port());
    await preparePushRegistration(client({ registerPushToken: register }), port());
    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith('ExponentPushToken[test]');
    resetPushRegistrationForTests();
    let release: (value: { platform: 'android' }) => void = () => undefined;
    const parallel = jest.fn(() => new Promise<{ platform: 'android' }>((resolve) => {
      release = resolve;
    }));
    const first = preparePushRegistration(client({ registerPushToken: parallel }), port());
    const second = preparePushRegistration(client({ registerPushToken: parallel }), port());
    await new Promise<void>((done) => {
      setImmediate(() => done());
    });
    expect(parallel).toHaveBeenCalledTimes(1);
    release({ platform: 'android' });
    await Promise.all([first, second]);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(consoleLog).not.toHaveBeenCalled();
    consoleLog.mockRestore();
  });

  it('CA-05 al negar el permiso conserva la preferencia y no registra el token', async () => {
    const register = jest.fn();
    const view = await render(
      <Probe
        client={client({ registerPushToken: register })}
        port={port({
          getPermissionsAsync: async () => ({ status: 'denied' }),
          requestPermissionsAsync: async () => ({ status: 'denied' }),
        })}
      />,
    );
    expect(await view.findByText(DENIED_NOTIFICATION_TEXT)).toBeTruthy();
    expect(view.getByLabelText('Estado de mis momentos').props.value).toBe(true);
    expect(register).not.toHaveBeenCalled();
  });

  it('CA-06 apagar un interruptor envía false y no da de baja el token si el otro sigue encendido', async () => {
    const update = jest.fn(async (patch: { news_and_events?: boolean; memory_status?: boolean }) => ({
      news_and_events: false,
      memory_status: true,
      ...patch,
    }));
    const remove = jest.fn();
    const view = await render(<Probe client={client({ updateNotificationPreferences: update, deletePushToken: remove })} port={port()} />);
    await fireEvent(view.getByLabelText('Noticias y eventos'), 'valueChange', false);
    expect(update).toHaveBeenCalledWith({ news_and_events: false });
    expect(remove).not.toHaveBeenCalled();
  });

  it('CA-07 cerrar sesión y borrar la cuenta dan de baja el token antes', async () => {
    const order: string[] = [];
    await preparePushRegistration(client({
      deletePushToken: async () => { order.push('delete'); },
    }), port());
    jest.spyOn(authRepository, 'logout').mockImplementation(async () => { order.push('logout'); });
    await accountSession.logout();
    expect(order).toEqual(['delete', 'logout']);

    order.length = 0;
    await preparePushRegistration(client({
      deletePushToken: async () => { order.push('delete'); },
    }), port());
    jest.spyOn(authRepository, 'deleteAccount').mockImplementation(async () => {
      order.push('delete-account');
      return { ok: true as const, status: 204 as const, message: 'Cuenta eliminada' };
    });
    await accountSession.deleteAccount('secreta12');
    expect(order).toEqual(['delete', 'delete-account']);
  });

  it('CA-08 declara los canales y conserva el título y el cuerpo', async () => {
    const captured: {
      handler: ((notification: IncomingNotification) => Promise<{ shouldShowBanner: boolean; shouldShowList: boolean }>) | null;
    } = { handler: null };
    const channels: string[] = [];
    await preparePushRegistration(client(), port({
      setNotificationChannelAsync: async (id, channel) => { channels.push(`${id}:${channel.name}`); },
      setNotificationHandler: (next) => { captured.handler = next.handleNotification; },
    }));
    expect(channels).toEqual(['news-and-events:Noticias y eventos', 'memories:Momentos']);
    const notify = captured.handler;
    if (!notify) throw new Error('El aviso no registró el presentador.');
    const presentation = await notify({ title: 'Llegó el jaguar', body: 'Hay una noticia nueva.' });
    expect(presentation).toEqual({ shouldShowBanner: true, shouldShowList: true });
    expect(deliveredNotification()).toEqual({ title: 'Llegó el jaguar', body: 'Hay una noticia nueva.' });
    const fromExpo = await notify({
      title: '',
      body: '',
      request: { content: { title: 'Tu momento fue aceptado', body: 'Tu foto ya está en la galería del portal.' } },
    });
    expect(fromExpo?.shouldShowBanner).toBe(true);
    expect(deliveredNotification()).toEqual({
      title: 'Tu momento fue aceptado',
      body: 'Tu foto ya está en la galería del portal.',
    });
  });

  it('CA-09 abre el detalle y, si ya no existe, avisa y vuelve al inicio', async () => {
    const router = { push: jest.fn(), replace: jest.fn() };
    await openPush({ type: 'news', id: '4' }, router, async () => true);
    expect(router.push).toHaveBeenCalledWith({ pathname: '/news-detail', params: { id: '4' } });
    await openPush({ type: 'event', id: '8' }, router, async () => true);
    expect(router.push).toHaveBeenCalledWith({ pathname: '/event-detail', params: { id: '8' } });
    const message = await openPush({ type: 'news', id: '9' }, router, async () => false);
    expect(message).toBe(UNAVAILABLE_PUSH_TEXT);
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('CA-09 lee el tipo y el id que manda la API', () => {
    expect(readPushData({ type: 'news', id: 4 })).toEqual({ type: 'news', id: '4' });
    expect(readPushData(null)).toEqual({});
  });

  it('CA-10 abre la petición del momento', async () => {
    const router = { push: jest.fn(), replace: jest.fn() };
    await openPush({ type: 'memory', id: '15' }, router, async () => true);
    expect(router.push).toHaveBeenCalledWith({ pathname: '/memory-form', params: { id: '15' } });
  });

  it('CA-11 no crea una bandeja de avisos', async () => {
    const view = await render(<SettingsScreen {...screenProps} />);
    expect(view.queryByText('Avisos recibidos')).toBeNull();
  });

  it('CA-12 la pantalla no importa el cliente ni fetch', () => {
    const source = fs.readFileSync(path.join(__dirname, '../src/screens/SettingsScreen.tsx'), 'utf8');
    expect(source).not.toContain('@arca/api-client');
    expect(source).not.toContain('fetch(');
  });

  it('CA-14: conecta los avisos de Expo con Inicio y libera las suscripciones', () => {
    const notifications = jest.requireMock<typeof import('expo-notifications')>('expo-notifications');
    const onReceive = jest.mocked(notifications.addNotificationReceivedListener);
    const onOpen = jest.mocked(notifications.addNotificationResponseReceivedListener);
    const removeReceive = jest.fn();
    const removeOpen = jest.fn();
    onReceive.mockReturnValue({ remove: removeReceive });
    onOpen.mockReturnValue({ remove: removeOpen });
    const refresh = jest.fn();
    const endRefresh = listenForPublicContentPush(refresh);
    const router = { push: jest.fn(), replace: jest.fn() };
    const stop = listenForPushOpens(router);

    try {
      const emit = onReceive.mock.calls[0][0];
      for (const type of ['memory', 'event', 'news']) {
        emit(notification(type, '8'));
      }
      expect(refresh).toHaveBeenCalledTimes(2);
      expect(router.push).not.toHaveBeenCalled();
    } finally {
      stop();
      endRefresh();
    }
    expect(removeReceive).toHaveBeenCalledTimes(1);
    expect(removeOpen).toHaveBeenCalledTimes(1);
  });
});

describe('apertura de avisos de Expo', () => {
  const notifications = jest.requireMock<typeof import('expo-notifications')>('expo-notifications');
  const onOpen = jest.mocked(notifications.addNotificationResponseReceivedListener);
  const lastResponse = jest.mocked(notifications.getLastNotificationResponse);
  const clearResponse = jest.mocked(notifications.clearLastNotificationResponseAsync);
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_API_URL = 'https://zoo.example/api/v1';
    lastResponse.mockReturnValue(null);
    onOpen.mockReturnValue({ remove: jest.fn() });
    jest.mocked(notifications.addNotificationReceivedListener).mockReturnValue({ remove: jest.fn() });
  });

  afterEach(() => {
    if (apiUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = apiUrl;
    jest.restoreAllMocks();
  });

  it('CA-09 y CA-14 comprueba y abre una noticia al arrancar, y omite el mismo aviso repetido', async () => {
    const fetchDetail = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 21 } }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const response = { actionIdentifier: 'default', notification: notification('news', '21') };
    lastResponse.mockReturnValue(response);
    const refresh = jest.fn();
    const unsubscribe = listenForPublicContentPush(refresh);
    const router = { push: jest.fn(), replace: jest.fn() };
    const stop = listenForPushOpens(router);

    try {
      onOpen.mock.calls[0][0](response);
      await waitFor(() => expect(clearResponse).toHaveBeenCalledTimes(1));
      expect(fetchDetail).toHaveBeenCalledTimes(1);
      expect(fetchDetail).toHaveBeenCalledWith('https://zoo.example/api/v1/news/21', expect.objectContaining({ method: 'GET' }));
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(router.push).toHaveBeenCalledTimes(1);
      expect(router.push).toHaveBeenCalledWith({ pathname: '/news-detail', params: { id: '21' } });
    } finally {
      stop();
      unsubscribe();
    }
  });

  it.each([
    { id: '22', status: 404, unavailable: true },
    { id: '23', status: 200, unavailable: true },
    { id: '24', status: 503, unavailable: false },
  ])('CA-09 resuelve la apertura de un evento cuando el servidor devuelve $status', async ({ id, status, unavailable }) => {
    const fetchDetail = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({}), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const unsubscribe = listenForPublicContentPush(jest.fn());
    const router = { push: jest.fn(), replace: jest.fn() };
    const stop = listenForPushOpens(router);

    try {
      onOpen.mock.calls[0][0]({ actionIdentifier: 'default', notification: notification('event', id) });
      await waitFor(() => expect(clearResponse).toHaveBeenCalledTimes(1));
      expect(fetchDetail).toHaveBeenCalledWith(`https://zoo.example/api/v1/events/${id}`, expect.objectContaining({ method: 'GET' }));
      if (unavailable) {
        expect(router.replace).toHaveBeenCalledWith('/');
        expect(alert).toHaveBeenCalledWith(UNAVAILABLE_PUSH_TEXT);
        expect(router.push).not.toHaveBeenCalled();
      } else {
        expect(router.push).toHaveBeenCalledWith({ pathname: '/event-detail', params: { id } });
        expect(alert).not.toHaveBeenCalled();
      }
    } finally {
      stop();
      unsubscribe();
    }
  });

  it('CA-09 deja que el detalle se abra sin una URL remota configurada', async () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    const fetchDetail = jest.spyOn(globalThis, 'fetch');
    const router = { push: jest.fn(), replace: jest.fn() };
    const stop = listenForPushOpens(router);

    try {
      await followPushResponse(null);
      expect(router.push).not.toHaveBeenCalled();
      await followPushResponse({ notification: notification('news', '25') });
      expect(fetchDetail).not.toHaveBeenCalled();
      expect(router.push).toHaveBeenCalledWith({ pathname: '/news-detail', params: { id: '25' } });
    } finally {
      stop();
    }
  });

  it('CA-14 entrega solo una vez a Inicio un aviso válido recibido antes de suscribirse', () => {
    signalPublicContentPush({ type: 'news', id: '26' });
    const refresh = jest.fn();
    const unsubscribe = listenForPublicContentPush(refresh);
    unsubscribe();
    const nextRefresh = jest.fn();
    const stop = listenForPublicContentPush(nextRefresh);
    try {
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(nextRefresh).not.toHaveBeenCalled();
      signalPublicContentPush({ type: 'event', id: '0' });
      signalPublicContentPush({ type: 'news' });
      expect(nextRefresh).not.toHaveBeenCalled();
      signalPublicContentPush({ type: 'event', id: '27' });
      expect(nextRefresh).toHaveBeenCalledTimes(1);
      expect(refresh).toHaveBeenCalledTimes(1);
    } finally {
      stop();
    }
  });
});
