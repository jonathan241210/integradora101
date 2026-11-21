import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ArAnimalProximityCard } from '../src/components/map/ArAnimalProximityCard';
import { ArTourOverlay } from '../src/components/map/ArTourOverlay';
import { MOCK_MAP_PLACES } from '../src/mocks/zoo';
import { getAnimalCardData } from '../src/utils/enclosureAnimals';

describe('Mobile — Tarjeta interactiva de datos del animal por proximidad en Recorrido AR', () => {
  const tigerPlace = MOCK_MAP_PLACES.find((p) => p.id === 'juan')!;
  const noop = () => undefined;

  it('getAnimalCardData asocia correctamente los datos del animal (nombre, dieta, curiosidad, emoji)', () => {
    const data = getAnimalCardData(tigerPlace);
    expect(data.title).toBe('Hábitat del Tigre');
    expect(data.subtitle).toContain('Juan');
    expect(data.diet).toContain('Carnívoro');
    expect(data.funFact).toContain('le encanta nadar');
    expect(data.iconEmoji).toBe('🐯');
    expect(data.categoryLabel).toBe('Recinto de fauna');
  });

  it('renderiza la tarjeta interactiva ArAnimalProximityCard con sus datos y permite expandir curiosidades', async () => {
    const onDismiss = jest.fn();
    const { getByTestId, getByText } = await render(
      <ArAnimalProximityCard
        place={tigerPlace}
        distanceMeters={8}
        onDismiss={onDismiss}
      />,
    );

    // Debe mostrar la tarjeta y el indicador de proximidad
    expect(getByTestId('ar-animal-proximity-card')).toBeTruthy();
    expect(getByText(/¡Cerca del recinto! • ~8 m/)).toBeTruthy();
    expect(getByText('Hábitat del Tigre')).toBeTruthy();
    expect(getByText(/Juan \(Macho\)/)).toBeTruthy();
    expect(getByText(/Carnívoro/)).toBeTruthy();

    // Botón interactivo de alternar detalles adicionales
    const expandBtn = getByTestId('ar-card-action-button');
    expect(getByText('▼ Info')).toBeTruthy();

    await fireEvent.press(expandBtn);
    expect(getByText('▲ Menos')).toBeTruthy();

    // Botón de cierre
    const closeBtn = getByTestId('ar-close-proximity-card');
    await fireEvent.press(closeBtn);
    expect(onDismiss).toHaveBeenCalledTimes(1);

    // Botón de entendido
    const dismissBtn = getByTestId('ar-card-dismiss-btn');
    await fireEvent.press(dismissBtn);
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });

  it('muestra estado destacado de LLEGADA AL RECINTO cuando isArrived es true y permite continuar al siguiente recinto', async () => {
    const onDismiss = jest.fn();
    const { getByTestId, getByText } = await render(
      <ArAnimalProximityCard
        place={tigerPlace}
        distanceMeters={2}
        isArrived={true}
        onDismiss={onDismiss}
      />,
    );

    // Debe indicar la llegada explícita al recinto
    expect(getByTestId('ar-proximity-badge')).toBeTruthy();
    expect(getByText('🎉 ¡HAS LLEGADO AL RECINTO! • 0 m')).toBeTruthy();
    expect(getByText('¡Llegaste a Hábitat del Tigre!')).toBeTruthy();
  });

  it('ArTourOverlay muestra llegada y tarjeta interactiva de recinto seleccionado', async () => {
    const onDismissArrival = jest.fn();
    const { getByTestId, getByText } = await render(
      <ArTourOverlay
        arPoints={[{
          id: 'enclosure-juan',
          sourceId: 'juan',
          name: tigerPlace.name,
          latitude: 20.08,
          longitude: -98.722,
          kind: 'enclosure',
          distanceMeters: 5,
          bearingDegrees: 0,
          relativeBearingDegrees: 0,
          showLabel: true,
        }]}
        visitedArIds={new Set(['enclosure-juan'])}
        selectedArPointId="enclosure-juan"
        onSelectArPoint={noop}
        onClose={noop}
        hasLocation={true}
        headingAvailable={true}
        lowAccuracy={false}
        arrivedArPoint={{ id: 'enclosure-juan', name: tigerPlace.name, kind: 'enclosure' }}
        onDismissArrival={onDismissArrival}
        selectedPlace={tigerPlace}
      />,
    );

    expect(getByTestId('ar-arrival-banner')).toBeTruthy();
    expect(getByText('Llegaste a')).toBeTruthy();
    expect(getByTestId('ar-animal-proximity-card')).toBeTruthy();
  });
});
