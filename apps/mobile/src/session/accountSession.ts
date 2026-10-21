import { createHttpAuthRepository } from '../repositories/httpAuthRepository';
import { authRepository } from '../repositories/mockAuthRepository';
import type { AccountResult, AuthRepository, AuthResult, RegisterInput } from '../repositories/authRepository';
import { createSecureTokenStorage, tokenStorage, type TokenStorage } from '../services/tokenStorage';

export type AccountSessionStatus = 'bootstrapping' | 'guest' | 'authenticated';

type Listener = () => void;

let status: AccountSessionStatus = 'bootstrapping';
const listeners = new Set<Listener>();
let refreshFlight: Promise<AuthResult> | null = null;
let repository: AuthRepository = authRepository;
let activeStorage: TokenStorage = tokenStorage;
let httpMode = false;

function emit() {
  listeners.forEach((listener) => listener());
}

function setStatus(next: AccountSessionStatus) {
  status = next;
  emit();
}

function useMock() {
  httpMode = false;
  repository = authRepository;
  activeStorage = tokenStorage;
}

function useHttp(apiUrl: string, fetchImpl?: typeof fetch) {
  httpMode = true;
  activeStorage = createSecureTokenStorage();
  repository = createHttpAuthRepository({
    baseUrl: apiUrl,
    storage: activeStorage,
    fetchImpl,
  });
}

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim() ?? '';
if (configuredApiUrl && process.env.JEST_WORKER_ID === undefined) {
  useHttp(configuredApiUrl);
}

export const accountSession = {
  getStatus(): AccountSessionStatus {
    return status;
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  configureForTests(options: { apiUrl?: string; fetchImpl?: typeof fetch }) {
    const apiUrl = options.apiUrl?.trim() ?? '';
    if (!apiUrl) {
      useMock();
      return;
    }
    useHttp(apiUrl, options.fetchImpl);
  },
  async bootstrap() {
    const tokens = await activeStorage.read();
    if (!tokens) {
      setStatus('guest');
      return;
    }
    if (!httpMode) {
      setStatus('authenticated');
      return;
    }
    try {
      const profile = await repository.getProfile();
      if (!profile) {
        await activeStorage.clear();
        setStatus('guest');
        return;
      }
      setStatus('authenticated');
    } catch {
      setStatus('guest');
    }
  },
  async login(email: string, password: string): Promise<AuthResult> {
    const result = await repository.login(email, password);
    if (result.ok) {
      await activeStorage.write(result.tokens);
      setStatus('authenticated');
    }
    return result;
  },
  async logout() {
    await repository.logout();
    await activeStorage.clear();
    setStatus('guest');
  },
  register(input: RegisterInput): Promise<AccountResult> {
    return repository.register(input);
  },
  async verifyEmail(email: string, code: string): Promise<AccountResult> {
    const result = await repository.verifyEmail(email, code);
    if (result.ok && result.tokens) {
      await activeStorage.write(result.tokens);
      setStatus('authenticated');
    }
    return result;
  },
  resendVerification(email: string): Promise<AccountResult> {
    return repository.resendVerification(email);
  },
  forgotPassword(email: string): Promise<AccountResult> {
    return repository.forgotPassword(email);
  },
  resetPassword(email: string, code: string, password: string): Promise<AccountResult> {
    return repository.resetPassword(email, code, password);
  },
  getPrivacyNotice() {
    return repository.getPrivacyNotice();
  },
  getProfile() {
    return repository.getProfile();
  },
  async updateProfile(patch: { firstName: string; nickname: string; avatarCode: string }) {
    const result = await repository.updateProfile(patch);
    if (result.ok) emit();
    return result;
  },
  changePassword(currentPassword: string, password: string) {
    return repository.changePassword(currentPassword, password);
  },
  async deleteAccount(password: string) {
    const result = await repository.deleteAccount(password);
    if (result.ok) {
      await activeStorage.clear();
      setStatus('guest');
    }
    return result;
  },
  refresh(): Promise<AuthResult> {
    if (!refreshFlight) {
      refreshFlight = repository.refresh().then(async (result) => {
        if (!result.ok) {
          await activeStorage.clear();
          setStatus('guest');
          return result;
        }
        await activeStorage.write(result.tokens);
        setStatus('authenticated');
        return result;
      }).finally(() => {
        refreshFlight = null;
      });
    }
    return refreshFlight;
  },
  async resetForTests() {
    status = 'bootstrapping';
    refreshFlight = null;
    listeners.clear();
    await activeStorage.clear();
    useMock();
    authRepository.reset();
    await tokenStorage.clear();
  },
};
