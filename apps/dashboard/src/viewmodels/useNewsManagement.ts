import { useEffect, useReducer } from "react";
import { adminApi } from "@/services/arca-api";
import {
  confirmNewsDialog,
  initialNewsState,
  loadNews,
  newsReducer,
  saveNews,
  type NewsViewModel,
} from "./news-management";

export function useNewsManagement(): NewsViewModel {
  const [state, dispatch] = useReducer(newsReducer, initialNewsState);

  useEffect(() => {
    void loadNews(adminApi, dispatch);
  }, []);

  return {
    state,
    actions: {
      reload: () => void loadNews(adminApi, dispatch),
      openDialog: (dialog) => dispatch({ type: "dialog-opened", dialog }),
      closeDialog: () => dispatch({ type: "dialog-closed" }),
      dismissNotice: () => dispatch({ type: "notice-dismissed" }),
      save: (values) => void saveNews(adminApi, dispatch, state.dialog, values),
      confirm: () => void confirmNewsDialog(adminApi, dispatch, state.dialog),
    },
  };
}
