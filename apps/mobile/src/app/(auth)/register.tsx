import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { RegisterScreen } from '../../screens/RegisterScreen';
import { AvatarCode } from '../../constants/avatarCatalog';
import { accountSession } from '../../session/accountSession';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterRoute() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [avatarCode, setAvatarCode] = useState<AvatarCode | null>(null);
  const [isAdult, setIsAdult] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [privacyVersion, setPrivacyVersion] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void accountSession.getPrivacyNotice().then((notice) => setPrivacyVersion(notice.version));
  }, []);

  const submit = async () => {
    if (!firstName.trim() || !nickname.trim() || !email.trim() || !password || !confirmation) {
      setError('Completa nombre, apodo, correo, contraseña y confirmación.');
      return;
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('Escribe un correo válido.');
      return;
    }
    if (password !== confirmation) {
      setError('La confirmación no coincide con la contraseña.');
      return;
    }
    if (!isAdult) {
      setError('Confirma que eres mayor de 18 años.');
      return;
    }
    if (!acceptedPrivacy || !privacyVersion) {
      setError('Acepta el aviso de privacidad.');
      return;
    }
    if (!avatarCode) {
      setError('Elige un avatar del catálogo.');
      return;
    }
    const result = await accountSession.register({
      email,
      firstName,
      nickname,
      password,
      avatarCode,
      isAdult,
      privacyNoticeVersion: privacyVersion,
    });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.replace({ pathname: '/verify-email', params: { email: email.trim() } });
  };

  return (
    <RegisterScreen
      firstName={firstName}
      nickname={nickname}
      email={email}
      password={password}
      confirmation={confirmation}
      avatarCode={avatarCode}
      isAdult={isAdult}
      acceptedPrivacy={acceptedPrivacy}
      error={error}
      onFirstNameChange={setFirstName}
      onNicknameChange={setNickname}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onConfirmationChange={setConfirmation}
      onAvatarChange={setAvatarCode}
      onToggleAdult={() => setIsAdult((value) => !value)}
      onTogglePrivacy={() => setAcceptedPrivacy((value) => !value)}
      onOpenPrivacy={() => router.push('/privacy-notice')}
      onSubmit={() => submit()}
      onBackPress={() => router.back()}
    />
  );
}
