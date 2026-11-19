export type NotificationTone = "success" | "error";

export type DashboardNotification = {
  id: number;
  message: string;
  tone: NotificationTone;
};

export type NotificationState = {
  lastId: number;
  visible: DashboardNotification | null;
};

export const initialNotifications: NotificationState = { lastId: 0, visible: null };

type NotificationAction =
  | { type: "publish"; message: string; tone: NotificationTone }
  | { type: "dismiss"; id: number };

export function notificationsReducer(state: NotificationState, action: NotificationAction): NotificationState {
  if (action.type === "dismiss") {
    return state.visible?.id === action.id ? { ...state, visible: null } : state;
  }

  const item = {
    id: state.lastId + 1,
    message: action.message,
    tone: action.tone,
  };

  return { lastId: item.id, visible: item };
}
