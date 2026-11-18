import type { VisitorMemoryDto, VisitorMemoryList } from '@arca/api-client';

let current: VisitorMemoryList | null = null;
const listeners = new Set<() => void>();

export function peekMemories(): VisitorMemoryList | null {
  return current;
}

export function rememberMemories(list: VisitorMemoryList): void {
  current = list;
  listeners.forEach((listener) => listener());
}

function openRequestIdFor(item: VisitorMemoryDto, previous: number | null): number | null {
  if (item.status === 'submitted' || item.status === 'in_review' || item.status === 'rejected') {
    return item.id;
  }
  return previous === item.id ? null : previous;
}

export function replaceMemory(item: VisitorMemoryDto): void {
  const previous = current?.meta ?? { can_submit: true, next_submission_at: null, open_request_id: null };
  const openRequestId = openRequestIdFor(item, previous.open_request_id);
  const meta = {
    can_submit: openRequestId == null ? previous.can_submit : false,
    next_submission_at: previous.next_submission_at,
    open_request_id: openRequestId,
  };
  if (!current) {
    rememberMemories({ data: [item], meta });
    return;
  }
  const exists = current.data.some((row) => row.id === item.id);
  rememberMemories({
    data: exists ? current.data.map((row) => (row.id === item.id ? item : row)) : [item, ...current.data],
    meta,
  });
}

export function subscribeMemories(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetMemoriesForTests(): void {
  current = null;
  listeners.clear();
}
