import { useEffect, useReducer } from "react";
import { adminApi } from "@/services/arca-api";
import {
  enclosuresReducer,
  initialEnclosuresState,
  loadEnclosures,
  saveEnclosure,
  type EnclosuresViewModel,
} from "./enclosures-management";

export function useEnclosuresManagement(): EnclosuresViewModel {
  const [state, dispatch] = useReducer(enclosuresReducer, initialEnclosuresState);

  useEffect(() => {
    void loadEnclosures(adminApi, dispatch);
  }, []);

  return {
    state,
    actions: {
      reload: () => void loadEnclosures(adminApi, dispatch),
      openDialog: (dialog) => dispatch({ type: "dialog-opened", dialog }),
      closeDialog: () => dispatch({ type: "dialog-closed" }),
      dismissNotice: () => dispatch({ type: "notice-dismissed" }),
      save: (name) => void saveEnclosure(adminApi, dispatch, state.dialog, name),
    },
  };
}
