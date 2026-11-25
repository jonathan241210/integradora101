import {
  createAnimal,
  createAnimalWithPhoto,
  createEvaluation,
  updateAnimalStatus,
  uploadAnimalPhoto,
} from '@/services/apiClient';

export type { AnimalEvaluation, AnimalProfile, EvaluationKind, NewAnimal, UpdateAnimalStatusInput } from '@/services/apiClient';

/**
 * ViewModel de escritura de ejemplares y evaluaciones (pwa-012 CA-08).
 * Las vistas llaman a estas acciones en lugar de importar el servicio HTTP.
 */
const actions = { createAnimal, createAnimalWithPhoto, createEvaluation, updateAnimalStatus, uploadAnimalPhoto };

export function useAnimalActions() {
  return actions;
}
