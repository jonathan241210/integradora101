import { describeApiError } from "./api-errors";
import type { AdminApi } from "./admin-types";

/**
 * ViewModel puro del QR de un recinto (dashboard-013). El panel solo
 * presenta lo que devuelve la API (RN-01): no genera códigos ni decide cuál
 * es el activo. El código vive en memoria mientras el diálogo está abierto y
 * nunca se guarda en el navegador ni en la URL (CA-14).
 */

/** Respuesta de `api.admin.enclosures.qr` (api-020), tomada del cliente. */
export type EnclosureQrData = Awaited<ReturnType<AdminApi["enclosures"]["qr"]>>;

/** Parte del cliente de administración que usa el diálogo (api-020). */
export type EnclosureQrApi = {
  enclosures: {
    qr(id: number): Promise<EnclosureQrData>;
    generateQr(id: number): Promise<EnclosureQrData>;
    regenerateQr(id: number): Promise<EnclosureQrData>;
  };
};

/** Foco inicial pedido por el buscador (CA-18). */
export type EnclosureQrFocus = "view" | "print" | "regenerate";

/** Qué hace el diálogo al abrirse: consultar el código o generarlo (CA-02, CA-04). */
export type EnclosureQrIntent = "view" | "generate";

export const QR_TEXTS = {
  loading: "Cargando QR…",
  forbidden: "No tienes permiso para realizar esta acción.",
  notFound: "Recinto no encontrado.",
  loadError: "No pudimos cargar el QR. Inténtalo de nuevo.",
  generateError: "No pudimos generar el QR. Inténtalo de nuevo.",
  regenerateError: "No pudimos regenerar el QR. Inténtalo de nuevo.",
  regenerated: "Código QR regenerado. Imprime y coloca el nuevo.",
  inactive:
    "Este recinto está inactivo. Los visitantes no podrán escanear este código hasta que lo actives.",
  generating: "Generando QR…",
  noQr: "Este recinto aún no tiene un código QR.",
  retry: "Reintentar",
  print: "Imprimir",
  regenerate: "Regenerar QR",
  generate: "Generar QR",
  close: "Cerrar",
  badgeWithoutQr: "Sin QR",
} as const;

export const regenerateConfirmation = (name: string) => ({
  title: `¿Regenerar el QR del recinto «${name}»?`,
  message:
    "Los QR impresos anteriormente dejarán de funcionar, incluidos los escaneos pendientes de sincronizar. El progreso que los visitantes ya obtuvieron se conserva. Tendrás que imprimir y colocar el nuevo.",
  confirmLabel: "Regenerar QR",
  danger: true,
});

export const qrDialogTitle = (name: string) => `QR del recinto «${name}»`;
export const qrImageAlt = (name: string) => `Código QR del recinto ${name}`;

/** Botón de la tarjeta (CA-01): «Ver QR» con código activo y «Generar QR» sin él. */
export function qrCardButton(hasActiveQr: boolean, name: string) {
  return hasActiveQr
    ? { label: "Ver QR", ariaLabel: `Ver QR del recinto ${name}`, showBadge: false }
    : { label: "Generar QR", ariaLabel: `Generar QR del recinto ${name}`, showBadge: true };
}

/** Indicador que entrega la API en el listado (api-020 CA-14). */
export function hasActiveQr(item: { has_active_qr?: boolean }): boolean {
  return item.has_active_qr === true;
}

/** Imagen del SVG como data URI; nunca `innerHTML` (RN-03). */
export function qrImageSource(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export type EnclosureQrState = {
  status: "loading" | "ready" | "error";
  data: EnclosureQrData | null;
  /** Error de carga (con «Reintentar» salvo 403). */
  loadError: string;
  canRetry: boolean;
  /** Error de generar o regenerar; el código anterior se conserva (CA-12). */
  actionError: string;
  notice: string;
  busy: boolean;
  confirmingRegenerate: boolean;
};

export type EnclosureQrAction =
  | { type: "load-started" }
  | { type: "loaded"; data: EnclosureQrData }
  | { type: "load-failed"; message: string; canRetry: boolean }
  | { type: "operation-started" }
  | { type: "generated"; data: EnclosureQrData }
  | { type: "regenerated"; data: EnclosureQrData }
  | { type: "operation-failed"; message: string }
  | { type: "regenerate-requested" }
  | { type: "regenerate-cancelled" };

export type EnclosureQrDispatch = (action: EnclosureQrAction) => void;

export function initialEnclosureQrState(
  enclosure: { id: number; name: string; is_active: boolean },
  intent: EnclosureQrIntent,
): EnclosureQrState {
  return {
    status: intent === "generate" ? "ready" : "loading",
    data: intent === "generate" ? { enclosure, qr: null } : null,
    loadError: "",
    canRetry: false,
    actionError: "",
    notice: "",
    busy: intent === "generate",
    confirmingRegenerate: false,
  };
}

export function enclosureQrReducer(state: EnclosureQrState, action: EnclosureQrAction): EnclosureQrState {
  switch (action.type) {
    case "load-started":
      return { ...state, status: "loading", loadError: "", canRetry: false, actionError: "", notice: "" };
    case "loaded":
      return { ...state, status: "ready", data: action.data, loadError: "", busy: false };
    case "load-failed":
      return { ...state, status: "error", loadError: action.message, canRetry: action.canRetry, busy: false };
    case "operation-started":
      return { ...state, busy: true, actionError: "", notice: "", confirmingRegenerate: false };
    case "generated":
      return { ...state, status: "ready", data: action.data, busy: false, actionError: "" };
    case "regenerated":
      return { ...state, status: "ready", data: action.data, busy: false, actionError: "", notice: QR_TEXTS.regenerated };
    case "operation-failed":
      return { ...state, status: "ready", busy: false, actionError: action.message };
    case "regenerate-requested":
      return { ...state, confirmingRegenerate: true };
    case "regenerate-cancelled":
      return { ...state, confirmingRegenerate: false };
  }
}

export type EnclosureQrCallbacks = {
  /** Mantiene al día el indicador `has_active_qr` de la tarjeta sin cambiar página ni orden (CA-16). */
  onHasQr: (hasQr: boolean) => void;
  /** 404: cierra el diálogo y avisa en la sección (CA-11). */
  onNotFound: (message: string) => void;
};

function failureMessage(error: unknown, fallback: string) {
  const described = describeApiError(error);

  if (described.forbidden) return { message: QR_TEXTS.forbidden, notFound: false, forbidden: true };
  if (described.notFound) return { message: QR_TEXTS.notFound, notFound: true, forbidden: false };

  return { message: fallback, notFound: false, forbidden: false };
}

export async function loadEnclosureQr(
  api: EnclosureQrApi,
  id: number,
  dispatch: EnclosureQrDispatch,
  callbacks: EnclosureQrCallbacks,
): Promise<void> {
  dispatch({ type: "load-started" });

  try {
    const data = await api.enclosures.qr(id);

    dispatch({ type: "loaded", data });
    callbacks.onHasQr(data.qr !== null);
  } catch (error) {
    const failure = failureMessage(error, QR_TEXTS.loadError);

    if (failure.notFound) {
      callbacks.onNotFound(failure.message);

      return;
    }
    dispatch({ type: "load-failed", message: failure.message, canRetry: !failure.forbidden });
  }
}

export async function generateEnclosureQr(
  api: EnclosureQrApi,
  id: number,
  dispatch: EnclosureQrDispatch,
  callbacks: EnclosureQrCallbacks,
): Promise<void> {
  dispatch({ type: "operation-started" });

  try {
    const data = await api.enclosures.generateQr(id);

    dispatch({ type: "generated", data });
    callbacks.onHasQr(data.qr !== null);
  } catch (error) {
    const failure = failureMessage(error, QR_TEXTS.generateError);

    if (failure.notFound) {
      callbacks.onNotFound(failure.message);

      return;
    }
    dispatch({ type: "operation-failed", message: failure.message });
  }
}

export async function regenerateEnclosureQr(
  api: EnclosureQrApi,
  id: number,
  dispatch: EnclosureQrDispatch,
  callbacks: EnclosureQrCallbacks,
): Promise<void> {
  dispatch({ type: "operation-started" });

  try {
    const data = await api.enclosures.regenerateQr(id);

    dispatch({ type: "regenerated", data });
    callbacks.onHasQr(data.qr !== null);
  } catch (error) {
    const failure = failureMessage(error, QR_TEXTS.regenerateError);

    if (failure.notFound) {
      callbacks.onNotFound(failure.message);

      return;
    }
    dispatch({ type: "operation-failed", message: failure.message });
  }
}

/** Reglas de los botones del diálogo (CA-03, CA-04, CA-07). */
export function qrDialogButtons(state: EnclosureQrState) {
  const hasQr = state.data?.qr != null;

  return {
    showPrint: hasQr,
    showRegenerate: hasQr,
    showGenerate: state.status === "ready" && !hasQr,
    disabled: state.busy,
    showInactiveNotice: state.data?.enclosure.is_active === false,
  };
}
