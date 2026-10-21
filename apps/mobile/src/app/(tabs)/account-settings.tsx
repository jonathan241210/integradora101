import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { AccountSettingsScreen } from '../../screens/AccountSettingsScreen';
import { AvatarCode, isAvatarCode } from '../../constants/avatarCatalog';
import { accountSession } from '../../session/accountSession';

export default function AccountSettingsRoute() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [nickname, setNickname] = useState('');
  const [avatarCode, setAvatarCode] = useState<AvatarCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void accountSession.getProfile().then((profile) => {
      if (!profile) return;
      setEmail(profile.email);
      setFirstName(profile.firstName);
      setNickname(profile.nickname);
      if (isAvatarCode(profile.avatarCode)) setAvatarCode(profile.avatarCode);
    });
  }, []);

  const save = async () => {
    if (!firstName.trim() || !nickname.trim() || !avatarCode) {
      setError('Completa nombre, apodo y avatar.');
      return;
    }
    const result = await accountSession.updateProfile({ firstName, nickname, avatarCode });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(null);
    setNotice(result.message);
  };

  return (
    <AccountSettingsScreen
      email={email}
      firstName={firstName}
      nickname={nickname}
      avatarCode={avatarCode}
      error={error}
      notice={notice}
      onFirstNameChange={setFirstName}
      onNicknameChange={setNickname}
      onAvatarChange={setAvatarCode}
      onSave={() => save()}
      onChangePassword={() => router.push('/change-password')}
      onDeleteAccount={() => router.push('/delete-account')}
      onBackPress={() => router.back()}
    />
  );
}
