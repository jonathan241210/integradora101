jest.mock('react-native-safe-area-context', () => {
  const RNActual = jest.requireActual('react-native-safe-area-context');
  return {
    ...RNActual,
    useSafeAreaInsets: jest.fn().mockReturnValue({ top: 0, left: 0, bottom: 0, right: 0 }),
    useSafeAreaFrame: jest.fn().mockReturnValue({ width: 0, height: 0, x: 0, y: 0 }),
  };
});