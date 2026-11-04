import { useEffect, useReducer, useRef, type Reducer } from "react";
import type { AdminApi } from "./admin-types";
import type { ImagePreview, ImageValue } from "./image-field";
import {
  buildContentActions,
  createExitRelease,
  contentReducer,
  initialContentState,
  loadContent,
  type ContentAction,
  type ContentConfig,
  type ContentItem,
  type ContentState,
  type ContentViewModel,
} from "./inline-content";

/**
 * Hook ViewModel común de Noticias y Eventos. Recibe el cliente y el servicio
 * de vista previa ya construidos por el hook de cada sección.
 */
export function useContentViewModel<
  Item extends ContentItem,
  Form extends { image: ImageValue },
  Input,
>(
  config: ContentConfig<Item, Form, Input>,
  api: AdminApi,
  preview: ImagePreview,
): ContentViewModel<Item, Form> {
  const [state, dispatch] = useReducer(
    contentReducer as Reducer<ContentState<Item, Form>, ContentAction<Item, Form>>,
    undefined,
    () => initialContentState<Item, Form>(config.emptyForm()),
  );
  const latest = useRef(state);

  latest.current = state;

  useEffect(() => {
    void loadContent(config, api, dispatch);
  }, [config, api]);

  // La URL de vista previa se libera al salir de la sección (RN-04).
  useEffect(() => createExitRelease(() => latest.current, preview), [preview]);

  return { state, actions: buildContentActions(config, api, preview, state, dispatch) };
}
