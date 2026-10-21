import type { AuthTokens } from '../services/tokenStorage';

export interface AuthSuccess {
  ok: true;
  tokens: AuthTokens;
}

export interface AuthFailure {
  ok: false;
  status: 0 | 401 | 403 | 422 | 429;
  code?: 'email_not_verified';
  message: string;
  retryAfterSeconds?: number;
}

export type AuthResult = AuthSuccess | AuthFailure;

export interface AccountAccepted {
  ok: true;
  status: 200 | 201 | 202 | 204;
  message: string;
  tokens?: AuthTokens;
}

export type AccountResult = AccountAccepted | AuthFailure;

export interface VisitorProfile {
  email: string;
  firstName: string;
  nickname: string;
  avatarCode: string;
}

export interface PrivacyNotice {
  version: string;
  content: string;
}

export interface RegisterInput {
  email: string;
  firstName: string;
  nickname: string;
  password: string;
  avatarCode: string;
  isAdult: boolean;
  privacyNoticeVersion: string;
}

export interface AuthRepository {
  login(email: string, password: string): Promise<AuthResult>;
  logout(): Promise<void>;
  refresh(): Promise<AuthResult>;
  getPrivacyNotice(): Promise<PrivacyNotice>;
  register(input: RegisterInput): Promise<AccountResult>;
  verifyEmail(email: string, code: string): Promise<AccountResult>;
  resendVerification(email: string): Promise<AccountResult>;
  forgotPassword(email: string): Promise<AccountResult>;
  resetPassword(email: string, code: string, password: string): Promise<AccountResult>;
  getProfile(): Promise<VisitorProfile | null>;
  updateProfile(patch: Pick<VisitorProfile, 'firstName' | 'nickname' | 'avatarCode'>): Promise<AccountResult>;
  changePassword(currentPassword: string, password: string): Promise<AccountResult>;
  deleteAccount(password: string): Promise<AccountResult>;
}
