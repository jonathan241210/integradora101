import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import HomeRoute from '../src/app/(tabs)/index';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

describe('Home route', () => {
  it('renders the visitor home screen and its mock data', async () => {
    const { getByText } = await render(<HomeRoute />);

    await waitFor(() => {
      expect(getByText('Bienvenido al Zoológico')).toBeTruthy();
      expect(getByText('Animales Destacados')).toBeTruthy();
    });
  });
});
