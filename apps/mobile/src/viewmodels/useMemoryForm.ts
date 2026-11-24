import { useCallback, useRef, useState } from 'react';
import type { VisitorMemoryDto } from '@arca/api-client';
import { imageProblem, OPINION_RULE } from '../memories/memoryCopy';
import { replaceMemory } from '../memories/memoryStore';
import { pickMemoryImage, type MemoryFile } from '../memories/pickMemoryImage';
import { presentMemoryError } from '../memories/presentError';
import { SUCCESS_TEXT } from '../memories/memoryCopy';
import { memoryRepository, type MemoryRepository } from '../repositories/memoryRepository';

const OPINION_MAX = 300;

export function useMemoryForm(repository: MemoryRepository, existing: VisitorMemoryDto | null) {
  const [target, setTarget] = useState<VisitorMemoryDto | null>(existing);
  const correcting = target?.status === 'rejected';
  const rejected = target?.rejected_fields ?? [];
  const previousOpinion = target?.opinion ?? '';
  const [opinion, setOpinion] = useState(previousOpinion);
  const [consent, setConsent] = useState(false);
  const [file, setFile] = useState<MemoryFile | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [opinionError, setOpinionError] = useState<string | null>(null);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [finished, setFinished] = useState(false);
  const sending = useRef(false);

  const needsNewImage = !correcting || rejected.includes('image');
  const contentMustChange = correcting && rejected.includes('content');
  const opinionUnchanged = contentMustChange && opinion.trim() === previousOpinion.trim();
  const opinionTooLong = opinion.trim().length > OPINION_MAX;
  const canSend = !busy
    && !finished
    && consent
    && !opinionTooLong
    && !opinionUnchanged
    && (!needsNewImage || file !== null);

  const prepare = useCallback((next: VisitorMemoryDto | null) => {
    const correction = next?.status === 'rejected' ? next : null;
    setTarget(correction);
    setOpinion(correction?.opinion ?? '');
    setConsent(false);
    setFile(null);
    setImageError(null);
    setOpinionError(null);
    setConsentError(null);
    setBanner(null);
    setSuccess(null);
    setBusy(false);
    setPermissionDenied(false);
    setNeedsVerification(false);
    setFinished(false);
    sending.current = false;
  }, []);

  async function chooseImage() {
    setPermissionDenied(false);
    const picked = await pickMemoryImage();
    if (!picked.ok) {
      if (picked.reason === 'denied') setPermissionDenied(true);
      return;
    }
    const problem = imageProblem(picked.file);
    setFile(problem ? null : picked.file);
    setImageError(problem);
  }

  function changeOpinion(value: string) {
    setOpinion(value);
    setOpinionError(value.trim().length > OPINION_MAX ? OPINION_RULE : null);
  }

  async function submit() {
    if (sending.current || !canSend || finished) return;
    const problem = file ? imageProblem(file) : null;
    if (problem) {
      setImageError(problem);
      return;
    }
    if (opinion.trim().length > OPINION_MAX) {
      setOpinionError(OPINION_RULE);
      return;
    }
    sending.current = true;
    setBusy(true);
    setSuccess(null);
    setBanner(null);
    setNeedsVerification(false);
    try {
      const input = { image: file, opinion, consent: true as const };
      const saved = correcting && target
        ? await repository.resubmit(target.id, input)
        : await repository.submit(input);
      replaceMemory(saved);
      setFinished(true);
      setSuccess(SUCCESS_TEXT);
    } catch (cause) {
      const shown = presentMemoryError(cause);
      setImageError(shown.image ?? null);
      setOpinionError(shown.opinion ?? null);
      setConsentError(shown.consent ?? null);
      setBanner(shown.banner ?? null);
      setNeedsVerification(shown.needsVerification);
      setSuccess(null);
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return {
    opinion,
    consent,
    fileName: file?.name ?? null,
    imageError,
    opinionError,
    consentError,
    banner,
    success,
    busy,
    permissionDenied,
    needsVerification,
    canSend,
    needsNewImage,
    contentMustChange,
    correcting,
    rejectionReason: correcting ? target?.rejection_reason ?? null : null,
    rejectedFields: correcting ? rejected : [],
    chooseImage,
    changeOpinion,
    toggleConsent: () => setConsent((value) => !value),
    setConsent,
    prepare,
    submit,
  };
}

async function unavailableMemoryCall(): Promise<never> {
  throw new Error('offline');
}

const unavailableMemoryRepository: MemoryRepository = {
  list: unavailableMemoryCall,
  submit: unavailableMemoryCall,
  resubmit: unavailableMemoryCall,
};

export function useMemoryComposer(existing: VisitorMemoryDto | null) {
  const available = memoryRepository !== null;
  const form = useMemoryForm(memoryRepository ?? unavailableMemoryRepository, existing);
  return { available, ...form };
}
