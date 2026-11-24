export type NotificationTone = "success" | "error" | "info";

export type DashboardNotification = {
  id: number;
  message: string;
  tone: NotificationTone;
};

/** Cola FIFO: `visible` es el primero; el resto espera su turno (RN-14). */
export type NotificationState = {
  lastId: number;
  visible: DashboardNotification | null;
  queue: DashboardNotification[];
};

export const initialNotifications: NotificationState = { lastId: 0, visible: null, queue: [] };

type NotificationAction =
  | { type: "publish"; message: string; tone: NotificationTone }
  | { type: "dismiss"; id: number };

export function notificationsReducer(state: NotificationState, action: NotificationAction): NotificationState {
  if (action.type === "dismiss") {
    if (state.visible?.id !== action.id) return state;
    const [next = null, ...rest] = state.queue;

    return { ...state, visible: next, queue: rest };
  }

  const item = {
    id: state.lastId + 1,
    message: action.message,
    tone: action.tone,
  };

  if (state.visible === null) return { ...state, lastId: item.id, visible: item };

  return { ...state, lastId: item.id, queue: [...state.queue, item] };
}
