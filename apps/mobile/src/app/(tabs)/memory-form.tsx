import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { AppText, BackButton, ScreenContainer, TitledLoading } from '../../components/ui';
import { goBackWithinTabs } from '../../navigation/tabBack';
import {
  memoryComposerAccess,
  OFFLINE_TEXT,
  OPEN_TEXT,
  toMemoryDetail,
  weeklyText,
} from '../../memories/memoryCopy';
import { peekMemories, subscribeMemories } from '../../memories/memoryStore';
import { MemoryDetailScreen } from '../../screens/MemoryDetailScreen';
import { MemoryFormScreen } from '../../screens/MemoryFormScreen';
import { MemoryUnavailableScreen } from '../../screens/MemoryUnavailableScreen';
import { useVisitorProfile } from '../../viewmodels/useVisitorProfile';
import { findMemory, useVisitorMemories } from '../../viewmodels/useVisitorMemories';
import { useMemoryComposer } from '../../viewmodels/useMemoryForm';
import type { VisitorMemoryDto } from '@arca/api-client';

function correctionFrom(idParam: string): VisitorMemoryDto | null {
  const numeric = Number(idParam);
  if (!Number.isInteger(numeric) || numeric <= 0) return null;
  const row = findMemory(numeric, peekMemories());
  return row?.status === 'rejected' ? row : null;
}

export default function MemoryFormRoute() {
  const router = useRouter();
  const { profile } = useVisitorProfile();
  const params = useLocalSearchParams<{ id?: string }>();
  const idParam = typeof params.id === 'string' ? params.id : '';
  const requestedId = Number(idParam);
  const id = Number.isInteger(requestedId) && requestedId > 0 ? requestedId : null;
  const snapshot = useSyncExternalStore(subscribeMemories, peekMemories, peekMemories);
  const liveRow = id != null ? findMemory(id, snapshot) : null;
  const access = memoryComposerAccess({
    requestedId: id,
    status: liveRow?.status ?? null,
    openRequestId: snapshot?.meta.open_request_id ?? null,
    canSubmit: snapshot?.meta.can_submit ?? true,
    nextSubmissionAt: snapshot?.meta.next_submission_at ?? null,
  });
  const [initial] = useState(() => correctionFrom(idParam));
  const form = useMemoryComposer(initial);
  const memories = useVisitorMemories();
  const [lookedUpId, setLookedUpId] = useState<number | null>(() => (
    id != null && findMemory(id) != null ? id : null
  ));
  const preparedId = useRef<number | null>(initial?.id ?? null);
  const left = useRef(false);

  useEffect(() => {
    if (id == null || findMemory(id, peekMemories())) {
      setLookedUpId(id);
      return;
    }
    let active = true;
    void memories.reload().finally(() => {
      if (active) setLookedUpId(id);
    });
    return () => {
      active = false;
    };
  }, [id, memories.reload]);

  useEffect(() => {
    if (liveRow?.status !== 'rejected' || preparedId.current === liveRow.id) return;
    preparedId.current = liveRow.id;
    form.prepare(liveRow);
  }, [form.prepare, liveRow]);

  useFocusEffect(useCallback(() => {
    if (left.current) {
      left.current = false;
      form.prepare(correctionFrom(idParam));
    }
    return () => {
      left.current = true;
    };
  }, [form.prepare, idParam]));

  useEffect(() => {
    if (!form.needsVerification) return;
    router.push({ pathname: '/verify-email', params: { email: profile?.email ?? '' } });
  }, [form.needsVerification, profile?.email, router]);

  useEffect(() => {
    if (form.success) router.replace('/memories');
  }, [form.success, router]);

  if (!form.available) {
    return (
      <ScreenContainer>
        <AppText variant="body">{OFFLINE_TEXT}</AppText>
      </ScreenContainer>
    );
  }

  if (id != null && liveRow == null && lookedUpId !== id) {
    return (
      <ScreenContainer scroll={false}>
        <TitledLoading title="Tu momento" message="Buscando tu momento…" />
      </ScreenContainer>
    );
  }

  if (access === 'missing') {
    const failed = memories.error != null;
    return (
      <MemoryUnavailableScreen
        title="Tu momento"
        message={memories.error ?? 'No encontramos esa petición.'}
        detail={failed
          ? 'No pudimos abrir este momento. Inténtalo de nuevo.'
          : 'Puede que ya no esté en tu cuenta.'}
        actionLabel={failed ? 'Reintentar' : 'Ver mis momentos'}
        onAction={failed
          ? () => {
              setLookedUpId(null);
              void memories.reload().finally(() => setLookedUpId(id));
            }
          : () => router.replace('/memories')}
        onBack={() => router.replace('/memories')}
      />
    );
  }

  if (access === 'view' && liveRow) {
    return <MemoryDetailScreen detail={toMemoryDetail(liveRow)} onBack={() => goBackWithinTabs(router)} />;
  }

  if (access === 'open') {
    const openId = snapshot?.meta.open_request_id ?? null;
    const openRow = openId != null ? findMemory(openId, snapshot) : null;
    if (openRow) {
      return <MemoryDetailScreen detail={toMemoryDetail(openRow)} onBack={() => goBackWithinTabs(router)} />;
    }
  }

  if (access === 'open' || access === 'weekly') {
    const message = access === 'weekly' && snapshot?.meta.next_submission_at
      ? weeklyText(snapshot.meta.next_submission_at)
      : OPEN_TEXT;
    return (
      <ScreenContainer>
        <BackButton onPress={() => goBackWithinTabs(router)} accessibilityLabel="Volver a mis momentos" />
        <AppText variant="body">{message}</AppText>
      </ScreenContainer>
    );
  }

  return (
    <MemoryFormScreen
      title={access === 'correct' ? 'Corregir y reenviar' : 'Enviar un momento'}
      opinion={form.opinion}
      consent={form.consent}
      fileName={form.fileName}
      imageError={form.imageError}
      opinionError={form.opinionError}
      consentError={form.consentError}
      banner={form.banner}
      success={form.success}
      busy={form.busy}
      permissionDenied={form.permissionDenied}
      canSend={form.canSend}
      requiresConfirmation={form.correcting}
      reason={form.rejectionReason}
      rejectedFields={form.rejectedFields}
      onOpinionChange={form.changeOpinion}
      onToggleConsent={form.toggleConsent}
      onChooseImage={() => { void form.chooseImage(); }}
      onSubmit={() => { void form.submit(); }}
      onBack={() => goBackWithinTabs(router)}
    />
  );
}
