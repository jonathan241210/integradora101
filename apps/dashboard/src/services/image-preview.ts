import type { ImagePreview } from "@/viewmodels/image-field";

/**
 * Vista previa local de la imagen elegida (dashboard-004 RN-04). Usa solo la
 * API del navegador: la URL vive en memoria y se libera con `revoke`.
 */
export const imagePreview: ImagePreview = {
  create: (file) => URL.createObjectURL(file),
  revoke: (url) => URL.revokeObjectURL(url),
};
