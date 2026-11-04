/** Acceso a la impresión del navegador; las vistas no tocan `window` (RN-10). */
export type Printer = {
  print: () => void;
};

export const printer: Printer = {
  print: () => window.print(),
};
