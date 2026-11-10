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
const INVALID_CODE = 'El código no es válido.';
const PRIVACY_VERSION = '2026-10';
const FORGOT_NOTICE = 'Si el correo está registrado, enviamos un código de 6 dígitos.';

interface StoredVisitor {
  email: string;
  firstName: string;
  nickname: string;
  password: string;
  avatarCode: string;
  verified: boolean;
  privacyNoticeVersion: string;
  verificationCode: string | null;
  recoveryCode: string | null;
  registrationNotice?: boolean;
}

interface AuthFixture {
  email: string;
  firstName: string;
  nickname: string;
  password: string;
  avatarCode: string;
  verified: boolean;
}

let testFixtures: AuthFixture[] = [];

function newCode(): string {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
}

function visitorFromFixture(fixture: AuthFixture): StoredVisitor {
  return {
    ...fixture,
    privacyNoticeVersion: PRIVACY_VERSION,
    verificationCode: newCode(),
    recoveryCode: null,
  };
}

export function installAuthFixturesForTests(accounts: AuthFixture[]) {
  testFixtures = accounts;
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

function freshVisitors(): Map<string, StoredVisitor> {
  return new Map(testFixtures.map((fixture) => [fixture.email, visitorFromFixture(fixture)]));
}

export function createMockAuthRepository(): AuthRepository & {
  refreshAttempts: number;
  offline: boolean;
  failRefresh: boolean;
  limitResend: boolean;
  limitLogin: boolean;
  reset(): void;
  issuedCode(email: string, purpose?: 'verification' | 'recovery'): string | null;
} {
  let visitors = freshVisitors();
  let currentEmail: string | null = null;
  let refreshFlight: Promise<AuthResult> | null = null;

  const repository = {
    refreshAttempts: 0,
    offline: false,
    failRefresh: false,
    limitResend: false,
    limitLogin: false,
    reset() {
      visitors = freshVisitors();
      currentEmail = null;
      refreshFlight = null;
      repository.refreshAttempts = 0;
      repository.offline = false;
      repository.failRefresh = false;
      repository.limitResend = false;
      repository.limitLogin = false;
    },
    issuedCode(email: string, purpose: 'verification' | 'recovery' = 'verification') {
      const account = visitors.get(email.trim().toLowerCase());
      if (!account) return null;
      return purpose === 'recovery' ? account.recoveryCode : account.verificationCode;
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
      if (repository.limitLogin) {
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
      const existing = visitors.get(email);
      if (existing) {
        existing.registrationNotice = true;
        existing.verificationCode = newCode();
        return accepted(201, 'Te enviamos un código de 6 dígitos para verificar tu correo.');
      }
      visitors.set(email, {
        email,
        firstName: input.firstName.trim(),
        nickname: input.nickname.trim(),
        password: input.password,
        avatarCode: input.avatarCode,
        verified: false,
        privacyNoticeVersion: input.privacyNoticeVersion,
        verificationCode: newCode(),
        recoveryCode: null,
      });
      return accepted(201, 'Cuenta creada. Revisa el código de verificación.');
    },
    async verifyEmail(email: string, code: string): Promise<AccountResult> {
      if (repository.offline) return { ok: false, status: 0, message: OFFLINE_MESSAGE };
      const account = visitors.get(email.trim().toLowerCase());
      if (!account || account.verificationCode === null || code.trim() !== account.verificationCode) {
        return { ok: false, status: 422, message: INVALID_CODE };
      }
      account.verificationCode = null;
      if (account.registrationNotice) {
        account.registrationNotice = false;
        return {
          ok: true,
          status: 200,
          message: 'Ese correo ya está registrado.',
          code: 'email_already_registered',
        };
      }
      account.verified = true;
      currentEmail = account.email;
      const tokens = success(account.email);
      return accepted(200, 'Correo verificado.', tokens.ok ? tokens : undefined);
    },
    async resendVerification(email: string): Promise<AccountResult> {
      if (repository.offline) return { ok: false, status: 0, message: OFFLINE_MESSAGE };
      if (repository.limitResend) {
        return { ok: false, status: 429, message: 'Espera 30 segundos e inténtalo de nuevo.', retryAfterSeconds: 30 };
      }
      const account = visitors.get(email.trim().toLowerCase());
      if (account) account.verificationCode = newCode();
      return accepted(202, 'Si la cuenta existe, reenviamos el código.');
    },
    async forgotPassword(email: string): Promise<AccountResult> {
      if (repository.offline) return { ok: false, status: 0, message: OFFLINE_MESSAGE };
      const account = visitors.get(email.trim().toLowerCase());
      if (account) account.recoveryCode = newCode();
      return accepted(202, FORGOT_NOTICE);
    },
    async resetPassword(email: string, code: string, password: string): Promise<AccountResult> {
      if (repository.offline) return { ok: false, status: 0, message: OFFLINE_MESSAGE };
      const account = visitors.get(email.trim().toLowerCase());
      if (!account || account.recoveryCode === null || code.trim() !== account.recoveryCode) {
        return { ok: false, status: 422, message: INVALID_CODE };
      }
      account.recoveryCode = null;
      account.password = password;
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
      const profile = {
        email: account.email,
        firstName: account.firstName,
        nickname: account.nickname,
        avatarCode: account.avatarCode,
      };
      return { ok: true, status: 200, message: 'Perfil actualizado.', profile };
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
