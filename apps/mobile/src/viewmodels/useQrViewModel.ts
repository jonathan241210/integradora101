import { useCallback } from 'react';
import { QrRepository, QrRepositoryImpl } from '../repositories';
import { QrOutcome } from '../models';

const defaultRepository = new QrRepositoryImpl();

export function useQrViewModel(repository: QrRepository = defaultRepository) {
  const simulateScan = useCallback(
    (outcome: QrOutcome) => repository.simulateScan(outcome),
    [repository]
  );
  return { simulateScan };
}
