import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { PrivacyNoticeScreen } from '../../screens/PrivacyNoticeScreen';
import { accountSession } from '../../session/accountSession';

export default function PrivacyNoticeRoute() {
  const router = useRouter();
  const [version, setVersion] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    void accountSession.getPrivacyNotice().then((notice) => {
      setVersion(notice.version);
      setContent(notice.content);
    });
  }, []);

  return <PrivacyNoticeScreen version={version} content={content} onBackPress={() => router.back()} />;
}
