import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { NewsDetailScreen } from '../src/screens/NewsDetailScreen';
import { HomeScreen } from '../src/screens/HomeScreen';
import { PORTAL_LEAVE_MESSAGE, PORTAL_MISSING_MESSAGE, resolvePortalPage } from '../src/navigation/portal';
import { mapEventToZooEventModel, resolveUsableImageUrl } from '../src/repositories/mappers';
import { ZooEvent, News } from '../src/models';
import { spacing } from '../src/theme/tokens';

const animal = {
  id: 'a1',
  nickname: 'Ana',
  commonName: 'Guacamaya',
  scientificName: 'Ara',
  zone: 'Aves',
  isDiscovered: false,
  placeholderTint: '#8A9A5B',
};

function event(id: string, title: string): ZooEvent {
  return {
    id,
    title,
    date: '2026-11-10',
    time: '10:00',
    location: 'Plaza',
    description: 'Detalle',
    imageUrls: [`https://img.test/${id}.jpg`],
  };
}

function news(id: string, title: string): News {
  return { id, title, body: 'Resumen', date: '10 de noviembre de 2026', imageUrl: `https://img.test/${id}.jpg` };
}

describe('mobile-003 enmienda de inicio', () => {
  afterEach(() => {
    cleanup();
  });
  it('CA-10: usa la URL pública, el enlace externo y descarta la ruta relativa', () => {
    expect(resolveUsableImageUrl('https://img.test/a.jpg', 'events/a.jpg')).toBe('https://img.test/a.jpg');
    expect(resolveUsableImageUrl(null, 'https://images.unsplash.com/photo.jpg')).toBe('https://images.unsplash.com/photo.jpg');
    expect(resolveUsableImageUrl(null, 'events/archivo.jpg', 'http://10.0.2.2:8000/api/v1'))
      .toBe('http://10.0.2.2:8000/storage/events/archivo.jpg');
    expect(resolveUsableImageUrl(null, 'events/archivo.jpg', null)).toBeUndefined();
    expect(resolveUsableImageUrl(
      'http://localhost/storage/events/a.jpg',
      null,
      'http://10.0.2.2:8000/api/v1',
    )).toBe('http://10.0.2.2:8000/storage/events/a.jpg');
    expect(mapEventToZooEventModel({
      id: 2,
      name: 'Taller',
      image_url: null,
      image_path: 'https://images.unsplash.com/photo.jpg',
    }).imageUrls).toEqual(['https://images.unsplash.com/photo.jpg']);
  });

  it('CA-09: el detalle de la noticia permanece en la app', async () => {
    const view = await render(
      <NewsDetailScreen
        news={{
          id: '25',
          title: 'Aviso de hoy',
          body: 'Resumen',
          date: '10 de noviembre de 2026',
          imageUrl: 'https://img.test/noticia.jpg',
          content: 'Texto completo de la noticia.',
        }}
        onBackPress={jest.fn()}
      />,
    );
    expect(view.getByText('Aviso de hoy')).toBeTruthy();
    expect(view.getByText('10 de noviembre de 2026')).toBeTruthy();
    expect(view.getByText('Texto completo de la noticia.')).toBeTruthy();
    expect(view.queryByText('Portal del zoológico')).toBeNull();
  });

  it('CA-11: deslizar hacia abajo pide actualizar noticias y eventos', async () => {
    const onRefresh = jest.fn();
    const view = await render(
      <HomeScreen
        appName="ARCA-NB"
        featuredAnimals={[animal]}
        events={[event('e1', 'Primero')]}
        news={[news('n1', 'Aviso uno')]}
        onRefresh={onRefresh}
      />,
    );
    expect(view.getByText('Desliza hacia abajo para actualizar noticias y eventos.')).toBeTruthy();
    const found: Array<{ props: { onRefresh?: () => void } }> = [];
    const seen = new Set<unknown>();
    const walk = (node: unknown) => {
      if (!node || typeof node !== 'object' || seen.has(node)) return;
      seen.add(node);
      const current = node as { props?: { onRefresh?: () => void; children?: unknown }; children?: unknown[]; instance?: unknown };
      if (typeof current.props?.onRefresh === 'function') found.push(current as { props: { onRefresh: () => void } });
      const nested = current.props?.children;
      const list = [
        ...(current.children ?? []),
        ...(Array.isArray(nested) ? nested : nested ? [nested] : []),
        current.instance,
      ];
      for (const child of list) walk(child);
    };
    walk(view.container);
    expect(found.length).toBeGreaterThan(0);
    found[0].props.onRefresh?.();
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('CA-12: Misiones se abre con un toque y el inicio vuelve en la misma pantalla', async () => {
    const onMissionPress = jest.fn();
    const view = await render(
      <HomeScreen
        appName="ARCA-NB"
        featuredAnimals={[animal]}
        events={[event('e1', 'Primero')]}
        news={[news('n1', 'Aviso uno')]}
        missions={[{ id: 'm1', title: 'Safari Matutino', objective: 'Mirar', progress: 1, total: 2, reward: '100 puntos' }]}
        onMissionPress={onMissionPress}
      />,
    );
    expect(view.queryByText('Tu próxima aventura te espera')).toBeNull();
    expect(view.getByText('Noticias actuales')).toBeTruthy();
    await fireEvent.press(view.getByLabelText('Misiones'));
    expect(view.getByText('Safari Matutino')).toBeTruthy();
    expect(StyleSheet.flatten(view.getByTestId('missions-intro').props.style).paddingHorizontal).toBe(spacing.lg);
    expect(view.queryByText('Noticias actuales')).toBeNull();
    await fireEvent.press(view.getByText('Safari Matutino'));
    expect(onMissionPress).toHaveBeenCalledWith('m1');
    await fireEvent.press(view.getByLabelText('Inicio'));
    expect(view.getByText('Noticias actuales')).toBeTruthy();
    expect(view.queryByText('Safari Matutino')).toBeNull();
  });

  it('CA-03 y CA-08: el inicio muestra uno y despliega hasta tres', async () => {
    const onSeeAllEvents = jest.fn();
    const onSeeAllNews = jest.fn();
    const view = await render(
      <HomeScreen
        appName="ARCA-NB"
        featuredAnimals={[animal]}
        events={[event('e1', 'Primero'), event('e2', 'Segundo'), event('e3', 'Tercero'), event('e4', 'Cuarto')]}
        news={[news('n1', 'Aviso uno'), news('n2', 'Aviso dos')]}
        onSeeAllEventsPress={onSeeAllEvents}
        onSeeAllNewsPress={onSeeAllNews}
        visitorName="Ana"
        discoveredCount={0}
        totalAnimals={5}
      />,
    );
    expect(view.getByText('Te faltan 5 animales')).toBeTruthy();

    expect(view.getByText('Noticias actuales')).toBeTruthy();
    expect(view.getByText('Próximos eventos')).toBeTruthy();
    expect(view.getByText('Primero')).toBeTruthy();
    expect(view.queryByText('Segundo')).toBeNull();
    expect(view.getByText('Aviso uno')).toBeTruthy();
    expect(view.queryByText('Aviso dos')).toBeNull();

    await fireEvent.press(view.getByLabelText('Ver más eventos'));
    expect(view.getByText('Segundo')).toBeTruthy();
    await fireEvent.press(view.getByLabelText('Ver menos eventos'));
    expect(view.queryByText('Segundo')).toBeNull();
    await fireEvent.press(view.getByLabelText('Ver más eventos'));
    expect(view.getByText('Tercero')).toBeTruthy();
    expect(view.queryByText('Cuarto')).toBeNull();

    await fireEvent.press(view.getByLabelText('Ver más noticias'));
    expect(view.getByText('Aviso dos')).toBeTruthy();

    fireEvent.press(view.getByLabelText('Ver todos los eventos en el portal'));
    fireEvent.press(view.getByLabelText('Ver todas las noticias en el portal'));
    expect(onSeeAllEvents).toHaveBeenCalledTimes(1);
    expect(onSeeAllNews).toHaveBeenCalledTimes(1);
  });

  it('CA-03: Ver todos arma el aviso y la página del portal', () => {
    expect(PORTAL_LEAVE_MESSAGE).toMatch(/salir de la app/);
    expect(PORTAL_MISSING_MESSAGE).toMatch(/No hay una dirección/);
    expect(resolvePortalPage('eventos.html', { portalUrl: 'https://zoo.test/', allowDevFallback: false }))
      .toBe('https://zoo.test/eventos.html');
    expect(resolvePortalPage('noticias.html', { portalUrl: 'http://localhost:8080', allowDevFallback: false }))
      .toBe('http://localhost:8080/noticias.html');
    expect(resolvePortalPage('noticias.html', { portalUrl: '  ', allowDevFallback: false })).toBeNull();
  });
});
