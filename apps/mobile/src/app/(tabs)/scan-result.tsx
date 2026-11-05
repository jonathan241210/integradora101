import { useLocalSearchParams, useRouter } from 'expo-router';
import { goBackWithinTabs } from '../../navigation/tabBack';
import { peekScanResult } from '../../navigation/presentScanResult';
import { ScanResultScreen } from '../../screens/ScanResultScreen';
import { scanQueue } from '../../services/scanQueue';
import type { ScanPresentation } from '../../services/scanQueue';

function parseSpecies(value?: string): { id: string; name: string }[] | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as { id?: string; name?: string }[];
    if (!Array.isArray(parsed)) return undefined;
    return parsed.filter((item) => item.id && item.name).map((item) => ({ id: String(item.id), name: String(item.name) }));
  } catch {
    return undefined;
  }
}

export default function ScanResultRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    kind?: string;
    title?: string;
    message?: string;
    points?: string;
    species?: string;
    unlocked?: string;
    known?: string;
  }>();
  const fromRoute: ScanPresentation = {
    kind: (params.kind as ScanPresentation['kind']) ?? 'invalid_code',
    title: params.title ?? 'Resultado del escaneo',
    message: params.message ?? '',
    pointsAwarded: params.points ? Number(params.points) : undefined,
    newSpecies: params.species ? params.species.split('|').filter(Boolean) : undefined,
    unlockedSpecies: parseSpecies(params.unlocked),
    alreadyKnownSpecies: parseSpecies(params.known),
  };
  const result = params.kind ? fromRoute : (peekScanResult() ?? fromRoute);

  return (
    <ScanResultScreen
      result={result}
      onOpenSpecies={(id) => router.push({ pathname: '/animal/[id]', params: { id, from: 'scan-result' } })}
      onBackPress={() => goBackWithinTabs(router)}
      onRetryPress={() => {
        void scanQueue.retry();
      }}
    />
  );
}
