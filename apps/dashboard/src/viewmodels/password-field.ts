/**
 * Estado local del campo «nueva contraseña» de una acción en línea
 * (dashboard-004 CA-10, RN-04). Vive en el componente, nunca en el ViewModel
 * de la sección: se entrega una vez y se descarta.
 */
export type PasswordFieldState = { value: string; visible: boolean };

export const emptyPasswordField: PasswordFieldState = { value: "", visible: false };

export function typePassword(state: PasswordFieldState, value: string): PasswordFieldState {
  return { ...state, value };
}

export function togglePasswordVisibility(state: PasswordFieldState): PasswordFieldState {
  return { ...state, visible: !state.visible };
}

/** Vacía la contraseña y vuelve a ocultarla. */
export function discardPassword(): PasswordFieldState {
  return emptyPasswordField;
}

/**
 * Intento de envío: con una petición en curso o sin valor no se envía; si se
 * envía, el campo queda vacío y oculto y `sent` trae la contraseña.
 */
export function submitPassword(
  state: PasswordFieldState,
  busy: boolean,
): { state: PasswordFieldState; sent: string | null } {
  if (busy || !state.value) return { state, sent: null };

  return { state: discardPassword(), sent: state.value };
}
