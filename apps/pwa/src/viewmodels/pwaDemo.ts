export const pwaSections = [
  { id: 'home', label: 'Inicio', shortLabel: 'Inicio', symbol: '⌂' },
  { id: 'animals', label: 'Animales', shortLabel: 'Lista', symbol: '♧' },
  { id: 'animal-form', label: 'Registrar animal', shortLabel: 'Alta', symbol: '+' },
  { id: 'diagnosis-form', label: 'Registrar diagnóstico', shortLabel: 'Diagnóstico', symbol: '✚' },
  { id: 'review-form', label: 'Registrar revisión', shortLabel: 'Revisión', symbol: '◷' },
] as const;

export const diagnosisModeSections = [
  { id: 'diagnosis-intense', label: 'Diagnóstico intenso' },
  { id: 'diagnosis-quick', label: 'Diagnóstico rápido' },
] as const;

export const detailSections = [
  { id: 'animal-profile', label: 'Perfil del animal' },
] as const;

export type PwaSection =
  | (typeof pwaSections)[number]['id']
  | (typeof diagnosisModeSections)[number]['id']
  | (typeof detailSections)[number]['id'];

export function getSectionLabel(section: PwaSection): string {
  return (
    [...pwaSections, ...diagnosisModeSections, ...detailSections].find(
      (item) => item.id === section,
    )?.label ?? ''
  );
}

export function isNavigationActive(
  navigationId: PwaSection,
  activeSection: PwaSection,
): boolean {
  return (
    navigationId === activeSection ||
    (navigationId === 'diagnosis-form' && activeSection.startsWith('diagnosis-')) ||
    (navigationId === 'animals' && activeSection === 'animal-profile')
  );
}

export type PwaDemoState = {
  isLoggedIn: boolean;
  activeSection: PwaSection;
  loginError: string;
};

export type PwaDemoAction =
  | { type: 'authenticated' }
  | { type: 'navigate'; section: PwaSection }
  | { type: 'logout' };

export const initialPwaDemoState: PwaDemoState = {
  isLoggedIn: false,
  activeSection: 'home',
  loginError: '',
};

export function pwaDemoReducer(
  state: PwaDemoState,
  action: PwaDemoAction,
): PwaDemoState {
  switch (action.type) {
    case 'authenticated':
      return { isLoggedIn: true, activeSection: 'home', loginError: '' };
    case 'navigate':
      return state.isLoggedIn
        ? { ...state, activeSection: action.section }
        : state;
    case 'logout':
      return initialPwaDemoState;
  }
}
