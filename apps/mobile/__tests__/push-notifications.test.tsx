import React from 'react';
import fs from 'fs';
import path from 'path';
import { act, fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SettingsScreen } from '../src/screens/SettingsScreen';
import { useNotificationPreferences, type NotificationClient } from '../src/viewmodels/useNotificationPreferences';
import {
  deliveredNotification,
  DENIED_NOTIFICATION_TEXT,
  preparePushRegistration,
  resetPushRegistrationForTests,
  type PushNotificationsPort,
} from '../src/push/pushRegistration';
import { clearNotificationPreferences } from '../src/push/notificationPreferences';
import { openPush, readPushData, UNAVAILABLE_PUSH_TEXT } from '../src/push/openPush';
import { accountSession } from '../src/session/accountSession';
import { authRepository } from '../src/repositories/mockAuthRepository';

const screenProps = {
  accountName: 'Ana',
  accountEmail: 'ana@correo.com',
  preferences: { location: false },
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
    await new Promise((done) => setImmediate(done));
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
      return { ok: true };
    });
    await accountSession.deleteAccount('secreta12');
    expect(order).toEqual(['delete', 'delete-account']);
  });

  it('CA-08 declara los canales y conserva el título y el cuerpo', async () => {
    let handler: ((notification: { title: string; body: string }) => Promise<{ shouldShowBanner: boolean; shouldShowList: boolean }>) | null = null;
    const channels: string[] = [];
    await preparePushRegistration(client(), port({
      setNotificationChannelAsync: async (id, channel) => { channels.push(`${id}:${channel.name}`); },
      setNotificationHandler: (next) => { handler = next.handleNotification; },
    }));
    expect(channels).toEqual(['news-and-events:Noticias y eventos', 'memories:Momentos']);
    const presentation = await handler?.({ title: 'Llegó el jaguar', body: 'Hay una noticia nueva.' });
    expect(presentation).toEqual({ shouldShowBanner: true, shouldShowList: true });
    expect(deliveredNotification()).toEqual({ title: 'Llegó el jaguar', body: 'Hay una noticia nueva.' });
    const fromExpo = await handler?.({
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
});
