import React from 'react';
import { render } from '@testing-library/react-native';
import { ProgressBar } from '../src/components/ui/ProgressBar';

describe('ProgressBar', () => {
  it('exposes a clamped percentage to accessibility services', async () => {
    const { getByTestId } = await render(<ProgressBar value={1.4} label="Progreso" />);

    expect(getByTestId('progress-bar').props.accessibilityValue).toEqual({
      min: 0,
      max: 100,
      now: 100,
    });
  });

  it('treats non-finite values as no progress', async () => {
    const { getByTestId } = await render(<ProgressBar value={Number.NaN} label="Progreso" />);

    expect(getByTestId('progress-bar').props.accessibilityValue).toEqual({
      min: 0,
      max: 100,
      now: 0,
    });
  });
});
