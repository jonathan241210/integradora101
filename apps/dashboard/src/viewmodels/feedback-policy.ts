/**
 * Regla de mensajes del panel (dashboard-020 RN-07). Cuatro categorías y no hay otras.
 * Es lógica de presentación pura: decide dónde se muestra un mensaje, no su texto.
 */
export type FeedbackCategory = "toast" | "field" | "dialog" | "view-state";

/** Origen de un mensaje; cada uno pertenece a una sola categoría. */
export type FeedbackSource =
  | "action-success"
  | "action-error"
  | "export-network-error"
  | "field-validation"
  | "dialog-action-error"
  | "form-in-dialog-error"
  | "load-error"
  | "page-forbidden"
  | "loading"
  | "empty"
  | "setup-step";

const categoryBySource: Record<FeedbackSource, FeedbackCategory> = {
  "action-success": "toast",
  "action-error": "toast",
  "export-network-error": "toast",
  "field-validation": "field",
  "dialog-action-error": "dialog",
  "form-in-dialog-error": "dialog",
  "load-error": "view-state",
  "page-forbidden": "view-state",
  loading: "view-state",
  empty: "view-state",
  // Paso por seguir (p. ej. configurar 2FA para cambiar precios, dashboard-005 CA-16).
  "setup-step": "view-state",
};

export function feedbackCategory(source: FeedbackSource): FeedbackCategory {
  return categoryBySource[source];
}

export type FeedbackPresentation = {
  /** ¿Se publica en `DashboardNotifications`? */
  publishToast: boolean;
  /** ¿Se pinta el texto en el lugar donde ocurre la acción? */
  renderInline: boolean;
};

/**
 * Presentación de un error de acción (CA-19, CA-20, CA-22). Fuera de diálogos y con
 * proveedor de avisos, solo hay aviso emergente (un único texto en pantalla). Sin proveedor
 * (pruebas de componentes aisladas) el texto queda en línea para no perderse.
 */
export function actionErrorPresentation(options: {
  inDialog: boolean;
  hasProvider: boolean;
}): FeedbackPresentation {
  if (options.inDialog) return { publishToast: false, renderInline: true };

  return { publishToast: options.hasProvider, renderInline: !options.hasProvider };
}

/** Los errores por campo nunca pasan a aviso emergente (CA-21). */
export function isFieldError(source: FeedbackSource): boolean {
  return feedbackCategory(source) === "field";
}
