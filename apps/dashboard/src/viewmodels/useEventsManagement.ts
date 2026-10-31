import { useEffect, useReducer } from "react";
import { adminApi } from "@/services/arca-api";
import {
  confirmEventDialog,
  eventsReducer,
  initialEventsState,
  loadEvents,
  saveEvent,
  type EventsViewModel,
} from "./events-management";

export function useEventsManagement(): EventsViewModel {
  const [state, dispatch] = useReducer(eventsReducer, initialEventsState);

  useEffect(() => {
    void loadEvents(adminApi, dispatch);
  }, []);

  return {
    state,
    actions: {
      reload: () => void loadEvents(adminApi, dispatch),
      openDialog: (dialog) => dispatch({ type: "dialog-opened", dialog }),
      closeDialog: () => dispatch({ type: "dialog-closed" }),
      dismissNotice: () => dispatch({ type: "notice-dismissed" }),
      save: (values) => void saveEvent(adminApi, dispatch, state.dialog, values),
      confirm: () => void confirmEventDialog(adminApi, dispatch, state.dialog),
    },
  };
}
