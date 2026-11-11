import type { useRouter } from 'expo-router';

type Router = ReturnType<typeof useRouter>;
import type { ScanPresentation } from '../services/scanQueue';

let remembered: ScanPresentation | null = null;

export function rememberScanResult(presentation: ScanPresentation) {
  remembered = presentation;
}

export function peekScanResult(): ScanPresentation | null {
  return remembered;
}

export function forgetScanResult() {
  remembered = null;
}

export function scanResultParams(presentation: ScanPresentation) {
  return {
    kind: presentation.kind,
    title: presentation.title,
    message: presentation.message,
    points: presentation.pointsAwarded !== undefined ? String(presentation.pointsAwarded) : '',
    species: presentation.newSpecies?.join('|') ?? '',
    unlocked: JSON.stringify(presentation.unlockedSpecies ?? []),
    known: JSON.stringify(presentation.alreadyKnownSpecies ?? []),
  };
}

export function presentScanResult(router: Router, presentation: ScanPresentation) {
  rememberScanResult(presentation);
  router.push({
    pathname: '/scan-result',
    params: scanResultParams(presentation),
  });
}
