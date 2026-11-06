require('./test-support/locationMocks');

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-location', () => ({
  Accuracy: { BestForNavigation: 6 },
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true, canAskAgain: true })),
  watchPositionAsync: jest.fn(async () => ({ remove: jest.fn() })),
}));

jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    CameraView: (props) => React.createElement(View, { testID: 'camera-view', ...props }),
    useCameraPermissions: jest.fn(() => [
      { granted: true, canAskAgain: true, status: 'granted' },
      jest.fn(async () => ({ granted: true, canAskAgain: true, status: 'granted' })),
    ]),
  };
});

jest.mock('expo-network', () => ({
  useNetworkState: jest.fn(() => ({
    type: 'WIFI',
    isConnected: true,
    isInternetReachable: true,
  })),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  watchPositionAsync: jest.fn().mockResolvedValue({ remove: jest.fn() }),
  Accuracy: {
    Lowest: 1,
    Low: 2,
    Balanced: 3,
    High: 4,
    Highest: 5,
    BestForNavigation: 6,
  },
}));

jest.mock('./src/hooks/useScreenFocusEffect', () => {
  const React = require('react');
  return {
    useScreenFocusEffect: (effect) => {
      React.useEffect(() => {
        const cleanup = effect();
        return typeof cleanup === 'function' ? cleanup : undefined;
      }, [effect]);
    },
  };
});

jest.mock('react-native-safe-area-context', () => {
  const RNActual = jest.requireActual('react-native-safe-area-context');
  return {
    ...RNActual,
    useSafeAreaInsets: jest.fn().mockReturnValue({ top: 0, left: 0, bottom: 0, right: 0 }),
    useSafeAreaFrame: jest.fn().mockReturnValue({ width: 0, height: 0, x: 0, y: 0 }),
  };
});
