import { createHttpAuthRepository } from '../repositories/httpAuthRepository';
import { authRepository } from '../repositories/mockAuthRepository';
import type { AccountResult, AuthRepository, AuthResult, RegisterInput, VisitorProfile } from '../repositories/authRepository';
import { clearSharedProgress } from '../repositories/sharedProgress';
import { createSecureTokenStorage, tokenStorage, type TokenStorage } from '../services/tokenStorage';
import { clearScanQueue } from '../services/scanQueue';

export type AccountSessionStatus = 'bootstrapping' | 'guest' | 'authenticated';

type Listener = () => void;

let status: AccountSessionStatus = 'bootstrapping';
const listeners = new Set<Listener>();
let refreshFlight: Promise<AuthResult> | null = null;
let repository: AuthRepository = authRepository;
let activeStorage: TokenStorage = tokenStorage;
let httpMode = false;
let cachedProfile: VisitorProfile | null = null;
let profileFlight: Promise<VisitorProfile | null> | null = null;
let profileGeneration = 0;

function emit() {
  listeners.forEach((listener) => listener());
}

function clearProfileCache() {
  profileGeneration += 1;
  cachedProfile = null;
  profileFlight = null;
}

function setStatus(next: AccountSessionStatus) {
  const previous = status;
  status = next;
  if (previous !== next && (next === 'guest' || next === 'authenticated')) {
    clearSharedProgress();
  }
  if (next === 'guest') clearProfileCache();
  emit();
}

function readProfile(force = false): Promise<VisitorProfile | null> {
  if (!force && cachedProfile) return Promise.resolve(cachedProfile);
  if (profileFlight) return profileFlight;

  const generation = profileGeneration;
  const flight = repository.getProfile().then(
    (profile) => {
      if (generation !== profileGeneration) return cachedProfile;
      if (profile) cachedProfile = profile;
      if (profileFlight === flight) profileFlight = null;
      return profile;
    },
    (error: unknown) => {
      if (profileFlight === flight) profileFlight = null;
      throw error;
    },
  );
  profileFlight = flight;
  return flight;
}

async function warmProfile() {
  try {
    await readProfile(true);
  } catch {
    // The session stays valid. Screens load the profile again when the cache is still empty.
  }
}

function useMock() {
  httpMode = false;
  repository = authRepository;
  activeStorage = tokenStorage;
  clearProfileCache();
}

function useHttp(apiUrl: string, fetchImpl?: typeof fetch) {
  httpMode = true;
  activeStorage = createSecureTokenStorage();
  repository = createHttpAuthRepository({
    baseUrl: apiUrl,
    storage: activeStorage,
    fetchImpl,
  });
  clearProfileCache();
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
    if (status === 'authenticated') return;
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
      const profile = await readProfile(false);
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
      await warmProfile();
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
      await warmProfile();
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
  peekProfile(): VisitorProfile | null {
    return cachedProfile;
  },
  getProfile(options?: { force?: boolean }) {
    return readProfile(options?.force ?? false);
  },
  async updateProfile(patch: { firstName: string; nickname: string; avatarCode: string }) {
    const result = await repository.updateProfile(patch);
    if (result.ok) {
      if (result.profile) {
        cachedProfile = result.profile;
      } else if (cachedProfile) {
        cachedProfile = {
          ...cachedProfile,
          firstName: patch.firstName.trim(),
          nickname: patch.nickname.trim(),
          avatarCode: patch.avatarCode,
        };
      }
      emit();
    }
    return result;
  },
  changePassword(currentPassword: string, password: string) {
    return repository.changePassword(currentPassword, password);
  },
  async deleteAccount(password: string) {
    const result = await repository.deleteAccount(password);
    if (result.ok) {
      await clearScanQueue();
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
    clearProfileCache();
    clearSharedProgress();
    await activeStorage.clear();
    useMock();
    authRepository.reset();
    await tokenStorage.clear();
  },
};
