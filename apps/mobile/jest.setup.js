jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-network', () => ({
  useNetworkState: jest.fn(() => ({
    type: 'WIFI',
    isConnected: true,
    isInternetReachable: true,
  })),
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
