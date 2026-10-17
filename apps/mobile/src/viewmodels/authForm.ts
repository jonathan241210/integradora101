import { AccessGate } from '../repositories/visitorAccessRepository';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  confirmation: string;
}

export interface ResetPasswordInput {
  code: string;
  password: string;
  confirmation: string;
}

export function validateLogin(email: string, password: string): string | null {
  if (!email.trim() || !password) return 'Escribe tu correo y tu contraseña.';
  if (!EMAIL_PATTERN.test(email.trim())) return 'Escribe un correo válido.';
  return null;
}

export function validateRegister(input: RegisterInput): string | null {
  if (!input.username.trim() || !input.email.trim() || !input.password || !input.confirmation) {
    return 'Completa nombre de usuario, correo, contraseña y confirmación.';
  }
  if (!EMAIL_PATTERN.test(input.email.trim())) return 'Escribe un correo válido.';
  if (input.password !== input.confirmation) return 'La confirmación no coincide con la contraseña.';
  return null;
}

export function validateForgotPassword(email: string): string | null {
  if (!email.trim()) return 'Escribe tu correo.';
  if (!EMAIL_PATTERN.test(email.trim())) return 'Escribe un correo válido.';
  return null;
}

export function validateResetPassword(input: ResetPasswordInput): string | null {
  if (!/^\d{6}$/.test(input.code.trim())) return 'Escribe el código de 6 dígitos.';
  if (!input.password || !input.confirmation) return 'Escribe y confirma la nueva contraseña.';
  if (input.password !== input.confirmation) return 'La confirmación no coincide con la contraseña.';
  return null;
}

export function nextGateRoute(status: AccessGate, inAuthGroup: boolean): '/login' | '/' | null {
  if (status === 'signedOut' && !inAuthGroup) return '/login';
  if (status === 'entered' && inAuthGroup) return '/';
  return null;
}
