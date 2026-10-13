export const demoCredentials = {
  username: 'veterinario@demo.local',
  password: 'demo1234',
} as const;

export const pwaSections = [
  { id: 'home', label: 'Inicio', shortLabel: 'Inicio', symbol: '⌂' },
  { id: 'animals', label: 'Animales', shortLabel: 'Lista', symbol: '♧' },
  { id: 'animal-form', label: 'Registrar animal', shortLabel: 'Alta', symbol: '+' },
  { id: 'diagnosis-form', label: 'Registrar diagnóstico', shortLabel: 'Diagnóstico', symbol: '✚' },
  { id: 'review-form', label: 'Registrar revisión', shortLabel: 'Revisión', symbol: '◷' },
] as const;

export type PwaSection = (typeof pwaSections)[number]['id'];

export type PwaDemoState = {
  isLoggedIn: boolean;
  activeSection: PwaSection;
  loginError: string;
};

export type PwaDemoAction =
  | { type: 'login'; username: string; password: string }
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
    case 'login': {
      const usernameMatches =
        action.username.trim().toLocaleLowerCase() === demoCredentials.username;
      const passwordMatches = action.password === demoCredentials.password;

      if (!usernameMatches || !passwordMatches) {
        return {
          ...state,
          isLoggedIn: false,
          loginError: 'El usuario o la contraseña no son correctos.',
        };
      }

      return {
        isLoggedIn: true,
        activeSection: 'home',
        loginError: '',
      };
    }
    case 'navigate':
      return state.isLoggedIn
        ? { ...state, activeSection: action.section }
        : state;
    case 'logout':
      return initialPwaDemoState;
  }
}
