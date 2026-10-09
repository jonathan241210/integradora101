import React from 'react';
import { render } from '@testing-library/react-native';
import { HomeScreen } from '../src/screens/HomeScreen';
import { Animal, ZooEvent, News } from '../src/models';

describe('HomeScreen (CA-04)', () => {
  it('renderiza la pantalla raíz sin excepciones locales', async () => {
    const mockAnimal: Animal = {
      id: 'test',
      nickname: 'Test',
      commonName: 'Test Animal',
      scientificName: 'Testus testus',
      zone: 'Test Zone',
      isDiscovered: true,
      placeholderTint: '#FFFFFF',
      stats: { avgWeight: '0 kg', size: '0 m', lifeExpectancy: '0 años' },
      diet: 'Test',
      curiosities: 'Test',
      funFact: 'Test',
    };

    const mockEvent: ZooEvent = {
      id: 'e1',
      title: 'Test Event',
      date: '12 de octubre de 2026',
      time: '12:00 PM',
      location: 'Test Location',
      description: 'Test event description.',
    };

    const mockNews: News = {
      title: 'Test News',
      body: 'This is a test news.',
    };

    const { getByText } = await render(
      <HomeScreen
        appName="ARCA-NB"
        featuredAnimals={[mockAnimal]}
        events={[mockEvent]}
        news={mockNews}
      />
    );

    const welcomeText = getByText('Bienvenido al Zoológico');
    expect(welcomeText).toBeTruthy();
  });
});