import { theme } from '../src/theme';
import { colors as arcaColors } from '@arca/tokens';

describe('Theme Adapter', () => {
  it('should correctly map @arca/tokens to the local theme', () => {
    expect(theme.colors).toEqual(arcaColors);
  });

  it('should provide access to spacing and radius tokens', () => {
    expect(theme.spacing).toBeDefined();
    expect(theme.radius).toBeDefined();
  });
});
