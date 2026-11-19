import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  HIT_DURATION_MS,
  NOT_AVAILABLE_MESSAGE,
  hitBannerText,
  hitMessage,
  locateElement,
  searchIdOf,
  type FocusTarget,
} from "./focus-target";

export type LocateHitState = {
  /** Etiqueta flotante «Resultado de tu búsqueda: «texto»»; `null` si no hay resaltado. */
  banner: string;
  /** Aviso `aria-live="polite"` «Mostrando «X» en <Sección>». */
  announcement: string;
  /** «Ese elemento ya no está disponible.» (CA-24). */
  missing: string;
};

const empty: LocateHitState = { banner: "", announcement: "", missing: "" };

/**
 * ViewModel de la ubicación visual (CA-22 a CA-24): centra el elemento
 * marcado con `data-search-id`, le pone `.search-hit` unos 4 s o hasta el
 * siguiente clic y anuncia el resultado. Si no aparece, pide recargar la lista.
 */
export function useLocateHit(
  target: FocusTarget | null,
  root: RefObject<HTMLElement | null>,
  sectionLabel: string,
  reloadList: () => void,
) {
  const [state, setState] = useState<LocateHitState>(empty);
  const releaseRef = useRef<(() => void) | null>(null);

  const clear = useCallback(() => releaseRef.current?.(), []);

  useEffect(() => {
    setState(empty);
    if (!target) return;

    const key = searchIdOf(target);
    let hit: HTMLElement | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let removeClick: (() => void) | undefined;

    const release = () => {
      hit?.classList.remove("search-hit");
      hit = null;
      clearTimeout(timer);
      removeClick?.();
      setState((current) => ({ ...current, banner: "" }));
    };

    releaseRef.current = release;

    const cancel = locateElement<HTMLElement>({
      find: () => root.current?.querySelector<HTMLElement>(`[data-search-id="${key}"]`) ?? null,
      onFound: (element) => {
        hit = element;
        element.scrollIntoView?.({ block: "center", behavior: "smooth" });
        element.classList.add("search-hit");
        setState({
          banner: hitBannerText(target.text),
          announcement: hitMessage(target.text, sectionLabel),
          missing: "",
        });
        timer = setTimeout(release, HIT_DURATION_MS);
        const onClick = () => release();
        const arm = setTimeout(() => document.addEventListener("click", onClick, { once: true }), 0);
        removeClick = () => {
          clearTimeout(arm);
          document.removeEventListener("click", onClick);
        };
      },
      isLoading: () => Boolean(root.current?.querySelector('[data-list-loading="true"]')),
      onReload: reloadList,
      onMissing: () => setState({ banner: "", announcement: NOT_AVAILABLE_MESSAGE, missing: NOT_AVAILABLE_MESSAGE }),
    });

    return () => {
      releaseRef.current = null;
      cancel();
      hit?.classList.remove("search-hit");
      clearTimeout(timer);
      removeClick?.();
    };
    // El efecto depende solo de un nuevo enfoque.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.nonce]);

  return { state, clear };
}
