import { MOCK_ANIMALS } from '../src/mocks/zoo';
import { theme } from '../src/theme';
import { colors as arcaColors } from '@arca/tokens';

function contrastRatio(foreground: string, background: string) {
  const luminance = (color: string) => {
    const channels = color.match(/[a-f\d]{2}/gi)!.map((channel) => {
      const normalized = parseInt(channel, 16) / 255;
      return normalized <= 0.04045
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

describe('Theme Adapter', () => {
  it('should correctly map @arca/tokens to the local theme', () => {
    expect(theme.colors).toEqual(arcaColors);
  });

  it('should provide access to spacing and radius tokens', () => {
    expect(theme.spacing).toBeDefined();
    expect(theme.radius).toBeDefined();
  });

  it('test-ca-07: uses institutional colors and shared semantic tokens', () => {
    expect(theme.colors).toMatchObject({
      base: '#661a2f',
      primary: '#87293a',
      secondary: '#b79159',
      accent: '#dec9a3',
      danger: '#c34242',
      textOnPrimary: '#ffffff',
      textOnSecondary: '#000000',
      textOnAccent: '#000000',
      textOnDanger: '#ffffff',
    });
    expect(Object.values(theme.colors)).not.toEqual(
      expect.arrayContaining(['#2E7D32', '#C8E6C9', '#FFD700', '#D32F2F']),
    );

    for (const [foreground, background] of [
      [theme.colors.textOnPrimary, theme.colors.primary],
      [theme.colors.textOnPrimary, theme.colors.base],
      [theme.colors.textOnSecondary, theme.colors.secondary],
      [theme.colors.textOnAccent, theme.colors.accent],
      [theme.colors.textOnDanger, theme.colors.danger],
      [theme.colors.textMuted, theme.colors.background],
      [theme.colors.textMuted, theme.colors.surface],
      [theme.colors.textOnPrimary, theme.colors.text],
    ]) {
      expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
    }

    expect(MOCK_ANIMALS.map(({ placeholderTint }) => placeholderTint)).toEqual([
      '#FFB84D',
      '#F4A460',
      '#B0C4DE',
      '#8B4513',
      '#ADD8E6',
    ]);
  });
});
