import { useCallback, useEffect, useRef, useState } from 'react';
import { useScreenFocusEffect } from '../../hooks/useScreenFocusEffect';
import { useRouter } from 'expo-router';
import { AccountSettingsScreen } from '../../screens/AccountSettingsScreen';
import { AvatarCode, isAvatarCode } from '../../constants/avatarCatalog';
import { goBackWithinTabs } from '../../navigation/tabBack';
import { accountSession } from '../../session/accountSession';
import { profileUnchanged } from '../../viewmodels/authForm';
import { useVisitorProfile } from '../../viewmodels/useVisitorProfile';

export default function AccountSettingsRoute() {
  const router = useRouter();
  const { profile } = useVisitorProfile();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [nickname, setNickname] = useState('');
  const [avatarCode, setAvatarCode] = useState<AvatarCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const hydrated = useRef(false);
  const profileSnapshot = useRef<{ firstName: string; nickname: string; avatarCode: AvatarCode } | null>(null);

  const hydrate = (next: NonNullable<ReturnType<typeof accountSession.peekProfile>>) => {
    setEmail(next.email);
    setFirstName(next.firstName);
    setNickname(next.nickname);
    if (!isAvatarCode(next.avatarCode)) return;
    setAvatarCode(next.avatarCode);
    profileSnapshot.current = {
      firstName: next.firstName,
      nickname: next.nickname,
      avatarCode: next.avatarCode,
    };
    hydrated.current = true;
  };

  useScreenFocusEffect(
    useCallback(() => {
      const cached = accountSession.peekProfile();
      if (cached) hydrate(cached);
      else hydrated.current = false;
      return () => {
        hydrated.current = false;
        setNotice(null);
        setError(null);
      };
    }, []),
  );

  useEffect(() => {
    if (!profile || hydrated.current) return;
    hydrate(profile);
  }, [profile]);

  const save = async () => {
    if (inFlight.current) return;
    if (!firstName.trim() || !nickname.trim() || !avatarCode) {
      setError('Completa nombre, apodo y avatar.');
      return;
    }
    if (
      profileSnapshot.current
      && profileUnchanged(profileSnapshot.current, { firstName, nickname, avatarCode })
    ) {
      setError(null);
      setNotice('No has hecho cambios.');
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await accountSession.updateProfile({ firstName, nickname, avatarCode });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      profileSnapshot.current = { firstName: firstName.trim(), nickname: nickname.trim(), avatarCode };
      setNotice(result.message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
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
      onBackPress={() => goBackWithinTabs(router)}
      busy={busy}
    />
  );
}
