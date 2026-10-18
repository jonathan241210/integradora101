import type { HttpClient } from "./http";
import type {
  LoginResult,
  StaffProfile,
  TwoFactorChallenge,
  TwoFactorQrCode,
} from "./types";

type StaffProfileResponse = StaffProfile | { data: StaffProfile };

export function createAuthApi(http: HttpClient) {
  return {
    async login(credentials: {
      email: string;
      password: string;
    }): Promise<LoginResult> {
      const result = await http.post<{ two_factor?: boolean }>(
        "/api/v1/auth/login",
        credentials,
      );

      return { twoFactor: result.two_factor === true };
    },

    twoFactorChallenge(challenge: TwoFactorChallenge): Promise<void> {
      return http.post<void>("/api/v1/auth/two-factor-challenge", challenge);
    },

    async me(): Promise<StaffProfile> {
      const response = await http.get<StaffProfileResponse>(
        "/api/v1/auth/me",
      );

      return "data" in response ? response.data : response;
    },

    logout(): Promise<void> {
      return http.post<void>("/api/v1/auth/logout");
    },

    enableTwoFactor(): Promise<void> {
      return http.post<void>("/api/v1/auth/user/two-factor-authentication");
    },

    async twoFactorQrCode(): Promise<TwoFactorQrCode> {
      const response = await http.get<{ svg: string }>(
        "/api/v1/auth/user/two-factor-qr-code",
      );

      return { svg: response.svg };
    },

    confirmTwoFactor(code: string): Promise<void> {
      return http.post<void>(
        "/api/v1/auth/user/confirmed-two-factor-authentication",
        { code },
      );
    },

    async recoveryCodes(): Promise<string[]> {
      return http.get<string[]>("/api/v1/auth/user/two-factor-recovery-codes");
    },
  };
}

export type AuthApi = ReturnType<typeof createAuthApi>;
