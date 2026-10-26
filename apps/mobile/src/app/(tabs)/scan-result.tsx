import { useLocalSearchParams, useRouter } from 'expo-router';
import { goBackWithinTabs } from '../../navigation/tabBack';
import { ScanResultScreen } from '../../screens/ScanResultScreen';
import { scanQueue } from '../../services/scanQueue';
import type { ScanPresentation } from '../../services/scanQueue';

export default function ScanResultRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    kind?: string;
    title?: string;
    message?: string;
    points?: string;
    species?: string;
  }>();
  const result: ScanPresentation = {
    kind: (params.kind as ScanPresentation['kind']) ?? 'invalid_code',
    title: params.title ?? 'Resultado del escaneo',
    message: params.message ?? '',
    pointsAwarded: params.points ? Number(params.points) : undefined,
    newSpecies: params.species ? params.species.split('|') : undefined,
  };

  return (
    <ScanResultScreen
      result={result}
      onBackPress={() => goBackWithinTabs(router)}
      onRetryPress={() => {
        void scanQueue.retry();
      }}
    />
  );
}
