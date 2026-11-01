import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import QrScannerRoute from '../../src/app/(tabs)/scan';
import { accountSession } from '../../src/session/accountSession';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

describe('mobile-006 guardia de sesión', () => {
  beforeEach(async () => {
    mockReplace.mockClear();
    await accountSession.resetForTests();
  });

  it('test-ca-07-guest-redirects-to-login: visitante sin sesión va al login', async () => {
    await render(<QrScannerRoute />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });
});
