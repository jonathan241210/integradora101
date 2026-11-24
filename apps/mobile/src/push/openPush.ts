export type PushData = {
  type?: string;
  id?: string;
};

export type PushRouter = {
  push: (href: { pathname: string; params: { id: string } }) => void;
  replace: (href: string) => void;
};

export const UNAVAILABLE_PUSH_TEXT = 'Ya no está disponible.';

export function readPushData(data: unknown): PushData {
  if (!data || typeof data !== 'object') return {};
  const record = data as Record<string, unknown>;
  const id = record.id;
  return {
    type: typeof record.type === 'string' ? record.type : undefined,
    id: typeof id === 'string' || typeof id === 'number' ? String(id) : undefined,
  };
}

export async function openPush(
  data: PushData,
  router: PushRouter,
  detailExists: (type: 'news' | 'event', id: string) => Promise<boolean>,
): Promise<string | null> {
  if (data.type === 'memory' && data.id) {
    router.push({ pathname: '/memory-form', params: { id: data.id } });
    return null;
  }

  if ((data.type === 'news' || data.type === 'event') && data.id) {
    const exists = await detailExists(data.type, data.id);
    if (!exists) {
      router.replace('/');
      return UNAVAILABLE_PUSH_TEXT;
    }
    router.push({
      pathname: data.type === 'news' ? '/news-detail' : '/event-detail',
      params: { id: data.id },
    });
  }

  return null;
}
