import { useState } from 'react';

export const institution = {
  name: 'Zoológico Municipal “Nicolás Bravo”',
  department: 'Departamento Médico Veterinario',
  title: 'Historia clínica de ejemplares',
  address:
    'Calle Pleasenton S/N, Colonia Lindavista, Tulancingo de Bravo Hidalgo. C.P. 43680',
} as const;

export const demoVeterinarian = {
  name: 'MVZ Francisco Javier Rojas Juárez',
  license: 'Cédula profesional 10008392',
} as const;

export const intenseSystems = [
  { name: 'general-condition', label: 'Condición física general' },
  { name: 'skin', label: 'Piel y faneras' },
  { name: 'digestive', label: 'Aparato digestivo' },
  { name: 'urogenital', label: 'Aparato urogenital' },
  { name: 'senses', label: 'Órganos de los sentidos' },
  { name: 'musculoskeletal', label: 'Músculo-esquelético' },
  { name: 'lymph-nodes', label: 'Nódulos linfáticos' },
  { name: 'cardiovascular', label: 'Sistema cardiovascular' },
  { name: 'nervous', label: 'Sistema nervioso' },
  { name: 'respiratory', label: 'Aparato respiratorio' },
  { name: 'endocrine', label: 'Endócrino' },
  { name: 'eyes', label: 'Ojos' },
] as const;

export const intenseVitals = [
  { name: 'temp', label: 'Temp.' },
  { name: 'fr', label: 'FR' },
  { name: 'fc', label: 'FC' },
  { name: 'tlc', label: 'TLC' },
  { name: 'cc', label: 'C.C.' },
] as const;

export const sampleTypes = [
  { name: 'blood', label: 'Sangre' },
  { name: 'urine', label: 'Orina' },
  { name: 'feces', label: 'Heces' },
  { name: 'fluids', label: 'Fluidos' },
  { name: 'skin-scraping', label: 'Raspado cutáneo' },
] as const;

export const physicalRestraints = [
  { name: 'net', label: 'Manejo con red' },
  { name: 'tamer', label: 'Manejo con domador' },
  { name: 'gloves', label: 'Manejo con guantes o trapo' },
  { name: 'tube', label: 'Manejo con tubo' },
  { name: 'snake-hook', label: 'Manejo con gancho herpetológico' },
  { name: 'tongs', label: 'Tong' },
] as const;

export const chemicalRestraintRows = 12;

export const quickGroups = [
  { name: 'attitude', label: 'Actitud', options: ['Tranquilo', 'Agresivo', 'Ansioso', 'Temeroso'] },
  { name: 'body-condition', label: 'Condición corporal', options: ['Bajo peso', 'Peso ideal', 'Sobrepeso'] },
  { name: 'eyes', label: 'Ojos', options: ['Aspecto normal', 'Cataratas', 'Lesiones', 'Infección'] },
  { name: 'ears', label: 'Orejas y conductos auditivos', options: ['Aspecto normal', 'Cerumen', 'Cuerpo extraño', 'Lesiones', 'Infección'] },
  { name: 'oral', label: 'Cavidad oral', options: ['Aspecto normal', 'Gingivitis', 'Úlceras/lesiones', 'Infección'] },
  { name: 'digestive', label: 'A. Digestivo', options: ['Normal', 'Dolor', 'Vómito', 'Diarrea', 'Movimientos ruminales'] },
  { name: 'skin', label: 'Piel/pelaje/plumaje', options: ['Aspecto normal', 'Hirsuto', 'Lesiones', 'Tumoraciones', 'Ectoparásitos'] },
  { name: 'cardiovascular', label: 'A. Cardiovascular', options: ['Frecuencia cardiaca normal', 'Bradicardia', 'Taquicardia'] },
  { name: 'respiratory', label: 'A. Respiratorio', options: ['Frecuencia respiratoria normal', 'Bradipnea', 'Taquipnea'] },
  { name: 'musculoskeletal', label: 'S. Músculo esquelético', options: ['Normal', 'Dolor', 'Inflamación', 'Claudicación'] },
  { name: 'urogenital', label: 'A. Urogenital', options: ['Normal', 'Úlceras/lesiones', 'Secreciones', 'Gestación'] },
] as const;

export type PrintController = {
  error: string;
  print: () => void;
};

export function usePrintDocument(): PrintController {
  const [error, setError] = useState('');

  const print = () => {
    try {
      if (typeof window.print !== 'function') {
        throw new Error('print unavailable');
      }
      setError('');
      window.print();
    } catch {
      setError(
        'No se pudo abrir la impresión del navegador. Los datos capturados se conservan; inténtalo de nuevo.',
      );
    }
  };

  return { error, print };
}
