import { useEffect, useReducer, useRef } from "react";
import { adminApi } from "@/services/arca-api";
import { useRunProtected } from "./step-up-context";
import {
  enclosureQrReducer,
  generateEnclosureQr,
  initialEnclosureQrState,
  loadEnclosureQr,
  regenerateEnclosureQr,
  type EnclosureQrApi,
  type EnclosureQrCallbacks,
  type EnclosureQrIntent,
  type EnclosureQrState,
} from "./enclosure-qr";

export type EnclosureQrViewModel = {
  state: EnclosureQrState;
  actions: {
    retry: () => void;
    generate: () => void;
    requestRegenerate: () => void;
    cancelRegenerate: () => void;
    confirmRegenerate: () => void;
    print: () => void;
  };
};

/**
 * ViewModel del diálogo del QR (dashboard-013). Consulta, genera y regenera
 * con `@arca/api-client` y solo conserva el código en memoria (CA-14).
 */
export function useEnclosureQr(
  enclosure: { id: number; name: string; is_active: boolean },
  intent: EnclosureQrIntent,
  callbacks: EnclosureQrCallbacks,
  api: EnclosureQrApi = adminApi,
): EnclosureQrViewModel {
  const [state, dispatch] = useReducer(enclosureQrReducer, undefined, () =>
    initialEnclosureQrState(enclosure, intent),
  );
  const started = useRef(false);
  const protect = useRunProtected();
  const latest = useRef(callbacks);

  latest.current = callbacks;
  const stable: EnclosureQrCallbacks = {
    onHasQr: (hasQr) => latest.current.onHasQr(hasQr),
    onNotFound: (message) => latest.current.onNotFound(message),
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (intent === "generate") void generateEnclosureQr(api, enclosure.id, dispatch, stable);
    else void loadEnclosureQr(api, enclosure.id, dispatch, stable);
    // Una sola carga al abrir el diálogo (CA-02, CA-04).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    state,
    actions: {
      retry: () => void loadEnclosureQr(api, enclosure.id, dispatch, stable),
      generate: () => void generateEnclosureQr(api, enclosure.id, dispatch, stable),
      requestRegenerate: () => dispatch({ type: "regenerate-requested" }),
      cancelRegenerate: () => dispatch({ type: "regenerate-cancelled" }),
      confirmRegenerate: () => void regenerateEnclosureQr(api, enclosure.id, dispatch, stable, protect),
      print: () => window.print(),
    },
  };
}
