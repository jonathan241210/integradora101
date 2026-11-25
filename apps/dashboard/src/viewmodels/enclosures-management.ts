import type { AdminApi, EnclosureAnimalDto, EnclosureDto } from "./admin-types";
import { runUnprotected, type RunProtected } from "./step-up";
import {
  initialManagedListState,
  loadManagedList,
  managedListReducer,
  runOperation,
  type ManagedListAction,
  type ManagedListState,
} from "./managed-list";

import type { ConfirmationCopy } from "./confirmation";
import { hasActiveQr, type EnclosureQrFocus, type EnclosureQrIntent } from "./enclosure-qr";
import { foldText } from "./search-tolerance";

export type EnclosureFilters = {
  name: string;
  status: "all" | "active" | "inactive";
  animals: "all" | "with" | "without";
  qr: "all" | "with" | "without";
};

export const defaultEnclosureFilters: EnclosureFilters = {
  name: "", status: "all", animals: "all", qr: "all",
};

export function filterEnclosures(items: EnclosureDto[], filters: EnclosureFilters, canManage: boolean) {
  const name = foldText(filters.name.trim());

  return items.filter((item) =>
    (!name || foldText(item.name).includes(name)) &&
    (filters.status === "all" || item.is_active === (filters.status === "active")) &&
    (filters.animals === "all" || (item.animals_count > 0) === (filters.animals === "with")) &&
    (!canManage || filters.qr === "all" || hasActiveQr(item) === (filters.qr === "with")),
  );
}

type EnclosureAnimalsDialog = { kind: "animals"; item: EnclosureDto };

export type EnclosureDialog =
  | { kind: "create" }
  | EnclosureAnimalsDialog
  | { kind: "rename"; item: EnclosureDto }
  | { kind: "status"; item: EnclosureDto }
  | { kind: "delete"; item: EnclosureDto }
  /** Diálogo del QR (dashboard-013): consulta o genera y enfoca según el buscador. */
  | { kind: "qr"; item: EnclosureDto; intent: EnclosureQrIntent; focus: EnclosureQrFocus };

const initialAnimalsState = initialManagedListState<EnclosureAnimalDto, never>();

export type EnclosuresState = ManagedListState<EnclosureDto, EnclosureDialog> & {
  animals: typeof initialAnimalsState;
};
export type EnclosuresAction =
  | ManagedListAction<EnclosureDto, EnclosureDialog>
  | { type: "animals-list-updated"; dialog: EnclosureAnimalsDialog; action: ManagedListAction<EnclosureAnimalDto, never> }
  /** Cierra el diálogo y conserva el error de la operación para mostrarlo en la sección. */
  | { type: "dialog-dismissed-keep-error" }
  /** Actualiza `has_active_qr` de la tarjeta sin recargar ni cambiar el orden (dashboard-013 CA-16). */
  | { type: "qr-status-set"; id: number; hasQr: boolean };
export type EnclosuresDispatch = (action: EnclosuresAction) => void;

export const initialEnclosuresState: EnclosuresState = {
  ...initialManagedListState<EnclosureDto, EnclosureDialog>(),
  animals: initialAnimalsState,
};

export function enclosuresReducer(
  state: EnclosuresState,
  action: EnclosuresAction,
): EnclosuresState {
  if (action.type === "animals-list-updated") {
    if (state.dialog !== action.dialog) return state;
    return { ...state, animals: managedListReducer(state.animals, action.action) };
  }

  if (action.type === "dialog-dismissed-keep-error") {
    return { ...state, dialog: null, saving: false };
  }

  if (action.type === "qr-status-set") {
    return {
      ...state,
      items: state.items.map((item) =>
        item.id === action.id ? { ...item, has_active_qr: action.hasQr } : item,
      ),
    };
  }

  const next = managedListReducer(state, action);
  return { ...next, animals: next.dialog === state.dialog ? state.animals : initialAnimalsState };
}

export function loadEnclosureAnimals(api: AdminApi, dispatch: EnclosuresDispatch, dialog: EnclosureAnimalsDialog) {
  let active = true;
  void loadManagedList<EnclosureAnimalDto, never>((action) => {
    if (active) dispatch({ type: "animals-list-updated", dialog, action });
  }, () => api.enclosures.listAnimals(dialog.item.id));

  return () => { active = false; };
}

export function loadEnclosures(
  api: AdminApi,
  dispatch: EnclosuresDispatch,
  silent = false,
): Promise<void> {
  return loadManagedList(dispatch, () => api.enclosures.list(), silent);
}

/** Crea o renombra según el diálogo abierto; el nombre repetido lo rechaza la API. */
export function saveEnclosure(
  api: AdminApi,
  dispatch: EnclosuresDispatch,
  dialog: EnclosureDialog | null,
  name: string,
): Promise<boolean> {
  const reload = () => loadEnclosures(api, dispatch, true);
  const input = { name: name.trim() };

  if (dialog?.kind === "rename") {
    const { item } = dialog;

    return runOperation(
      dispatch,
      () => api.enclosures.rename(item.id, input),
      "El recinto se renombró correctamente.",
      reload,
    );
  }

  if (dialog?.kind === "create") {
    return runOperation(
      dispatch,
      () => api.enclosures.create(input),
      "El recinto se creó correctamente.",
      reload,
    );
  }

  return Promise.resolve(false);
}

export const ENCLOSURES_PAGE_SIZE = 9;

/** Presentación: número de páginas (mínimo 1) para la cuadrícula de recintos. */
export function enclosurePageCount(total: number, size = ENCLOSURES_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / size));
}

/** Presentación: lleva cualquier página solicitada al rango válido. */
export function clampPage(page: number, lastPage: number): number {
  const wanted = Number.isFinite(page) ? Math.trunc(page) : 1;

  return Math.min(Math.max(1, wanted), Math.max(1, lastPage));
}

/** Presentación: recintos de una página, en el orden recibido de la API. */
export function enclosurePage<T>(items: T[], page: number, size = ENCLOSURES_PAGE_SIZE): T[] {
  const current = clampPage(page, enclosurePageCount(items.length, size));

  return items.slice((current - 1) * size, current * size);
}

/** Página (1-based) que contiene el recinto con ese id, o null si no está. */
export function pageOfEnclosure(
  items: { id: number }[],
  id: number,
  size = ENCLOSURES_PAGE_SIZE,
): number | null {
  const index = items.findIndex((item) => item.id === id);

  return index < 0 ? null : Math.floor(index / size) + 1;
}

export function enclosureFocusPage(items: EnclosureDto[], matchingItems: EnclosureDto[], id: number) {
  const visiblePage = pageOfEnclosure(matchingItems, id);
  if (visiblePage !== null) return { page: visiblePage, clearFilters: false };

  const catalogPage = pageOfEnclosure(items, id);
  return catalogPage === null ? null : { page: catalogPage, clearFilters: true };
}

/** Tras crear: página del primer recinto nuevo; si no hay uno nuevo, conserva la actual. */
export function pageAfterCreate(
  previous: { id: number }[],
  next: { id: number }[],
  currentPage: number,
  size = ENCLOSURES_PAGE_SIZE,
): number {
  const known = new Set(previous.map((item) => item.id));
  const created = next.find((item) => !known.has(item.id));
  const target = created ? pageOfEnclosure(next, created.id, size) : null;

  return clampPage(target ?? currentPage, enclosurePageCount(next.length, size));
}

/** «Tiene N animales asignados.» (singular con N = 1; vacío con N = 0). */
export function enclosureAnimalsWarning(count: number): string {
  if (count <= 0) return "";

  return count === 1 ? "Tiene 1 animal asignado." : `Tiene ${count} animales asignados.`;
}

/** Diálogo que abre el botón de la tarjeta: «Ver QR» consulta y «Generar QR» genera (dashboard-013 CA-01, CA-04). */
export function qrDialogForCard(item: EnclosureDto): EnclosureDialog {
  return { kind: "qr", item, intent: hasActiveQr(item) ? "view" : "generate", focus: "view" };
}

/** Textos de los diálogos de estado y eliminación (dashboard-012 CA-02 a CA-04). */
export function getEnclosureConfirmation(dialog: EnclosureDialog | null): ConfirmationCopy | null {
  if (dialog?.kind === "status") {
    if (!dialog.item.is_active) {
      return {
        title: "Activar recinto",
        message: `¿Activar el recinto «${dialog.item.name}»? Volverá a mostrarse en el portal y la app de visitantes y podrá asignarse a animales.`,
        confirmLabel: "Activar",
        danger: false,
      };
    }

    return {
      title: "Desactivar recinto",
      message: `¿Desactivar el recinto «${dialog.item.name}»? Dejará de mostrarse en el portal y la app de visitantes y no podrá asignarse a animales. No se elimina y puedes reactivarlo cuando quieras.`,
      confirmLabel: "Desactivar",
      danger: false,
    };
  }

  if (dialog?.kind === "delete") {
    const qrNotice = hasActiveQr(dialog.item) ? " Sus códigos QR dejarán de funcionar." : "";

    return {
      title: "Eliminar recinto",
      message: `¿Eliminar el recinto «${dialog.item.name}»? Desaparecerá del panel, del portal y de la app. Esta acción no se puede deshacer desde el panel.${qrNotice}`,
      confirmLabel: "Eliminar",
      danger: true,
    };
  }

  return null;
}

/** Línea de advertencia del diálogo abierto (vacía si no hay animales). */
export function getEnclosureWarning(dialog: EnclosureDialog | null): string {
  return dialog?.kind === "delete" || (dialog?.kind === "status" && dialog.item.is_active)
    ? enclosureAnimalsWarning(dialog.item.animals_count)
    : "";
}

/** Tras eliminar: la página actual, o la anterior si queda vacía. */
export function pageAfterDelete(
  items: { id: number }[],
  deletedId: number,
  currentPage: number,
  size = ENCLOSURES_PAGE_SIZE,
): number {
  const remaining = items.filter((item) => item.id !== deletedId);

  return clampPage(currentPage, enclosurePageCount(remaining.length, size));
}

async function failSafely(
  api: AdminApi,
  dispatch: EnclosuresDispatch,
  succeeded: boolean,
): Promise<boolean> {
  if (!succeeded) {
    // La lista se vuelve a cargar para mostrar el estado real (CA-06).
    await loadEnclosures(api, dispatch, true);
    dispatch({ type: "dialog-dismissed-keep-error" });
  }

  return succeeded;
}

/** Activa o desactiva un recinto con `api.admin.enclosures.setStatus` (CA-04, CA-05). */
export async function setEnclosureStatus(
  api: AdminApi,
  dispatch: EnclosuresDispatch,
  item: EnclosureDto,
  isActive: boolean,
): Promise<boolean> {
  const done = await runOperation(
    dispatch,
    () => api.enclosures.setStatus(item.id, isActive),
    isActive ? "Recinto activado." : "Recinto desactivado.",
    () => loadEnclosures(api, dispatch, true),
  );

  return failSafely(api, dispatch, done);
}

/** Elimina (borrado lógico en la API) con `api.admin.enclosures.remove`. */
export async function deleteEnclosure(
  api: AdminApi,
  dispatch: EnclosuresDispatch,
  item: EnclosureDto,
  protect: RunProtected = runUnprotected,
): Promise<boolean> {
  const done = await runOperation(
    dispatch,
    () => protect(() => api.enclosures.remove(item.id)),
    "Recinto eliminado.",
    () => loadEnclosures(api, dispatch, true),
  );

  return failSafely(api, dispatch, done);
}

export type EnclosuresViewModel = {
  canManage: boolean;
  filters: EnclosureFilters;
  total: number;
  page: number;
  pageCount: number;
  pageItems: EnclosureDto[];
  state: EnclosuresState;
  actions: {
    changeFilters: (filters: EnclosureFilters) => void;
    goToPage: (page: number) => void;
    reload: () => void;
    openDialog: (dialog: EnclosureDialog) => void;
    closeDialog: () => void;
    dismissNotice: () => void;
    save: (name: string) => void;
    /** Abre la confirmación del cambio de estado (CA-02 y CA-04). */
    toggleStatus: (item: EnclosureDto) => void;
    requestDelete: (item: EnclosureDto) => void;
    /** «Ver QR» o «Generar QR» de la tarjeta (dashboard-013 CA-01, CA-04). */
    openQr: (item: EnclosureDto) => void;
    /** Mantiene el indicador de la tarjeta al día (CA-16). */
    setHasQr: (id: number, hasQr: boolean) => void;
    /** 404 del QR: cierra el diálogo y avisa en la sección (CA-11). */
    qrNotFound: (message: string) => void;
    /** Confirma el diálogo de estado o de eliminación abierto. */
    confirm: () => void;
  };
};

/**
 * Diálogo por abrir para el recinto elegido en el buscador (dashboard-012
 * CA-37, CA-38). Solo abre la confirmación; no ejecuta nada. Un recinto
 * inactivo no abre «Desactivar» desde el buscador.
 */
export function enclosureDialogForFocus(
  items: EnclosureDto[],
  focus: { id: number; action?: string },
): EnclosureDialog | null {
  const item = items.find((enclosure) => enclosure.id === focus.id);

  if (!item) return null;
  if (focus.action === "delete") return { kind: "delete", item };
  if (focus.action === "status" && item.is_active) return { kind: "status", item };
  if (focus.action === "qr" || focus.action === "qr-print" || focus.action === "qr-regenerate") {
    const qrFocus: EnclosureQrFocus =
      focus.action === "qr-print" ? "print" : focus.action === "qr-regenerate" ? "regenerate" : "view";

    return { kind: "qr", item, intent: "view", focus: qrFocus };
  }

  return null;
}
