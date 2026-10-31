import { createVisitorApi, type ApiError } from '@arca/api-client';
import type { AuthTokens, TokenStorage } from '../services/tokenStorage';
import type {
  AccountResult,
  AuthFailure,
  AuthRepository,
  AuthResult,
  PrivacyNotice,
  RegisterInput,
  VisitorProfile,
} from './authRepository';

const DEVICE_NAME = 'arca-mobile';
const OFFLINE_MESSAGE = 'Sin conexión';

export interface HttpAuthRepositoryOptions {
  baseUrl: string;
  storage: TokenStorage;
  fetchImpl?: typeof fetch;
}

function isApiError(error: unknown): error is ApiError {
  return error instanceof Error && error.name === 'ApiError' && 'status' in error;
}

function failure(error: unknown): AuthFailure {
  if (!isApiError(error) || error.status === 0) {
    return { ok: false, status: 0, message: OFFLINE_MESSAGE };
  }
  const status = error.status === 401 || error.status === 403 || error.status === 422 || error.status === 429
    ? error.status
    : 422;
  return {
    ok: false,
    status,
    message: error.message,
    code: error.code === 'email_not_verified' ? 'email_not_verified' : undefined,
    retryAfterSeconds: error.retryAfterSeconds,
  };
}

function tokensFrom(accessToken: string, refreshToken: string): AuthTokens {
  return { accessToken, refreshToken };
}

function profileFrom(dto: { email: string; first_name: string; nickname: string; avatar_code: string }): VisitorProfile {
  return {
    email: dto.email,
    firstName: dto.first_name,
    nickname: dto.nickname,
    avatarCode: dto.avatar_code,
  };
}

function accepted(status: 200 | 201 | 202 | 204, message: string, tokens?: AuthTokens): AccountResult {
  return { ok: true, status, message, tokens };
}

export function createHttpAuthRepository({ baseUrl, storage, fetchImpl }: HttpAuthRepositoryOptions): AuthRepository {
  const api = createVisitorApi({
    baseUrl,
    fetchImpl,
    getAccessToken: async () => (await storage.read())?.accessToken ?? null,
    getRefreshToken: async () => (await storage.read())?.refreshToken ?? null,
    onTokens: async (next) => {
      await storage.write(tokensFrom(next.accessToken, next.refreshToken));
    },
    onSessionExpired: async () => {
      await storage.clear();
    },
  });

  return {
    async login(email, password) {
      try {
        const payload = await api.login(email, password, DEVICE_NAME);
        const tokens = tokensFrom(payload.access_token, payload.refresh_token);
        await storage.write(tokens);
        return { ok: true, tokens };
      } catch (error) {
        return failure(error);
      }
    },
    async logout() {
      const current = await storage.read();
      try {
        if (current) await api.logout(current.refreshToken);
      } catch {
        // The device still drops the pair. The server revokes the family on the next reuse.
      } finally {
        await storage.clear();
      }
    },
    async refresh(): Promise<AuthResult> {
      try {
        const payload = await api.refresh();
        const tokens = tokensFrom(payload.access_token, payload.refresh_token);
        await storage.write(tokens);
        return { ok: true, tokens };
      } catch (error) {
        await storage.clear();
        return failure(error);
      }
    },
    async getPrivacyNotice(): Promise<PrivacyNotice> {
      const notice = await api.privacyNotice();
      return { version: notice.version, content: notice.content };
    },
    async register(input: RegisterInput): Promise<AccountResult> {
      try {
        const result = await api.register({
          email: input.email,
          password: input.password,
          password_confirmation: input.password,
          first_name: input.firstName,
          nickname: input.nickname,
          avatar_code: input.avatarCode,
          is_adult: input.isAdult,
          privacy_notice_version: input.privacyNoticeVersion,
        });
        return accepted(201, result.message);
      } catch (error) {
        return failure(error);
      }
    },
    async verifyEmail(email, code) {
      try {
        const payload = await api.verifyEmail(email, code);
        const tokens = tokensFrom(payload.access_token, payload.refresh_token);
        await storage.write(tokens);
        return accepted(200, 'Correo verificado.', tokens);
      } catch (error) {
        return failure(error);
      }
    },
    async resendVerification(email) {
      try {
        const result = await api.resendVerification(email);
        return accepted(202, result.message);
      } catch (error) {
        return failure(error);
      }
    },
    async forgotPassword(email) {
      try {
        const result = await api.forgotPassword(email);
        return accepted(202, result.message);
      } catch (error) {
        return failure(error);
      }
    },
    async resetPassword(email, code, password) {
      try {
        const result = await api.resetPassword(email, code, password);
        return accepted(200, result.message);
      } catch (error) {
        return failure(error);
      }
    },
    async getProfile() {
      try {
        return profileFrom(await api.me());
      } catch (error) {
        if (isApiError(error) && error.status === 401) return null;
        throw error;
      }
    },
    async updateProfile(patch) {
      try {
        const profile = profileFrom(await api.updateProfile({
          first_name: patch.firstName,
          nickname: patch.nickname,
          avatar_code: patch.avatarCode,
        }));
        return { ok: true, status: 200, message: 'Perfil actualizado.', profile };
      } catch (error) {
        return failure(error);
      }
    },
    async changePassword(currentPassword, password) {
      try {
        const result = await api.changePassword(currentPassword, password);
        return accepted(200, result.message);
      } catch (error) {
        return failure(error);
      }
    },
    async deleteAccount(password) {
      try {
        await api.deleteAccount(password);
        await storage.clear();
        return accepted(204, 'Cuenta eliminada.');
      } catch (error) {
        return failure(error);
      }
    },
  };
}
