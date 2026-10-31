export type SaveFile = (file: { blob: Blob; filename: string }) => void;

/**
 * Entrega un archivo ya descargado de la API al navegador mediante un
 * enlace temporal. Se inyecta en el ViewModel para poder simularlo en pruebas.
 */
export const saveFile: SaveFile = ({ blob, filename }) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};
