/**
 * Estado y reglas de ayuda de la caja de imagen de Noticias y Eventos
 * (dashboard-004 CA-04 a CA-06). El tipo y el tamaño se comprueban solo para
 * orientar al usuario; la regla definitiva la aplica la API (`api-008` RN-01,
 * RN-02 y RN-08). Son espejo de la API: un cambio allá exige cambiarlos aquí.
 */
export const IMAGE_ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_ACCEPT_ATTRIBUTE = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";
export const IMAGE_HELP_TEXT = "JPG, PNG o WebP · máximo 5 MB";
export const IMAGE_TYPE_ERROR = "El archivo debe ser una imagen JPG, PNG o WebP.";
export const IMAGE_SIZE_ERROR = "La imagen no debe pesar más de 5 MB.";

/** Creación y liberación de la URL de vista previa (inyectable en pruebas). */
export type ImagePreview = {
  create(file: File): string;
  revoke(url: string): void;
};

export type ImageValue = {
  /** Archivo adjunto (solo en memoria; RN-04). */
  file: File | null;
  previewUrl: string;
  /** Verdadero solo si había imagen guardada y se pidió quitarla. */
  removeImage: boolean;
  /** Error de ayuda en la caja de imagen (CA-05). */
  error: string;
};

export function emptyImage(): ImageValue {
  return { file: null, previewUrl: "", removeImage: false, error: "" };
}

/** Devuelve el mensaje en español si el archivo no sirve; cadena vacía si sí. */
export function validateImageFile(file: { type: string; size: number }): string {
  if (!(IMAGE_ACCEPTED_TYPES as readonly string[]).includes(file.type)) return IMAGE_TYPE_ERROR;
  if (file.size > IMAGE_MAX_BYTES) return IMAGE_SIZE_ERROR;

  return "";
}

/**
 * Adjunta un archivo válido (liberando la vista previa anterior) o, si no es
 * válido, lo descarta y deja el error en la caja. Elegir un archivo deja
 * `removeImage` en falso (`api-008` P4: gana el archivo).
 */
export function selectImage(current: ImageValue, file: File, preview: ImagePreview): ImageValue {
  const error = validateImageFile(file);

  if (error) return { ...current, error };

  if (current.previewUrl) preview.revoke(current.previewUrl);

  return { file, previewUrl: preview.create(file), removeImage: false, error: "" };
}

/** «Quitar imagen»: `removeImage` solo si había una imagen guardada. */
export function dropImage(
  current: ImageValue,
  hadSavedImage: boolean,
  preview: ImagePreview,
): ImageValue {
  releaseImage(current, preview);

  return { file: null, previewUrl: "", removeImage: hadSavedImage, error: "" };
}

export function releaseImage(current: ImageValue, preview: ImagePreview): void {
  if (current.previewUrl) preview.revoke(current.previewUrl);
}
