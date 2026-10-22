import { isAvatarCode } from '../constants/avatarCatalog';
import type {
  AccountResult,
  AuthRepository,
  AuthResult,
  RegisterInput,
  VisitorProfile,
} from './authRepository';

const INVALID_CREDENTIALS = 'Correo o contraseña incorrectos.';
const OFFLINE_MESSAGE = 'Sin conexión';
const VERIFIED_PASSWORD = 'secreta';
const VALID_CODE = '123456';
const PRIVACY_VERSION = '2026-10';
const FORGOT_NOTICE = 'Si el correo está registrado, enviamos un código de 6 dígitos. En esta versión el código de prueba es 123456.';

interface StoredVisitor {
  email: string;
  firstName: string;
  nickname: string;
  password: string;
  avatarCode: string;
  verified: boolean;
  privacyNoticeVersion: string;
}

function success(suffix: string): AuthResult {
  return {
    ok: true,
    tokens: {
      accessToken: `access-${suffix}`,
      refreshToken: `refresh-${suffix}`,
    },
  };
}

function accepted(status: 200 | 201 | 202 | 204, message: string, tokens?: AuthResult & { ok: true }): AccountResult {
  return { ok: true, status, message, tokens: tokens && tokens.ok ? tokens.tokens : undefined };
}

function seedVisitors(): Map<string, StoredVisitor> {
  return new Map([
    ['correo@ejemplo.com', { email: 'correo@ejemplo.com', firstName: 'Ana', nickname: 'Anita', password: VERIFIED_PASSWORD, avatarCode: 'jaguar', verified: true, privacyNoticeVersion: PRIVACY_VERSION }],
    ['maria@correo.com', { email: 'maria@correo.com', firstName: 'María', nickname: 'María', password: VERIFIED_PASSWORD, avatarCode: 'macaw', verified: true, privacyNoticeVersion: PRIVACY_VERSION }],
    ['sin-verificar@ejemplo.com', { email: 'sin-verificar@ejemplo.com', firstName: 'Luis', nickname: 'Luis', password: VERIFIED_PASSWORD, avatarCode: 'wolf', verified: false, privacyNoticeVersion: PRIVACY_VERSION }],
    ['limitado@ejemplo.com', { email: 'limitado@ejemplo.com', firstName: 'Leo', nickname: 'Leo', password: VERIFIED_PASSWORD, avatarCode: 'lion', verified: true, privacyNoticeVersion: PRIVACY_VERSION }],
  ]);
}

export function createMockAuthRepository(): AuthRepository & {
  refreshAttempts: number;
  offline: boolean;
  failRefresh: boolean;
  limitResend: boolean;
  reset(): void;
} {
  let visitors = seedVisitors();
  let currentEmail: string | null = null;
  let refreshFlight: Promise<AuthResult> | null = null;

  const repository = {
    refreshAttempts: 0,
    offline: false,
    failRefresh: false,
    limitResend: false,
    reset() {
      visitors = seedVisitors();
      currentEmail = null;
      refreshFlight = null;
      repository.refreshAttempts = 0;
      repository.offline = false;
      repository.failRefresh = false;
      repository.limitResend = false;
    },
    async getPrivacyNotice() {
      return {
        version: PRIVACY_VERSION,
        content: 'Aviso de privacidad de demostración. El zoológico entregará el texto definitivo. Al registrarte aceptas esta versión.',
      };
    },
    async login(email: string, password: string): Promise<AuthResult> {
      if (repository.offline) return { ok: false, status: 0, message: OFFLINE_MESSAGE };
      const normalized = email.trim().toLowerCase();
      if (normalized === 'limitado@ejemplo.com' && password === VERIFIED_PASSWORD) {
        return { ok: false, status: 429, message: 'Espera 30 segundos e inténtalo de nuevo.', retryAfterSeconds: 30 };
      }
      const account = visitors.get(normalized);
      if (!account || account.password !== password) {
        return { ok: false, status: 422, message: INVALID_CREDENTIALS };
      }
      if (!account.verified) {
        return { ok: false, status: 403, code: 'email_not_verified', message: 'Confirma tu correo para entrar.' };
      }
      currentEmail = account.email;
      return success(account.email);
    },
    async logout() {
      currentEmail = null;
    },
    refresh(): Promise<AuthResult> {
      if (!refreshFlight) {
        repository.refreshAttempts += 1;
        const attempt = repository.refreshAttempts;
        refreshFlight = Promise.resolve().then(() => {
          if (repository.offline) return { ok: false, status: 0, message: OFFLINE_MESSAGE } as AuthResult;
          if (repository.failRefresh) {
            repository.failRefresh = false;
            return { ok: false, status: 401, message: 'Tu sesión ha caducado.' } as AuthResult;
          }
          return success(`refreshed-${attempt}`);
        }).finally(() => {
          refreshFlight = null;
        });
      }
      return refreshFlight;
    },
    async register(input: RegisterInput): Promise<AccountResult> {
      if (repository.offline) return { ok: false, status: 0, message: OFFLINE_MESSAGE };
      if (!input.isAdult) return { ok: false, status: 422, message: 'Confirma que eres mayor de 18 años.' };
      if (!input.privacyNoticeVersion) return { ok: false, status: 422, message: 'Acepta el aviso de privacidad.' };
      if (!isAvatarCode(input.avatarCode)) return { ok: false, status: 422, message: 'Elige un avatar del catálogo.' };
      const email = input.email.trim().toLowerCase();
      if (visitors.has(email)) return { ok: false, status: 422, message: 'Ese correo ya está registrado.' };
      visitors.set(email, {
        email,
        firstName: input.firstName.trim(),
        nickname: input.nickname.trim(),
        password: input.password,
        avatarCode: input.avatarCode,
        verified: false,
        privacyNoticeVersion: input.privacyNoticeVersion,
      });
      return accepted(201, 'Cuenta creada. Revisa el código de verificación.');
    },
    async verifyEmail(email: string, code: string): Promise<AccountResult> {
      if (repository.offline) return { ok: false, status: 0, message: OFFLINE_MESSAGE };
      const account = visitors.get(email.trim().toLowerCase());
      if (!account || code.trim() !== VALID_CODE) {
        return { ok: false, status: 422, message: 'El código no es válido.' };
      }
      account.verified = true;
      currentEmail = account.email;
      const tokens = success(account.email);
      return accepted(200, 'Correo verificado.', tokens.ok ? tokens : undefined);
    },
    async resendVerification(): Promise<AccountResult> {
      if (repository.offline) return { ok: false, status: 0, message: OFFLINE_MESSAGE };
      if (repository.limitResend) {
        return { ok: false, status: 429, message: 'Espera 30 segundos e inténtalo de nuevo.', retryAfterSeconds: 30 };
      }
      return accepted(202, 'Si la cuenta existe, reenviamos el código.');
    },
    async forgotPassword(): Promise<AccountResult> {
      if (repository.offline) return { ok: false, status: 0, message: OFFLINE_MESSAGE };
      return accepted(202, FORGOT_NOTICE);
    },
    async resetPassword(email: string, code: string, password: string): Promise<AccountResult> {
      if (repository.offline) return { ok: false, status: 0, message: OFFLINE_MESSAGE };
      if (code.trim() !== VALID_CODE) return { ok: false, status: 422, message: 'El código no es válido.' };
      const account = visitors.get(email.trim().toLowerCase());
      if (account) account.password = password;
      return accepted(200, 'Contraseña actualizada. Entra de nuevo.');
    },
    async getProfile(): Promise<VisitorProfile | null> {
      if (!currentEmail) return null;
      const account = visitors.get(currentEmail);
      if (!account) return null;
      return { email: account.email, firstName: account.firstName, nickname: account.nickname, avatarCode: account.avatarCode };
    },
    async updateProfile(patch: Pick<VisitorProfile, 'firstName' | 'nickname' | 'avatarCode'>): Promise<AccountResult> {
      if (!currentEmail) return { ok: false, status: 401, message: 'Tu sesión ha caducado.' };
      if (!isAvatarCode(patch.avatarCode)) return { ok: false, status: 422, message: 'Elige un avatar del catálogo.' };
      const account = visitors.get(currentEmail);
      if (!account) return { ok: false, status: 401, message: 'Tu sesión ha caducado.' };
      account.firstName = patch.firstName.trim();
      account.nickname = patch.nickname.trim();
      account.avatarCode = patch.avatarCode;
      return accepted(200, 'Perfil actualizado.');
    },
    async changePassword(currentPassword: string, password: string): Promise<AccountResult> {
      if (!currentEmail) return { ok: false, status: 401, message: 'Tu sesión ha caducado.' };
      const account = visitors.get(currentEmail);
      if (!account || account.password !== currentPassword) {
        return { ok: false, status: 422, message: 'La contraseña actual no coincide.' };
      }
      account.password = password;
      return accepted(200, 'Contraseña actualizada.');
    },
    async deleteAccount(password: string): Promise<AccountResult> {
      if (!currentEmail) return { ok: false, status: 401, message: 'Tu sesión ha caducado.' };
      const account = visitors.get(currentEmail);
      if (!account || account.password !== password) {
        return { ok: false, status: 422, message: 'La contraseña no coincide.' };
      }
      visitors.delete(currentEmail);
      currentEmail = null;
      return accepted(204, 'Cuenta eliminada.');
    },
  };

  return repository;
}

export const authRepository = createMockAuthRepository();
