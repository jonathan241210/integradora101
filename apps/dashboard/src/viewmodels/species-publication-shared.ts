import { describeApiError } from "./api-errors";
import type {
  SpeciesCategory,
  SpeciesFichaField,
  SpeciesPublicationStatus,
  SpeciesRequestStatus,
  SpeciesRequestType,
  SpeciesRequestUpdateInput,
} from "./admin-types";

/**
 * Helpers compartidos de las secciones de publicación de especies
 * (dashboard-010). Solo presentación: etiquetas, validación que la API
 * repite y mapeo de errores. Los estados los decide la API (RN-01).
 */

export const requestStatusLabels: Record<SpeciesRequestStatus, string> = {
  submitted: "Pendiente",
  accepted: "Publicada",
  rejected: "Rechazada",
};

/** Estado de la especie (`publication_status`, api-014 RN-18). */
export const speciesStatusLabels: Record<SpeciesPublicationStatus, string> = {
  not_published: "Sin publicar",
  pending: "Pendiente",
  published: "Publicada",
  unpublished: "Despublicada",
};

export const requestTypeLabels: Record<SpeciesRequestType, string> = {
  publish: "Primera publicación",
  update: "Actualización",
};

/** Etiquetas propuestas (plan R-9, pendientes de confirmación de producto). */
export const categoryLabels: Record<SpeciesCategory, string> = {
  mammal: "Mamífero",
  bird: "Ave",
  reptile: "Reptil",
  amphibian: "Anfibio",
  fish: "Pez",
  invertebrate: "Invertebrado",
};

export const categoryOptions = Object.keys(categoryLabels) as SpeciesCategory[];

export function categoryLabel(category: SpeciesCategory | null | undefined): string {
  return category ? categoryLabels[category] : "—";
}

export const unpublishedSpeciesLabel = "Especie despublicada";
export const originLabel = "Área de distribución natural";

export const fichaFieldOptions = [
  { key: "scientific_name", label: "Nombre científico" },
  { key: "origin", label: originLabel },
  { key: "habitat", label: "Hábitat" },
] as const;

export const SCIENTIFIC_NAME_PREVIEW_MAX = 60;
export const CORRECTION_MAX = 150;
export const REJECTION_REASON_MAX = 500;
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_TYPE_ERROR = "Elige una imagen JPG o PNG.";
export const PHOTO_SIZE_ERROR = "La foto no puede superar 5 MB.";
export const PHOTO_ACCEPT_ATTRIBUTE = ".jpg,.jpeg,.png,image/jpeg,image/png";
export const EMPTY_CORRECTION_HINT = "Vacío: se mantiene el valor actual.";
export const SAVE_BEFORE_PUBLISH_NOTICE = "Guarda los cambios antes de publicar.";
export const REQUESTS_FORBIDDEN_MESSAGE =
  "No tienes permiso para revisar solicitudes de especies.";
export const PUBLISHED_FORBIDDEN_MESSAGE =
  "No tienes permiso para gestionar especies publicadas.";
export const REQUEST_NOT_FOUND_MESSAGE = "Solicitud no encontrada.";
export const SPECIES_NOT_FOUND_MESSAGE = "Especie no encontrada.";
export const PHOTO_LOAD_ERROR = "No se pudo cargar la foto.";

/** Texto largo recortado con «…» (CA-03). */
export function truncateText(value: string | null | undefined, max: number): string {
  if (!value) return "—";

  return value.length > max ? `${value.slice(0, max)}…` : value;
}

/** Quita espacios sobrantes y valida el máximo de una corrección (CA-08). */
export function validateCorrection(value: string): { value: string; error: string } {
  const trimmed = value.trim();

  return {
    value: trimmed,
    error:
      trimmed.length > CORRECTION_MAX
        ? `Máximo ${CORRECTION_MAX} caracteres.`
        : "",
  };
}

/** Motivo de rechazo de 1 a 500 caracteres (RN-06); la API valida de nuevo. */
export function validateRejectionReason(value: string): { value: string; error: string } {
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

/** Foto JPG o PNG de hasta 5 MB (CA-49); la API valida de nuevo. */
export function validateSpeciesPhoto(file: { type: string; size: number }): string {
  if (file.type !== "image/jpeg" && file.type !== "image/png") return PHOTO_TYPE_ERROR;
  if (file.size > PHOTO_MAX_BYTES) return PHOTO_SIZE_ERROR;

  return "";
}

export type SpeciesSection = "requests" | "published";

export type SpeciesErrorView = {
  message: string;
  status: number;
  unauthorized: boolean;
  forbidden: boolean;
  notFound: boolean;
  /** 5xx o fallo de red: la vista ofrece «Reintentar». */
  retryable: boolean;
  fieldErrors: Record<string, string[]>;
};

/**
 * Mapeo de errores por sección (CA-17, CA-58). El 401 lo atiende el manejador
 * global de sesión: aquí solo se marca. 422 conserva el mensaje de la API.
 */
export function describeSpeciesError(
  error: unknown,
  section: SpeciesSection,
): SpeciesErrorView {
  const described = describeApiError(error);
  const base = {
    status: described.status,
    unauthorized: described.unauthorized,
    forbidden: described.forbidden,
    notFound: described.notFound,
    fieldErrors: described.fieldErrors,
  };

  if (described.forbidden) {
    return {
      ...base,
      retryable: false,
      message:
        section === "requests" ? REQUESTS_FORBIDDEN_MESSAGE : PUBLISHED_FORBIDDEN_MESSAGE,
    };
  }

  if (described.notFound) {
    return {
      ...base,
      retryable: false,
      message:
        section === "requests" ? REQUEST_NOT_FOUND_MESSAGE : SPECIES_NOT_FOUND_MESSAGE,
    };
  }

  return {
    ...base,
    retryable: described.status === 0 || described.status >= 500,
    message: described.message,
  };
}

/**
 * La API informa los 422 de estado (p. ej. «Esta solicitud ya fue revisada.»,
 * «Esta especie no está publicada.») bajo las claves `status` o `species`, que
 * no son campos de formulario: la vista recarga en vez de marcar un campo.
 */
const STATE_ERROR_KEYS = ["status", "species"];

export function isStateConflict(error: Pick<SpeciesErrorView, "status" | "fieldErrors">): boolean {
  return (
    error.status === 422 &&
    Object.keys(error.fieldErrors).every((key) => STATE_ERROR_KEYS.includes(key))
  );
}

/** Errores por campo sin las claves de estado (`status`, `species`). */
export function formFieldErrors(fieldErrors: Record<string, string[]>): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(fieldErrors).filter(([key]) => !STATE_ERROR_KEYS.includes(key)),
  );
}

/**
 * Contador de generación: la respuesta anterior no escribe en el estado al
 * cambiar de filtro, solicitud o especie (mismo patrón que `useTicketPrices`).
 */
export function createGeneration() {
  let current = 0;

  return {
    next: () => ++current,
    /** Token vigente sin invalidar las operaciones en curso. */
    peek: () => current,
    invalidate: () => void ++current,
    isCurrent: (token: number) => token === current,
  };
}

/** Borrador del formulario de ficha (solicitud o especie despublicada). */
export type SpeciesSheetDraft = {
  scientific_name: string;
  habitat: string;
  origin: string;
  category: SpeciesCategory | "";
  published_fields: SpeciesFichaField[];
};

type SheetSource = {
  scientific_name: string | null;
  habitat: string | null;
  origin: string | null;
  category: SpeciesCategory | null;
  published_fields: string[] | null;
};

const fichaKeys = fichaFieldOptions.map((option) => option.key) as SpeciesFichaField[];

/** Precarga el borrador con lo que se publicará (CA-07, CA-55). */
export function draftFromSheet(source: SheetSource): SpeciesSheetDraft {
  return {
    scientific_name: source.scientific_name ?? "",
    habitat: source.habitat ?? "",
    origin: source.origin ?? "",
    category: source.category ?? "",
    published_fields: fichaKeys.filter((key) => (source.published_fields ?? []).includes(key)),
  };
}

const sameSelection = (left: string[], right: string[]) =>
  left.length === right.length && left.every((key) => right.includes(key));

/** Verdadero si el borrador difiere de lo guardado o hay una foto elegida. */
export function sheetIsDirty(
  baseline: SpeciesSheetDraft | null,
  draft: SpeciesSheetDraft | null,
  hasNewPhoto: boolean,
): boolean {
  if (hasNewPhoto) return true;
  if (!baseline || !draft) return false;

  return (
    baseline.scientific_name.trim() !== draft.scientific_name.trim() ||
    baseline.habitat.trim() !== draft.habitat.trim() ||
    baseline.origin.trim() !== draft.origin.trim() ||
    baseline.category !== draft.category ||
    !sameSelection(baseline.published_fields, draft.published_fields)
  );
}

/**
 * Entrada del PATCH: solo los campos cambiados, `category` siempre que se
 * guarda (plan, pregunta 5) y la foto solo si se eligió una. Devuelve los
 * errores de presentación sin llamar a la API.
 */
export function buildSheetUpdate(
  baseline: SpeciesSheetDraft,
  draft: SpeciesSheetDraft,
  photo: File | null,
): { input: SpeciesRequestUpdateInput | null; fieldErrors: Record<string, string[]> } {
  const fieldErrors: Record<string, string[]> = {};
  const input: SpeciesRequestUpdateInput = {};

  for (const field of ["scientific_name", "habitat", "origin"] as const) {
    const checked = validateCorrection(draft[field]);

    if (checked.error) fieldErrors[field] = [checked.error];
    else if (checked.value !== baseline[field].trim()) input[field] = checked.value;
  }

  if (draft.category === "") fieldErrors.category = ["Elige el tipo de animal."];
  else input.category = draft.category;

  if (!sameSelection(baseline.published_fields, draft.published_fields)) {
    input.published_fields = draft.published_fields;
  }

  if (photo) input.image = photo;

  return Object.keys(fieldErrors).length > 0
    ? { input: null, fieldErrors }
    : { input, fieldErrors };
}
