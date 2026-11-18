import type { ApiError } from '@arca/api-client';
import { safeVisitorMessage } from '../repositories/safeMessage';
import { IMAGE_RULE, OFFLINE_TEXT, OPEN_TEXT, weeklyText } from './memoryCopy';

export type ShownMemoryError = {
  message: string;
  image?: string;
  opinion?: string;
  consent?: string;
  banner?: string;
  needsVerification: boolean;
};

function isApiError(error: unknown): error is ApiError {
  return error instanceof Error && error.name === 'ApiError' && 'status' in error;
}

function first(errors: ApiError['errors'], key: string): string | undefined {
  const value = errors?.[key]?.[0];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function nextSubmissionAt(error: ApiError): string | null {
  const data = error.data;
  if (typeof data === 'object' && data !== null && 'next_submission_at' in data) {
    const value = (data as { next_submission_at?: unknown }).next_submission_at;
    return typeof value === 'string' ? value : null;
  }
  return null;
}

export function presentMemoryError(error: unknown): ShownMemoryError {
  if (!isApiError(error) || error.status === 0) {
    return { message: OFFLINE_TEXT, banner: OFFLINE_TEXT, needsVerification: false };
  }

  if (error.status === 401 || (error.status === 403 && error.code === 'email_not_verified')) {
    const message = safeVisitorMessage(error.message, error.status) || 'Confirma tu correo para continuar.';
    return { message, banner: message, needsVerification: true };
  }

  if (error.status === 429 || error.code === 'weekly_limit_reached') {
    const at = nextSubmissionAt(error);
    const message = at ? weeklyText(at) : safeVisitorMessage(error.message, error.status);
    return { message, banner: message, needsVerification: false };
  }

  if (error.status === 422 && (error.errors?.open_request || error.code === 'open_request')) {
    return { message: OPEN_TEXT, banner: OPEN_TEXT, needsVerification: false };
  }

  if (error.status === 422) {
    return {
      message: safeVisitorMessage(error.message, error.status),
      image: first(error.errors, 'image'),
      opinion: first(error.errors, 'opinion'),
      consent: first(error.errors, 'consent'),
      needsVerification: false,
    };
  }

  if (error.status === 413 || error.status === 415) {
    return { message: IMAGE_RULE, image: IMAGE_RULE, needsVerification: false };
  }

  if (error.status === 404) {
    return { message: 'No encontramos esa petición.', banner: 'No encontramos esa petición.', needsVerification: false };
  }

  if (error.status === 403) {
    const message = safeVisitorMessage(error.message, error.status) || 'No tienes permiso para hacer esto.';
    return { message, banner: message, needsVerification: false };
  }

  const message = safeVisitorMessage(error.message, error.status);
  return { message, banner: message, needsVerification: false };
}
