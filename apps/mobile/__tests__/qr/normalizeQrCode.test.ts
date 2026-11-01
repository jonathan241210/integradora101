import { normalizeQrCode } from '../../src/utils/normalizeQrCode';

describe('mobile-006 normalizeQrCode', () => {
  it('test-ca-02-normalize-qr-payload: acepta código plano ARCA', () => {
    expect(normalizeQrCode('  arca-abc123  ')).toBe('ARCA-ABC123');
  });

  it('test-ca-02-normalize-qr-payload: extrae código de URL con query', () => {
    expect(normalizeQrCode('https://zoo.example/scan?code=ARCA-XYZ9')).toBe('ARCA-XYZ9');
  });

  it('test-ca-02-normalize-qr-payload: extrae código del último segmento de ruta', () => {
    expect(normalizeQrCode('https://zoo.example/qr/ARCA-SEG1')).toBe('ARCA-SEG1');
  });

  it('test-ca-02-normalize-qr-payload: rechaza texto inválido', () => {
    expect(normalizeQrCode('no-es-codigo')).toBeNull();
  });
});
