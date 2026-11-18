import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { AppText, ScreenContainer } from '../../components/ui';
import { goBackWithinTabs } from '../../navigation/tabBack';
import { OFFLINE_TEXT, toMemoryCard } from '../../memories/memoryCopy';
import { MemoriesScreen } from '../../screens/MemoriesScreen';
import { useVisitorMemories } from '../../viewmodels/useVisitorMemories';

export default function MemoriesRoute() {
  const router = useRouter();
  const { list, loading, error, reload, available } = useVisitorMemories();
  const firstFocus = useRef(true);
  const focused = useRef(false);

  useFocusEffect(useCallback(() => {
    focused.current = true;
    if (firstFocus.current) {
      firstFocus.current = false;
    } else {
      void reload();
    }
    return () => {
      focused.current = false;
    };
  }, [reload]));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active' && focused.current) void reload();
    });
    return () => subscription.remove();
  }, [reload]);

  if (!available) {
    return (
      <ScreenContainer>
        <AppText variant="body">{OFFLINE_TEXT}</AppText>
      </ScreenContainer>
    );
  }

  return (
    <MemoriesScreen
      loading={loading && !list}
      error={error}
      items={(list?.data ?? []).map(toMemoryCard)}
      canSubmit={list?.meta.can_submit ?? true}
      nextSubmissionAt={list?.meta.next_submission_at ?? null}
      openRequestId={list?.meta.open_request_id ?? null}
      onCreate={() => router.push('/memory-form')}
      onOpen={(id) => router.push({ pathname: '/memory-form', params: { id: String(id) } })}
      onRetry={() => { void reload(); }}
      onBack={() => goBackWithinTabs(router)}
    />
  );
}
