import type { VisitorMemoryDto, VisitorMemoryField, VisitorMemoryStatus } from '@arca/api-client';

export const CONSENT_TEXT =
  'Confirmo que tengo permiso de las personas que aparecen en la foto y, si hay menores, de sus madres, padres o tutores, y que acepto los términos y condiciones de «Momentos para recordar».';

export const SUCCESS_TEXT =
  'Tu petición se envió. El zoológico la revisará; todavía no está publicada.';

export const OPEN_TEXT = 'Ya tienes una petición abierta.';

export const CONFIRM_CORRECTION = '¿Seguro que quieres enviar la corrección?';

export const CONFIRM_CORRECTION_BODY =
  'Si confirmas, vuelves a tus momentos y no podrás modificarla hasta que el zoológico la revise de nuevo.';

export const IMAGE_RULE = 'La foto debe ser JPG, PNG o WebP de máximo 5 MB.';

export const OPINION_RULE = 'La opinión puede tener hasta 300 caracteres.';

export const DENIED_TEXT =
  'Para elegir la foto, permite el acceso a tus fotos en los ajustes del teléfono.';

export const OFFLINE_TEXT = 'Sin conexión';

export const CHANGE_IMAGE = 'Cambia la foto: el zoológico no la aceptó.';

export const CHANGE_OPINION = 'Cambia la opinión: el zoológico pide otro texto.';

export const IMAGE_NOTE = 'La foto no cumple lo indicado';

export const OPINION_NOTE = 'La opinión necesita cambios';

const STATUS_LABEL: Record<VisitorMemoryStatus, string> = {
  submitted: 'Enviada',
  in_review: 'En proceso',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
};

const DATE = new Intl.DateTimeFormat('es-MX', {
  timeZone: 'America/Mexico_City',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const DATE_TIME = new Intl.DateTimeFormat('es-MX', {
  timeZone: 'America/Mexico_City',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function statusLabel(status: VisitorMemoryStatus): string {
  return STATUS_LABEL[status];
}

export function formatMemoryDate(iso: string, withTime = false): string {
  return (withTime ? DATE_TIME : DATE).format(new Date(iso));
}

export function weeklyText(iso: string): string {
  return `Podrás enviar otra memoria a partir del ${formatMemoryDate(iso, true)}.`;
}

export function publicationLine(item: Pick<VisitorMemoryDto, 'status' | 'published_until' | 'is_published'>): string | null {
  if (item.status !== 'accepted' || !item.published_until) return null;
  const date = formatMemoryDate(item.published_until);
  return item.is_published
    ? `Publicada en «Momentos para recordar» del portal hasta el ${date}.`
    : `La publicación terminó el ${date}. Ya no se muestra en el portal.`;
}

export function fieldNote(field: VisitorMemoryField): string {
  return field === 'image' ? IMAGE_NOTE : OPINION_NOTE;
}

export function fieldHint(field: VisitorMemoryField): string {
  return field === 'image' ? CHANGE_IMAGE : CHANGE_OPINION;
}

export type MemoryComposerAccess = 'create' | 'correct' | 'open' | 'weekly' | 'missing' | 'view';

export function memoryComposerAccess(input: {
  requestedId: number | null;
  status: VisitorMemoryStatus | null;
  openRequestId: number | null;
  canSubmit: boolean;
  nextSubmissionAt: string | null;
}): MemoryComposerAccess {
  if (input.requestedId != null) {
    if (input.status == null) return 'missing';
    if (input.status === 'rejected') return 'correct';
    return 'view';
  }
  if (input.openRequestId != null) return 'open';
  if (!input.canSubmit && input.nextSubmissionAt) return 'weekly';
  return 'create';
}

export function toMemoryCard(item: VisitorMemoryDto): {
  id: number;
  title: string;
  statusLabel: string;
  reason: string | null;
  notes: string[];
  publication: string | null;
  sentNote: string | null;
  canCorrect: boolean;
  status: VisitorMemoryDto['status'];
} {
  return {
    id: item.id,
    title: item.opinion?.trim() || 'Foto sin opinión',
    statusLabel: statusLabel(item.status),
    reason: item.status === 'rejected' ? item.rejection_reason ?? null : null,
    notes: item.status === 'rejected' ? (item.rejected_fields ?? []).map(fieldNote) : [],
    publication: publicationLine(item),
    sentNote: item.status === 'submitted' ? SUCCESS_TEXT : null,
    canCorrect: item.status === 'rejected',
    status: item.status,
  };
}

export function toMemoryDetail(item: VisitorMemoryDto): {
  title: string;
  opinion: string | null;
  status: VisitorMemoryDto['status'];
  statusLabel: string;
  sentAt: string | null;
  note: string | null;
} {
  const opinion = item.opinion?.trim() || null;
  return {
    title: opinion || 'Foto sin opinión',
    opinion,
    status: item.status,
    statusLabel: statusLabel(item.status),
    sentAt: item.created_at ? `Enviada el ${formatMemoryDate(item.created_at, true)}` : null,
    note: memoryStatusNote(item),
  };
}

export function memoryStatusNote(item: Pick<VisitorMemoryDto, 'status' | 'published_until' | 'is_published'>): string | null {
  if (item.status === 'submitted') return SUCCESS_TEXT;
  if (item.status === 'in_review') return 'El zoológico está revisando tu petición.';
  if (item.status === 'accepted') return publicationLine(item);
  return null;
}

const IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function imageProblem(file: { name: string; mimeType: string; size: number | null }): string | null {
  const mime = file.mimeType.toLowerCase();
  const nameOk = /\.(jpe?g|png|webp)$/i.test(file.name);
  if (!IMAGE_TYPES.has(mime) && !nameOk) return IMAGE_RULE;
  if (file.size != null && file.size > MAX_IMAGE_BYTES) return IMAGE_RULE;
  return null;
}
