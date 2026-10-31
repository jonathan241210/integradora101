import type { AdminApi, EnclosureDto } from "./admin-types";
import {
  initialManagedListState,
  loadManagedList,
  managedListReducer,
  runOperation,
  type ManagedListAction,
  type ManagedListState,
} from "./managed-list";

export type EnclosureDialog =
  | { kind: "create" }
  | { kind: "rename"; item: EnclosureDto };

export type EnclosuresState = ManagedListState<EnclosureDto, EnclosureDialog>;
export type EnclosuresAction = ManagedListAction<EnclosureDto, EnclosureDialog>;
export type EnclosuresDispatch = (action: EnclosuresAction) => void;

export const initialEnclosuresState: EnclosuresState =
  initialManagedListState<EnclosureDto, EnclosureDialog>();

export function enclosuresReducer(
  state: EnclosuresState,
  action: EnclosuresAction,
): EnclosuresState {
  return managedListReducer(state, action);
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

export type EnclosuresViewModel = {
  state: EnclosuresState;
  actions: {
    reload: () => void;
    openDialog: (dialog: EnclosureDialog) => void;
    closeDialog: () => void;
    dismissNotice: () => void;
    save: (name: string) => void;
  };
};
