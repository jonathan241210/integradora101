import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  LoadingView,
  EmptyView,
  ErrorView,
  OfflineBanner,
  RemoteImage,
} from '../src/components/ui';

describe('Catalog UI States & Fallbacks (mobile-003: CA-04, CA-06)', () => {
  it('CA-04: LoadingView should render accessible loading message in Spanish', async () => {
    const { getByText } = await render(<LoadingView message="Cargando catálogo..." />);
    expect(getByText('Cargando catálogo...')).toBeTruthy();
  });

  it('CA-04: EmptyView should render friendly empty catalog message in Spanish', async () => {
    const { getByText } = await render(
      <EmptyView
        title="Sin eventos programados"
        message="Vuelve a consultar más tarde."
      />
    );
    expect(getByText('Sin eventos programados')).toBeTruthy();
    expect(getByText('Vuelve a consultar más tarde.')).toBeTruthy();
  });

  it('CA-04: ErrorView should render error message and trigger onRetry when button pressed', async () => {
    const handleRetry = jest.fn();
    const { getByText } = await render(
      <ErrorView
        title="Fallo al conectar"
        message="No se pudo obtener la información."
        onRetry={handleRetry}
        retryLabel="Reintentar ahora"
      />
    );

    expect(getByText('Fallo al conectar')).toBeTruthy();
    expect(getByText('No se pudo obtener la información.')).toBeTruthy();

    const retryButton = getByText('Reintentar ahora');
    fireEvent.press(retryButton);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('CA-04: OfflineBanner should display alert with Spanish warning text', async () => {
    const { getByText } = await render(<OfflineBanner />);
    expect(getByText('SIN CONEXIÓN')).toBeTruthy();
    expect(getByText('Modo sin conexión. Mostrando información guardada.')).toBeTruthy();
  });

  it('CA-06: RemoteImage should render fallback label when uri is not provided or fails', async () => {
    const { getByText } = await render(
      <RemoteImage
        uri={null}
        fallbackLabel="JAGUAR"
        altText="Foto de Jaguar"
      />
    );
    expect(getByText('JAGUAR')).toBeTruthy();
  });
});
