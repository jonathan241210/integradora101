const ARCA_CODE = /^ARCA-[A-Z0-9]+$/i;

export function normalizeQrCode(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (ARCA_CODE.test(trimmed)) return trimmed.toUpperCase();

  try {
    const url = new URL(trimmed);
    const codeParam = url.searchParams.get('code');
    if (codeParam && ARCA_CODE.test(codeParam)) return codeParam.toUpperCase();
    const segment = url.pathname.split('/').filter(Boolean).pop();
    if (segment && ARCA_CODE.test(segment)) return segment.toUpperCase();
  } catch {
    // Not a URL; only plain ARCA codes are accepted.
  }

  return null;
}
