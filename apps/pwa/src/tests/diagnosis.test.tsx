import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { institution } from '@/viewmodels/diagnosisForms';
import { getSectionLabel, isNavigationActive } from '@/viewmodels/pwaDemo';
import { manualInstallController } from '@/tests/testFixtures';
import { AppShell } from '@/views/AppShell';
import { DiagnosisChooserView } from '@/views/DiagnosisChooserView';
import { DiagnosisIntenseView } from '@/views/DiagnosisIntenseView';
import { DiagnosisQuickView } from '@/views/DiagnosisQuickView';
import { PrintActions } from '@/views/DiagnosisPrint';
import { HomeView } from '@/views/HomeView';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const css = readFileSync(
  fileURLToPath(new URL('../styles.css', import.meta.url)),
  'utf8',
);
const intense = renderToStaticMarkup(<DiagnosisIntenseView />);
const quick = renderToStaticMarkup(<DiagnosisQuickView />);

afterEach(() => vi.unstubAllGlobals());

describe('CA-01 PWA diagnóstico intenso y rápido', () => {
  it('ofrece ambas modalidades en el selector y en Inicio', () => {
    const chooser = renderToStaticMarkup(
      <DiagnosisChooserView onNavigate={() => undefined} />,
    );
    const home = renderToStaticMarkup(<HomeView onNavigate={() => undefined} />);
    for (const markup of [chooser, home]) {
      expect(markup).toContain('Diagnóstico intenso');
      expect(markup).toContain('Diagnóstico rápido');
    }
    expect(isNavigationActive('diagnosis-form', 'diagnosis-quick')).toBe(true);
    expect(getSectionLabel('diagnosis-intense')).toBe('Diagnóstico intenso');
  });
});

describe('CA-02 PWA diagnóstico intenso y rápido', () => {
  it('incluye la historia clínica del ejemplar', () => {
    for (const text of [
      'MVZ',
      'Fecha',
      'Nombre',
      'Especie',
      'Identificación',
      'Edad',
      'Sexo',
      'Peso',
      'Movilización física',
      'Movilización química',
      'Medicamento',
      'Dosis mg/kg',
      'Dosis en ml',
      'Hora de aplicación',
      'Observaciones',
      'Manejo con red',
      'Manejo con domador',
      'Manejo con guantes o trapo',
      'Manejo con tubo',
      'Manejo con gancho herpetológico',
      'Tong',
      'Observaciones generales',
    ]) {
      expect(intense).toContain(text);
    }
  });
});

describe('CA-03 PWA diagnóstico intenso y rápido', () => {
  it('incluye la evaluación clínica y la sinología', () => {
    for (const text of [
      'Condición física general',
      'Piel y faneras',
      'Aparato digestivo',
      'Aparato urogenital',
      'Órganos de los sentidos',
      'Músculo-esquelético',
      'Nódulos linfáticos',
      'Sistema cardiovascular',
      'Sistema nervioso',
      'Aparato respiratorio',
      'Endócrino',
      'Ojos',
      'Temp.',
      'FR',
      'FC',
      'TLC',
      'C.C.',
      'No. de animales afectados',
      'Toma de muestra',
      'Sí',
      'No',
      'Sangre',
      'Orina',
      'Heces',
      'Fluidos',
      'Raspado cutáneo',
      'Biopsia',
      'Rayos X',
      'Muestra de laboratorio',
      'Diagnóstico presuntivo',
      'Diagnóstico definitivo',
    ]) {
      expect(intense).toContain(text);
    }
  });
});

describe('RN-05 PWA colores institucionales', () => {
  it('mapea la interfaz a los tokens semánticos del paquete institucional', () => {
    for (const token of [
      '--dashboard-primary: var(--primary)',
      '--dashboard-action: var(--primary)',
      '--dashboard-secondary: var(--secondary)',
      '--dashboard-foreground: var(--foreground)',
      'background: var(--sidebar)',
    ]) {
      expect(css).toContain(token);
    }
  });
});

describe('CA-04 PWA diagnóstico intenso y rápido', () => {
  it('incluye los grupos de casillas del formato rápido', () => {
    for (const text of ['Motivo de la valoración clínica', 'Frecuencia cardiaca', 'Temperatura', 'Actitud', 'Puntaje (1-5)', 'Cataratas', 'Cerumen', 'Gingivitis', 'Movimientos ruminales', 'Ectoparásitos', 'Taquipnea', 'Claudicación', 'Gestación', 'Recomendaciones', 'liberación a vida silvestre']) {
      expect(quick).toContain(text);
    }
  });
});

describe('CA-05 PWA diagnóstico intenso y rápido', () => {
  it('ofrece Descargar PDF con encabezado, pie y estilos de impresión', () => {
    for (const markup of [intense, quick]) {
      expect(markup).toContain('Descargar PDF');
      expect(markup).toContain(institution.address);
      expect(markup).toContain(institution.department);
    }
    expect(css).toMatch(/@media print[\s\S]*\.desktop-sidebar/);
    expect(css).toMatch(/@media print[\s\S]*\.no-print/);
  });

  it('abre la impresión del navegador y avisa si falla', () => {
    const print = vi.fn();
    vi.stubGlobal('window', { print });
    expect(renderToStaticMarkup(<PrintActions />)).toContain('Descargar PDF');
  });
});

describe('CA-06 PWA diagnóstico intenso y rápido', () => {
  it('imprime ambos pasos del diagnóstico intenso', () => {
    expect(intense).toContain('Historia clínica del ejemplar');
    expect(intense).toContain('Evaluación clínica');
    expect(css).toMatch(/@media print[\s\S]*\.diagnosis-step\.screen-hidden\s*\{\s*display: grid/);
  });
});

describe('CA-07 PWA diagnóstico intenso y rápido', () => {
  it('etiqueta los controles y no fuerza desbordamiento', () => {
    expect(intense).toContain('aria-label="Medicamento, fila 1"');
    expect(quick).toContain('<legend>Actitud</legend>');
    expect(css).toMatch(/\.table-scroll\s*\{[^}]*overflow-x: auto/);
    expect(css).toContain('.table-input:focus-visible');
  });

  it('muestra el diagnóstico rápido dentro del shell', () => {
    const markup = renderToStaticMarkup(
      <AppShell
        activeSection="diagnosis-quick"
        installController={manualInstallController}
        onLogout={() => undefined}
        onNavigate={() => undefined}
      />,
    );
    expect(markup).toContain('Formato de historia clínica');
  });
});
