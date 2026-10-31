import { useEffect, useState } from 'react';
import { accountSession, AccountSessionStatus } from '../session/accountSession';

export function useAccountSession() {
  const [status, setStatus] = useState<AccountSessionStatus>(accountSession.getStatus());

  useEffect(() => accountSession.subscribe(() => setStatus(accountSession.getStatus())), []);

  useEffect(() => {
    void accountSession.bootstrap();
  }, []);

  return {
    status,
    login: accountSession.login.bind(accountSession),
    logout: accountSession.logout.bind(accountSession),
    refresh: accountSession.refresh.bind(accountSession),
    register: accountSession.register.bind(accountSession),
    verifyEmail: accountSession.verifyEmail.bind(accountSession),
    resendVerification: accountSession.resendVerification.bind(accountSession),
    forgotPassword: accountSession.forgotPassword.bind(accountSession),
    resetPassword: accountSession.resetPassword.bind(accountSession),
    getPrivacyNotice: accountSession.getPrivacyNotice.bind(accountSession),
    getProfile: accountSession.getProfile.bind(accountSession),
    updateProfile: accountSession.updateProfile.bind(accountSession),
    changePassword: accountSession.changePassword.bind(accountSession),
    deleteAccount: accountSession.deleteAccount.bind(accountSession),
  };
}
