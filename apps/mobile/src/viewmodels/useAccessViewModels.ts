import { useCallback, useEffect, useState } from 'react';
import { InfoSection, VisitorAccountSummary, VisitorPreferenceKey, VisitorPreferences } from '../models';
import { visitorAccessRepository } from '../repositories/visitorAccessRepository';
import { validateForgotPassword, validateLogin, validateRegister, validateResetPassword } from './authForm';

const repository = visitorAccessRepository;

export function useSessionViewModel() {
  const [status, setStatus] = useState(repository.getGate());

  useEffect(() => repository.subscribe(() => setStatus(repository.getGate())), []);

  const enter = useCallback(() => repository.enter(), []);
  const leave = useCallback(() => repository.leave(), []);

  return { status, enter, leave };
}

export function useVisitorPreferencesViewModel() {
  const [preferences, setPreferences] = useState<VisitorPreferences>(repository.getPreferences());

  useEffect(() => repository.subscribe(() => setPreferences(repository.getPreferences())), []);

  const setPreference = useCallback((key: VisitorPreferenceKey, value: boolean) => {
    repository.setPreference(key, value);
  }, []);

  return { preferences, setPreference };
}

export function useVisitorContentViewModel() {
  const [account] = useState<VisitorAccountSummary>(repository.getAccount());
  const [privacySections] = useState<InfoSection[]>(repository.getPrivacySections());
  const [helpSections] = useState<InfoSection[]>(repository.getHelpSections());
  const [aboutSections] = useState<InfoSection[]>(repository.getAboutSections());
  const [accountDeletionWarning] = useState(repository.getAccountDeletionWarning());
  const [forgotPasswordNotice] = useState(repository.getForgotPasswordNotice());

  return { account, privacySections, helpSections, aboutSections, accountDeletionWarning, forgotPasswordNotice };
}

export function useLoginFormViewModel() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(() => {
    const message = validateLogin(email, password);
    setError(message);
    return message === null;
  }, [email, password]);

  return { email, setEmail, password, setPassword, error, submit };
}

export function useRegisterFormViewModel() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(() => {
    const message = validateRegister({ username, email, password, confirmation });
    setError(message);
    return message === null;
  }, [username, email, password, confirmation]);

  return {
    username,
    setUsername,
    email,
    setEmail,
    password,
    setPassword,
    confirmation,
    setConfirmation,
    error,
    submit,
  };
}

export function useForgotPasswordFormViewModel(notice: string) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sentNotice, setSentNotice] = useState<string | null>(null);

  const submit = useCallback(() => {
    const message = validateForgotPassword(email);
    setError(message);
    setSentNotice(message ? null : notice);
    return message === null;
  }, [email, notice]);

  return { email, setEmail, error, sentNotice, submit };
}

export function useResetPasswordFormViewModel() {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(() => {
    const message = validateResetPassword({ code, password, confirmation });
    setError(message);
    return message === null;
  }, [code, password, confirmation]);

  return { code, setCode, password, setPassword, confirmation, setConfirmation, error, submit };
}
