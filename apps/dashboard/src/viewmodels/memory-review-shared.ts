import { describeApiError } from "./api-errors";
import type { ConfirmationCopy } from "./confirmation";
import type { MemoryRejectedField, MemoryReviewStatus } from "./admin-types";

/**
 * Helpers de «Momentos» (dashboard-008). Solo presentación: etiquetas,
 * validación que la API repite y mapeo de errores. Los estados, los plazos y
 * los permisos los decide la API (RN-01, RN-03, RN-04).
 */

/** Contador de generación compartido con dashboard-010 (no se duplica). */
export { createGeneration } from "./species-publication-shared";

export const memoryStatusLabels: Record<MemoryReviewStatus, string> = {
  submitted: "Enviada",
  in_review: "En proceso",
  accepted: "Aceptada",
  rejected: "Rechazada",
};

export const memoryFieldLabels: Record<MemoryRejectedField, string> = {
  image: "La foto",
  content: "La opinión",
};

/** Valores admitidos por la API (api-010 RN-20), en el orden de las casillas. */
export const memoryRejectFieldOptions: MemoryRejectedField[] = ["image", "content"];

export const REJECTION_REASON_MAX = 500;
export const OPINION_EXCERPT_MAX = 120;

export const MEMORIES_FORBIDDEN_MESSAGE = "No tienes permiso para revisar momentos.";
export const MEMORY_NOT_FOUND_MESSAGE = "Petición no encontrada.";
export const MEMORY_LIST_ERROR_MESSAGE = "No se pudieron cargar las peticiones.";
export const MEMORY_DETAIL_ERROR_MESSAGE = "No se pudo cargar la petición.";
export const MEMORY_IMAGE_ERROR_MESSAGE = "No se pudo cargar la imagen.";
export const MEMORY_IMAGE_REQUIRED_MESSAGE = "No se puede aceptar sin la imagen.";
export const MEMORY_IMAGE_ALT = "Foto enviada por un visitante";
export const MEMORY_ACCEPTED_NOTICE = "Petición aceptada.";
export const MEMORY_REJECTED_NOTICE = "Petición rechazada. Esperando la corrección del visitante.";
export const MEMORY_WAITING_CORRECTION = "Esperando la corrección del visitante.";
export const NO_OPINION_TEXT = "Sin opinión";

/** Creación y liberación de una URL `blob:` (inyectable en pruebas; CA-17). */
export type BlobPreview = {
  create(blob: Blob): string;
  revoke(url: string): void;
};

/** Fragmento de la opinión para la lista (presentación, 120 caracteres). */
export function excerpt(opinion: string | null | undefined): string {
  const text = opinion?.trim();

  if (!text) return NO_OPINION_TEXT;

  return text.length > OPINION_EXCERPT_MAX ? `${text.slice(0, OPINION_EXCERPT_MAX)}…` : text;
}

/** «Reenviada 1 vez» o «Reenviada {n} veces»; vacío si no hay reenvíos. */
export function resubmittedText(count: number): string {
  if (!(count > 0)) return "";

  return count === 1 ? "Reenviada 1 vez" : `Reenviada ${count} veces`;
}

/** Motivo de 1 a 500 caracteres tras quitar espacios sobrantes (RN-05). */
export function validateMemoryReason(value: string): { value: string; error: string } {
  const trimmed = value.trim();

  if (!trimmed) return { value: trimmed, error: "Indica el motivo del rechazo." };

  return {
    value: trimmed,
    error:
      trimmed.length > REJECTION_REASON_MAX
        ? `El motivo admite hasta ${REJECTION_REASON_MAX} caracteres.`
        : "",
  };
}

/** Solo `image` y `content`, sin repetidos; el resto no pasa (RN-05). */
export function sanitizeRejectedFields(fields: readonly string[]): MemoryRejectedField[] {
  return memoryRejectFieldOptions.filter((option) => fields.includes(option));
}

/** «Confirmar» del rechazo: motivo válido y al menos una casilla (CA-09). */
export function canConfirmRejection(reason: string, fields: readonly string[]): boolean {
  return !validateMemoryReason(reason).error && sanitizeRejectedFields(fields).length > 0;
}

export function publicationDaysText(days: number): string {
  return days === 1 ? "1 día" : `${days} días`;
}

/** Diálogo de aceptar con el plazo que devuelve la API; no lo calcula (RN-04). */
export function memoryAcceptCopy(publicationDays: number): ConfirmationCopy {
  return {
    title: "¿Aceptar esta petición?",
    message: `La foto y la opinión se publicarán en la galería del portal durante ${publicationDaysText(publicationDays)} desde la aceptación. Después dejarán de mostrarse.`,
    confirmLabel: "Confirmar",
    danger: false,
  };
}

export function memoryRejectCopy(): ConfirmationCopy {
  return {
    title: "Rechazar petición",
    message:
      "Indica qué falló y por qué. El visitante verá el motivo y podrá corregir lo marcado.",
    confirmLabel: "Confirmar",
    danger: true,
  };
}

/** Texto de vigencia de una aceptada; `is_published` lo calcula la API (CA-19). */
export function publicationText(isPublished: boolean, formattedUntil: string): string {
  return isPublished
    ? `Publicada en la galería hasta el ${formattedUntil}.`
    : `La publicación venció el ${formattedUntil}.`;
}

export type MemoryErrorView = {
  message: string;
  status: number;
  /** 401: lo atiende el manejador global de sesión; sin mensaje propio. */
  unauthorized: boolean;
  forbidden: boolean;
  notFound: boolean;
  /** 5xx o fallo de red: la vista ofrece «Reintentar». */
  retryable: boolean;
  fieldErrors: Record<string, string[]>;
};

export type MemoryErrorScope = "list" | "detail" | "decision";

/** Mapeo de errores por código HTTP y por `errors` de la API (CA-11). */
export function describeMemoryError(error: unknown, scope: MemoryErrorScope): MemoryErrorView {
  const described = describeApiError(error);
  const base = {
    status: described.status,
    unauthorized: described.unauthorized,
    forbidden: described.forbidden,
    notFound: described.notFound,
    fieldErrors: described.fieldErrors,
  };

  if (described.forbidden) {
    return { ...base, retryable: false, message: MEMORIES_FORBIDDEN_MESSAGE };
  }

  if (described.notFound) {
    return { ...base, retryable: false, message: MEMORY_NOT_FOUND_MESSAGE };
  }

  const retryable = described.status === 0 || described.status >= 500;

  if (retryable && scope !== "decision") {
    return {
      ...base,
      retryable,
      message: scope === "list" ? MEMORY_LIST_ERROR_MESSAGE : MEMORY_DETAIL_ERROR_MESSAGE,
    };
  }

  return { ...base, retryable, message: described.message };
}

/** Claves de `errors` que son de estado y no de un campo del formulario. */
const STATE_ERROR_KEYS = ["status"];

/**
 * Decisión tardía (api-010 CA-13): 422 sin `errors` o solo con `errors.status`.
 * La vista muestra el mensaje de la API y recarga el detalle (CA-10).
 */
export function isMemoryStateConflict(
  error: Pick<MemoryErrorView, "status" | "fieldErrors">,
): boolean {
  return (
    error.status === 422 &&
    Object.keys(error.fieldErrors).every((key) => STATE_ERROR_KEYS.includes(key))
  );
}

/** Errores por campo sin las claves de estado. */
export function memoryFieldErrors(
  fieldErrors: Record<string, string[]>,
): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(fieldErrors).filter(([key]) => !STATE_ERROR_KEYS.includes(key)),
  );
}
