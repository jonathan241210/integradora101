import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EnclosureDetailModal } from '../src/components/map/EnclosureDetailModal';
import { MOCK_MAP_PLACES } from '../src/mocks/zoo';

describe('Mobile — Ficha Técnica del Recinto y Acordeones de Animales (Nivel 2)', () => {
  const monkeyPlace = MOCK_MAP_PLACES.find((p) => p.id === 'monkey')!;
  const tigerPlace = MOCK_MAP_PLACES.find((p) => p.id === 'juan')!;

  it('renderiza la pastilla con el nombre del recinto y los acordeones de cada animal habitante', async () => {
    const onClose = jest.fn();

    const { getByTestId, getByText } = await render(
      <EnclosureDetailModal
        visible={true}
        place={monkeyPlace}
        onClose={onClose}
      />,
    );

    // Debe mostrar la pastilla superior con el nombre del recinto (boceto)
    expect(getByTestId('enclosure-sheet-title-pill')).toBeTruthy();
    expect(getByText('Bosque de Monos')).toBeTruthy();

    // En el bosque de monos habitan Koko y Chita (2 acordeones)
    expect(getByTestId('enclosure-animal-accordion-monkey-koko')).toBeTruthy();
    expect(getByTestId('enclosure-animal-accordion-monkey-chita')).toBeTruthy();

    // Verificamos nombres y sexos
    expect(getByText('Koko')).toBeTruthy();
    expect(getByText('♂ Macho')).toBeTruthy();
    expect(getByText('Chita')).toBeTruthy();
    expect(getByText('♀ Hembra')).toBeTruthy();
  });

  it('permite desplegar y colapsar la ficha técnica completa de cada animal con sus datos biológicos', async () => {
    const onClose = jest.fn();

    const { getByTestId, getByText, queryByText } = await render(
      <EnclosureDetailModal
        visible={true}
        place={monkeyPlace}
        onClose={onClose}
      />,
    );

    // Koko viene desplegado por defecto (primer animal)
    expect(getByText('Ateles geoffroyi')).toBeTruthy();
    expect(getByText('5 años')).toBeTruthy();
    expect(getByText('Selva Lacandona, Chiapas (Rescate)')).toBeTruthy();
    expect(getByText('Gestación de 225 días • 1 cría por camada')).toBeTruthy();
    expect(getByText('25 años')).toBeTruthy();

    // Desplegamos a Chita tocando su cabecera
    const chitaToggle = getByTestId('toggle-animal-monkey-chita');
    await fireEvent.press(chitaToggle);

    expect(getByText('4 años')).toBeTruthy();
    expect(getByText('Rescate PROFEPA Hidalgo')).toBeTruthy();

    // Botón de cerrar superior
    const closeBtn = getByTestId('enclosure-sheet-close-btn');
    await fireEvent.press(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    // Botón de volver inferior
    const returnBtn = getByTestId('enclosure-sheet-return-btn');
    await fireEvent.press(returnBtn);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('muestra la ficha de un solo animal cuando el recinto tiene un ejemplar único', async () => {
    const onClose = jest.fn();

    const { getByText } = await render(
      <EnclosureDetailModal
        visible={true}
        place={tigerPlace}
        onClose={onClose}
      />,
    );

    expect(getByText('Hábitat del Tigre')).toBeTruthy();
    expect(getByText('Juan')).toBeTruthy();
    expect(getByText('Panthera tigris tigris')).toBeTruthy();
    expect(getByText('6 años')).toBeTruthy();
    expect(getByText(/8 a 10 kg diarios de carne fresca/)).toBeTruthy();
    expect(getByText(/Gestación de 105 días/)).toBeTruthy();
  });

  it('prioriza y muestra los datos reales de los animales que vienen de la Base de Datos / API', async () => {
    const onClose = jest.fn();
    const dbPlace = {
      id: '1',
      name: 'Zona de Felinos y Sabana',
      kind: 'animal' as const,
      sectionId: 'enclosure-1',
      mapX: 0.4732,
      mapY: 0.4674,
      visible: true,
      animals: [
        {
          id: '5',
          name: 'Juan',
          speciesName: 'Jaguar',
          scientificName: 'Panthera onca',
          sex: 'M',
          age: '1000',
          origin: 'Miami',
          longevity: 'hasta donde dure papi',
          diet: 'MANZANAS',
          reproduction: 'DVD',
          characteristics: 'CARA Y ISTICAS',
          veterinaryStatus: 'Estatus: Permanente',
        },
      ],
    };

    const { getByText } = await render(
      <EnclosureDetailModal
        visible={true}
        place={dbPlace}
        onClose={onClose}
      />,
    );

    expect(getByText('Zona de Felinos y Sabana')).toBeTruthy();
    expect(getByText('Juan')).toBeTruthy();
    expect(getByText('♂ Macho')).toBeTruthy();
    expect(getByText('Panthera onca')).toBeTruthy();
    expect(getByText('1000')).toBeTruthy();
    expect(getByText('Miami')).toBeTruthy();
    expect(getByText('hasta donde dure papi')).toBeTruthy();
    expect(getByText('MANZANAS')).toBeTruthy();
    expect(getByText('DVD')).toBeTruthy();
    expect(getByText('CARA Y ISTICAS')).toBeTruthy();
    expect(getByText('Estatus: Permanente')).toBeTruthy();
  });
});
