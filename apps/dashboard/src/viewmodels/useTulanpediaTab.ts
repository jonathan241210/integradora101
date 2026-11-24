import { useCallback, useEffect, useState } from "react";
import {
  leaveTulanpediaUrl,
  readTulanpediaTab,
  syncTulanpediaUrl,
  type TulanpediaTab,
} from "./tulanpedia-tab";

/**
 * ViewModel de las pestañas de TulanPedia (CA-63). La pestaña inicial sale de
 * la URL; cada cambio usa `history.replaceState` y al desmontar se quitan
 * `section` y `tab`. No guarda la pestaña en el navegador (RN-10).
 */
export function useTulanpediaTab(focusTab: TulanpediaTab | null = null, focusNonce = 0) {
  const [tab, setTab] = useState<TulanpediaTab>(() => focusTab ?? readTulanpediaTab(window.location.search));

  const select = useCallback((next: TulanpediaTab) => {
    setTab(next);
    syncTulanpediaUrl(window, next);
  }, []);

  // Buscador global (CA-18): abre la pestaña que indica `kind`.
  useEffect(() => {
    if (focusTab) select(focusTab);
    // Solo con un nuevo enfoque.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNonce]);

  useEffect(() => {
    syncTulanpediaUrl(window, tab);

    return () => leaveTulanpediaUrl(window);
    // Solo al montar y desmontar: select() mantiene la URL en los cambios posteriores.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { tab, select };
}
