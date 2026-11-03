import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FormPanel } from "../components/FormPanel";
import { InlineConfirm, cancelOnEscape } from "../components/InlineConfirm";
import { createDropHandlers, ImageUploadBoxView } from "../components/ImageUploadBox";
import { applyFocus, createFocusRegistry, decideFocus, triggerKey } from "../components/inline-focus";
import type { ReactElement, ReactNode } from "react";
import { createExitRelease } from "../viewmodels/inline-content";
import { EventsView } from "../views/EventsView";
import { NewsView } from "../views/NewsView";
import { UsersView } from "../views/UsersView";
import { IMAGE_SIZE_ERROR, IMAGE_TYPE_ERROR } from "../viewmodels/image-field";
import {
  chooseContentImage,
  removeContentImage,
  startContentEdit,
  cancelContentEdit,
  visibleImageUrl,
} from "../viewmodels/inline-content";
import {
  confirmEventAction,
  eventsConfig,
  eventsReducer,
  getEventConfirmation,
  initialEventsState,
  saveEvent,
  type EventsState,
  type EventsViewModel,
} from "../viewmodels/events-management";
import {
  confirmNewsAction,
  getNewsConfirmation,
  initialNewsState,
  newsConfig,
  newsReducer,
  saveNews,
  type NewsState,
  type NewsViewModel,
} from "../viewmodels/news-management";
import { inlineListReducer, type InlineListState } from "../viewmodels/inline-list";
import {
  confirmStaffAction,
  getStaffConfirmation,
  emptyStaffForm,
  initialStaffState,
  saveStaffAccount,
  staffAccountsReducer,
  staffFormFromAccount,
  type StaffAccountsViewModel,
  type StaffAction,
  type StaffState,
} from "../viewmodels/staff-accounts";
import {
  apiError,
  createAdminApiMock,
  createHarness,
  createPreviewMock,
  eventItem,
  imageFile,
  newsItem,
  staffAccount,
  staffOptions,
} from "./admin-fixtures";

const srcDirectory = fileURLToPath(new URL("..", import.meta.url));
const styles = readFileSync(`${srcDirectory}styles.css`, "utf8");

const newsActions = {
  reload: vi.fn(), dismissNotice: vi.fn(), toggleForm: vi.fn(), changeForm: vi.fn(), chooseImage: vi.fn(),
  removeImage: vi.fn(), startEdit: vi.fn(), cancelEdit: vi.fn(), submit: vi.fn(), openAction: vi.fn(),
  closeAction: vi.fn(), confirmAction: vi.fn(),
} as NewsViewModel["actions"];
const eventActions = newsActions as unknown as EventsViewModel["actions"];
const staffActions: StaffAccountsViewModel["actions"] = {
  changeQuery: vi.fn(), reload: vi.fn(), dismissNotice: vi.fn(), toggleForm: vi.fn(), changeForm: vi.fn(),
  changeDepartment: vi.fn(), startEdit: vi.fn(), cancelEdit: vi.fn(), submit: vi.fn(), openAction: vi.fn(),
  closeAction: vi.fn(), confirmAction: vi.fn(),
};

const savedNews = newsItem({ image_url: "https://zoo.test/storage/news/a.png" });
const savedEvent = eventItem({ image_url: "https://zoo.test/storage/events/b.webp" });

function newsReady(): NewsState {
  return { ...initialNewsState, status: "ready", items: [savedNews, newsItem({ id: 12, title: "Borrador", is_active: false })] };
}
function eventsReady(): EventsState {
  return { ...initialEventsState, status: "ready", items: [savedEvent, eventItem({ id: 22, name: "Taller", is_active: true })] };
}
function staffReady(overrides: Partial<StaffState> = {}): StaffState {
  return {
    ...initialStaffState,
    status: "ready",
    items: [staffAccount(), staffAccount({ id: 8, full_name: "Luis Soto", is_active: false })],
    meta: { current_page: 1, last_page: 1, per_page: 25, total: 2 },
    options: staffOptions,
    ...overrides,
  };
}
const renderNews = (state = newsReady()) => renderToStaticMarkup(<NewsView state={state} actions={newsActions} />);
const renderEvents = (state = eventsReady()) => renderToStaticMarkup(<EventsView state={state} actions={eventActions} />);
const renderUsers = (state = staffReady()) => renderToStaticMarkup(<UsersView state={state} actions={staffActions} />);

describe("CA-01 inline-content-forms", () => {
  it("Noticias, Eventos y Usuarios muestran el formulario fijo sin ventana emergente", () => {
    const views = [
      renderNews(),
      renderNews({ ...newsReady(), pendingAction: { type: "delete", id: 11 } }),
      renderEvents(),
      renderEvents({ ...eventsReady(), pendingAction: { type: "status", id: 21 } }),
      renderUsers(),
      renderUsers(staffReady({ pendingAction: { type: "reset-password", id: 7 } })),
    ];

    for (const markup of views) {
      expect(markup).toContain("<form");
      expect(markup).toContain("form-panel");
      expect(markup).not.toContain("<dialog");
      expect(markup).not.toContain("form-dialog");
      expect(markup).not.toContain("confirm-dialog");
    }
    expect(renderNews()).toContain('for="news-title"');
    expect(renderEvents()).toContain('for="event-name"');
    expect(renderUsers()).toContain('for="staff-first_name"');
    // El formulario va antes de la lista.
    expect(renderNews().indexOf("<form")).toBeLessThan(renderNews().indexOf("content-card-grid"));
  });
});

describe("CA-02 inline-content-forms", () => {
  it("Editar carga la noticia y el evento en el formulario con su imagen actual y «Cancelar edición»", () => {
    const news = createHarness(newsReducer, newsReady());
    const events = createHarness(eventsReducer, eventsReady());
    const preview = createPreviewMock();

    startContentEdit(newsConfig, news.state, news.dispatch, preview, savedNews);
    startContentEdit(eventsConfig, events.state, events.dispatch, preview, savedEvent);
    const newsMarkup = renderNews(news.state);
    const eventsMarkup = renderEvents(events.state);

    expect(newsMarkup).toContain("Editar noticia: Nace una cría de jaguar");
    expect(newsMarkup).toContain('value="Nace una cría de jaguar"');
    expect(newsMarkup).toContain('src="https://zoo.test/storage/news/a.png"');
    expect(newsMarkup).toContain("Cancelar edición");
    expect(newsMarkup).toContain("Guardar cambios");
    expect(eventsMarkup).toContain("Editar evento: Noche de safari");
    expect(eventsMarkup).toContain('src="https://zoo.test/storage/events/b.webp"');
    expect(eventsMarkup).toContain("Cancelar edición");

    cancelContentEdit(newsConfig, news.state, news.dispatch, preview);
    expect(news.state.editing).toBeNull();
    expect(news.state.form.title).toBe("");
    expect(renderNews(news.state)).not.toContain("Cancelar edición");
  });

  it("en Usuarios carga la cuenta con el correo en solo lectura y vuelve al alta al cancelar", () => {
    const account = staffAccount();
    const h = createHarness<StaffState, StaffAction>(staffAccountsReducer, staffReady());

    h.dispatch({ type: "edit-started", item: account, form: staffFormFromAccount(account) });
    const markup = renderUsers(h.state);

    expect(markup).toContain("Editar usuario: Ana López Pérez");
    expect(markup).toMatch(/readOnly=""/);
    expect(markup).toContain("Cancelar edición");

    h.dispatch({ type: "edit-cancelled", form: { ...h.state.form, first_name: "", email: "" } });
    expect(h.state.editing).toBeNull();
    expect(renderUsers(h.state)).not.toContain("Cancelar edición");
  });
});

describe("CA-03 inline-content-forms", () => {
  it("FormPanel expone aria-expanded y aria-controls, está expandido y es un botón (Enter y Espacio)", () => {
    const open = renderToStaticMarkup(
      <FormPanel id="demo" title="Panel" expanded onToggle={() => undefined}>
        <input defaultValue="escrito" />
      </FormPanel>,
    );
    const closed = renderToStaticMarkup(
      <FormPanel id="demo" title="Panel" expanded={false} onToggle={() => undefined}>
        <input defaultValue="escrito" />
      </FormPanel>,
    );

    expect(open).toMatch(/<button[^>]*type="button"[^>]*aria-expanded="true"[^>]*aria-controls="demo-content"/);
    expect(open).toContain('id="demo-content"');
    expect(open).not.toMatch(/id="demo-content"[^>]*hidden/);
    expect(closed).toContain('aria-expanded="false"');
    // Minimizado: oculto con `hidden`, pero los controles siguen montados.
    expect(closed).toMatch(/id="demo-content"[^>]*hidden=""/);
    expect(closed).toContain('value="escrito"');
  });

  it("el estado vive en el ViewModel: expandido por defecto, alterna sin perder lo escrito y la lista sigue visible", () => {
    const h = createHarness(newsReducer, newsReady());

    expect(h.state.formExpanded).toBe(true);
    h.dispatch({ type: "form-changed", changes: { title: "Borrador de título" } });
    h.dispatch({ type: "panel-toggled" });

    const markup = renderNews(h.state);

    expect(h.state.formExpanded).toBe(false);
    expect(h.state.form.title).toBe("Borrador de título");
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('value="Borrador de título"');
    expect(markup).toContain("Nace una cría de jaguar");

    h.dispatch({ type: "panel-toggled" });
    expect(h.state.formExpanded).toBe(true);
    for (const markupOf of [renderEvents(), renderUsers()]) {
      expect(markupOf).toContain('aria-expanded="true"');
      expect(markupOf).toMatch(/aria-controls="(event|staff)-form-content"/);
    }
  });
});

describe("CA-04 inline-content-forms", () => {
  it("la caja de imagen es un control de archivo etiquetado con formatos y límite enlazados", () => {
    for (const [markup, id] of [[renderNews(), "news-image"], [renderEvents(), "event-image"]] as const) {
      expect(markup).toContain('class="upload-box"');
      expect(markup).toContain(`for="${id}-input"`);
      expect(markup).toMatch(new RegExp(`<input[^>]*id="${id}-input"[^>]*type="file"|<input[^>]*type="file"[^>]*id="${id}-input"`));
      expect(markup).toContain("JPG, PNG o WebP · máximo 5 MB");
      expect(markup).toContain(`aria-describedby="${id}-help"`);
      expect(markup).toContain(`id="${id}-help"`);
      expect(markup).toContain('accept=".jpg,.jpeg,.png,.webp');
    }
    // Indicación visual mientras se arrastra (clase definida con tokens).
    expect(styles).toMatch(/\.upload-box--dragging\s*\{[^}]*var\(--primary\)/s);
  });

  it("arrastrar y soltar usa dragover, dragleave y drop nativos y entrega el archivo", () => {
    const onSelect = vi.fn();
    const setDragging = vi.fn();
    const handlers = createDropHandlers({ onSelect, setDragging });
    const preventDefault = vi.fn();
    const photo = imageFile();

    handlers.onDragOver({ preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(setDragging).toHaveBeenLastCalledWith(true);

    handlers.onDragLeave();
    expect(setDragging).toHaveBeenLastCalledWith(false);

    handlers.onDrop({ preventDefault, dataTransfer: { files: [photo] } });
    expect(setDragging).toHaveBeenLastCalledWith(false);
    expect(onSelect).toHaveBeenCalledWith(photo);

    handlers.onDrop({ preventDefault, dataTransfer: { files: [] } });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("el componente aplica .upload-box--dragging en dragover y lo quita en dragleave y drop", () => {
    let dragging = false;
    const handlers = createDropHandlers({ onSelect: vi.fn(), setDragging: (value) => (dragging = value) });
    const box = () =>
      ImageUploadBoxView({
        id: "news-image",
        previewUrl: "",
        previewAlt: "",
        error: "",
        dragging,
        handlers,
        onSelect: vi.fn(),
        onRemove: vi.fn(),
      });
    const label = (): ReactElement<Record<string, (event?: unknown) => void> & { className: string }> => {
      const root = box() as ReactElement<{ children: ReactNode }>;

      return (root.props.children as ReactElement[])[0] as never;
    };
    const preventDefault = vi.fn();

    expect(label().props.className).toBe("upload-box");

    // El evento sale del propio elemento <label>, no de un manejador aparte.
    label().props.onDragOver({ preventDefault });
    expect(label().props.className).toBe("upload-box upload-box--dragging");
    expect(renderToStaticMarkup(box())).toContain("Suelta la imagen aquí");

    label().props.onDragLeave();
    expect(label().props.className).toBe("upload-box");

    label().props.onDragOver({ preventDefault });
    label().props.onDrop({ preventDefault, dataTransfer: { files: [] } });
    expect(label().props.className).toBe("upload-box");
  });

  it("al elegir o soltar un archivo válido muestra la vista previa local y no sube nada", () => {
    const api = createAdminApiMock();
    const preview = createPreviewMock();
    const h = createHarness(newsReducer, newsReady());
    const photo = imageFile();

    chooseContentImage(h.state, h.dispatch, preview, photo);
    const markup = renderNews(h.state);

    expect(preview.create).toHaveBeenCalledWith(photo);
    expect(h.state.form.image.file).toBe(photo);
    expect(markup).toContain('src="blob:preview-1"');
    expect(markup).toContain("Quitar imagen");
    expect(api.news.create).not.toHaveBeenCalled();

    // Un segundo archivo libera la vista previa anterior.
    chooseContentImage(h.state, h.dispatch, preview, imageFile("otra.webp", "image/webp"));
    expect(preview.revoke).toHaveBeenCalledWith("blob:preview-1");
  });
});

describe("CA-05 inline-content-forms", () => {
  it.each([
    ["tipo no válido", imageFile("doc.gif", "image/gif"), IMAGE_TYPE_ERROR],
    ["archivo PDF", imageFile("doc.pdf", "application/pdf"), IMAGE_TYPE_ERROR],
    ["más de 5 MB", imageFile("grande.png", "image/png", 5 * 1024 * 1024 + 1), IMAGE_SIZE_ERROR],
  ])("%s: no se adjunta y la caja de imagen muestra el error en español", (_name, file, message) => {
    const preview = createPreviewMock();
    const news = createHarness(newsReducer, newsReady());
    const events = createHarness(eventsReducer, eventsReady());

    chooseContentImage(news.state, news.dispatch, preview, file);
    chooseContentImage(events.state, events.dispatch, preview, file);

    expect(news.state.form.image.file).toBeNull();
    expect(events.state.form.image.file).toBeNull();
    expect(preview.create).not.toHaveBeenCalled();
    expect(renderNews(news.state)).toContain(message);
    expect(renderNews(news.state)).toMatch(/id="news-image-file-error"[^>]*role="alert"|role="alert"[^>]*id="news-image-file-error"/);
    expect(renderEvents(events.state)).toContain(message);
  });

  it("acepta exactamente 5 MB en JPG, PNG y WebP", () => {
    const preview = createPreviewMock();
    const h = createHarness(newsReducer, newsReady());

    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      chooseContentImage(h.state, h.dispatch, preview, imageFile("f", type, 5 * 1024 * 1024));
      expect(h.state.form.image.error).toBe("");
      expect(h.state.form.image.file).not.toBeNull();
    }
  });
});

describe("CA-06 inline-content-forms", () => {
  it("«Quitar imagen» borra la vista previa y al guardar envía remove_image verdadero", async () => {
    const api = createAdminApiMock();
    const preview = createPreviewMock();
    const h = createHarness(newsReducer, newsReady());

    startContentEdit(newsConfig, h.state, h.dispatch, preview, savedNews);
    expect(visibleImageUrl(h.state.editing, h.state.form.image)).toBe(savedNews.image_url);

    removeContentImage(h.state, h.dispatch, preview);
    expect(visibleImageUrl(h.state.editing, h.state.form.image)).toBe("");
    expect(renderNews(h.state)).not.toContain("Quitar imagen");

    await saveNews(api, h.dispatch, h.state, preview);

    expect(api.news.update.mock.calls[0][1]).toMatchObject({ remove_image: true });
    expect(api.news.update.mock.calls[0][1]).not.toHaveProperty("image");
  });

  it("un archivo nuevo tras quitar sustituye la imagen y remove_image no se envía; sin imagen guardada no se marca", async () => {
    const api = createAdminApiMock();
    const preview = createPreviewMock();
    const h = createHarness(eventsReducer, eventsReady());
    const photo = imageFile();

    startContentEdit(eventsConfig, h.state, h.dispatch, preview, savedEvent);
    removeContentImage(h.state, h.dispatch, preview);
    expect(h.state.form.image.removeImage).toBe(true);

    chooseContentImage(h.state, h.dispatch, preview, photo);
    expect(h.state.form.image.removeImage).toBe(false);

    await saveEvent(api, h.dispatch, h.state, preview);
    expect(api.events.update.mock.calls[0][1]).toMatchObject({ image: photo });
    expect(api.events.update.mock.calls[0][1]).not.toHaveProperty("remove_image");

    const plain = createHarness(eventsReducer, eventsReady());

    startContentEdit(eventsConfig, plain.state, plain.dispatch, preview, eventItem());
    removeContentImage(plain.state, plain.dispatch, preview);
    expect(plain.state.form.image.removeImage).toBe(false);
  });
});

describe("CA-07 inline-content-forms", () => {
  it("un 422 muestra cada mensaje junto a su campo, incluido image, y conserva lo escrito, el archivo y la edición", async () => {
    const api = createAdminApiMock();
    const preview = createPreviewMock();
    const errors = {
      name: ["El nombre es obligatorio."],
      image: ["La imagen debe ser un archivo JPG, PNG o WebP."],
    };
    api.events.update.mockRejectedValueOnce(apiError(422, "Los datos no son válidos.", errors));
    api.news.create.mockRejectedValueOnce(
      apiError(422, "Los datos no son válidos.", { image: ["La imagen no debe pesar más de 5 MB."] }),
    );
    const events = createHarness(eventsReducer, eventsReady());
    const news = createHarness(newsReducer, newsReady());
    const photo = imageFile();

    startContentEdit(eventsConfig, events.state, events.dispatch, preview, savedEvent);
    chooseContentImage(events.state, events.dispatch, preview, photo);
    chooseContentImage(news.state, news.dispatch, preview, photo);
    news.dispatch({ type: "form-changed", changes: { title: "Texto" } });
    await saveEvent(api, events.dispatch, events.state, preview);
    await saveNews(api, news.dispatch, news.state, preview);
    const eventsMarkup = renderEvents(events.state);
    const newsMarkup = renderNews(news.state);

    expect(events.state.editing).toBe(savedEvent);
    expect(events.state.form.image.file).toBe(photo);
    expect(news.state.form.title).toBe("Texto");
    expect(news.state.form.image.file).toBe(photo);
    expect(eventsMarkup).toContain("El nombre es obligatorio.");
    expect(eventsMarkup).toContain('id="event-name-error"');
    expect(eventsMarkup).toContain("La imagen debe ser un archivo JPG, PNG o WebP.");
    expect(newsMarkup).toContain("La imagen no debe pesar más de 5 MB.");
  });

  it("en Usuarios conserva lo escrito y no sale del modo de edición", async () => {
    const api = createAdminApiMock();
    const account = staffAccount();
    api.users.update.mockRejectedValueOnce(apiError(422, "No válido.", { role: ["Rol no asignable."] }));
    const h = createHarness<StaffState, StaffAction>(staffAccountsReducer, staffReady());

    h.dispatch({ type: "edit-started", item: account, form: staffFormFromAccount(account) });
    h.dispatch({ type: "form-changed", changes: { first_name: "Mariana" } });
    const { saveStaffAccount } = await import("../viewmodels/staff-accounts");
    await saveStaffAccount(api, h.dispatch, h.state, async () => undefined);

    expect(h.state.editing).toBe(account);
    expect(h.state.form.first_name).toBe("Mariana");
    expect(renderUsers(h.state)).toContain("Rol no asignable.");
  });
});

describe("CA-08 inline-content-forms", () => {
  it("Eliminar abre una confirmación en línea en la tarjeta que nombra el elemento y su efecto; solo Confirmar llama a la API", async () => {
    const api = createAdminApiMock();
    const preview = createPreviewMock();
    const news = createHarness(newsReducer, newsReady());
    const events = createHarness(eventsReducer, eventsReady());

    news.dispatch({ type: "action-opened", action: { type: "delete", id: 11 } });
    events.dispatch({ type: "action-opened", action: { type: "delete", id: 21 } });
    const newsMarkup = renderNews(news.state);
    const eventsMarkup = renderEvents(events.state);

    expect(newsMarkup).toContain("¿Eliminar la noticia «Nace una cría de jaguar»?");
    expect(newsMarkup).toContain("su imagen se borrará del servidor");
    expect(newsMarkup).toContain("dejará de mostrarse en la lista");
    expect(eventsMarkup).toContain("¿Eliminar el evento «Noche de safari»?");
    expect(eventsMarkup).toContain("su imagen se borrará del servidor");
    expect(newsMarkup).toContain(">Confirmar<");
    expect(newsMarkup).toContain(">Cancelar<");
    expect(api.news.remove).not.toHaveBeenCalled();

    news.dispatch({ type: "action-closed" });
    expect(api.news.remove).not.toHaveBeenCalled();
    expect(renderNews(news.state)).not.toContain("¿Eliminar la noticia");

    news.dispatch({ type: "action-opened", action: { type: "delete", id: 11 } });
    await confirmNewsAction(api, news.dispatch, news.state, preview);
    await confirmEventAction(api, events.dispatch, events.state, preview);
    expect(api.news.remove).toHaveBeenCalledWith(11);
    expect(api.events.remove).toHaveBeenCalledWith(21);
  });

  it("en Usuarios la confirmación explica la baja lógica y solo Confirmar llama a la API", async () => {
    const api = createAdminApiMock();
    const h = createHarness<StaffState, StaffAction>(staffAccountsReducer, staffReady());

    h.dispatch({ type: "action-opened", action: { type: "delete", id: 7 } });
    const markup = renderUsers(h.state);

    expect(markup).toContain("¿Eliminar la cuenta de Ana López Pérez?");
    expect(markup).toContain("baja lógica");
    expect(api.users.remove).not.toHaveBeenCalled();

    await confirmStaffAction(api, h.dispatch, h.state, "", async () => undefined);
    expect(api.users.remove).toHaveBeenCalledWith(7);
  });
});

describe("CA-09 inline-content-forms", () => {
  it("Activar y Desactivar piden la misma confirmación con su efecto y solo al confirmar llaman a la API", async () => {
    const api = createAdminApiMock();
    const preview = createPreviewMock();
    const news = createHarness(newsReducer, newsReady());
    const events = createHarness(eventsReducer, eventsReady());
    const users = createHarness<StaffState, StaffAction>(staffAccountsReducer, staffReady());

    news.dispatch({ type: "action-opened", action: { type: "status", id: 11 } });
    events.dispatch({ type: "action-opened", action: { type: "status", id: 21 } });
    users.dispatch({ type: "action-opened", action: { type: "status", id: 8 } });

    expect(renderNews(news.state)).toContain("¿Desactivar la noticia «Nace una cría de jaguar»?");
    expect(renderEvents(events.state)).toContain("¿Activar el evento «Noche de safari»?");
    expect(renderUsers(users.state)).toContain("¿Activar la cuenta de Luis Soto?");
    expect(getNewsConfirmation("status", savedNews)?.confirmLabel).toBe("Confirmar");
    expect(getEventConfirmation("status", savedEvent)?.confirmLabel).toBe("Confirmar");
    expect(getStaffConfirmation("status", staffAccount()).confirmLabel).toBe("Confirmar");
    expect(api.news.setStatus).not.toHaveBeenCalled();
    expect(api.events.setStatus).not.toHaveBeenCalled();
    expect(api.users.setStatus).not.toHaveBeenCalled();

    await confirmNewsAction(api, news.dispatch, news.state, preview);
    await confirmEventAction(api, events.dispatch, events.state, preview);
    await confirmStaffAction(api, users.dispatch, users.state, "", async () => undefined);
    expect(api.news.setStatus).toHaveBeenCalledWith(11, false);
    expect(api.events.setStatus).toHaveBeenCalledWith(21, true);
    expect(api.users.setStatus).toHaveBeenCalledWith(8, true);
  });
});

describe("CA-12 inline-content-forms", () => {
  const copy = { label: "Confirmar eliminar la noticia X", message: "¿Eliminar?", confirmLabel: "Confirmar", danger: true };

  it("la confirmación es un grupo etiquetado con Cancelar antes que Confirmar", () => {
    const markup = renderToStaticMarkup(
      <InlineConfirm copy={copy} busy={false} onConfirm={() => undefined} onCancel={() => undefined} />,
    );

    expect(markup).toContain('role="group"');
    expect(markup).toContain('aria-label="Confirmar eliminar la noticia X"');
    expect(markup.indexOf(">Cancelar<")).toBeLessThan(markup.indexOf(">Confirmar<"));
    expect(markup).not.toContain("tabindex=\"-1\"");
    expect(styles).toMatch(/\.inline-confirm:focus-within/);
  });

  it("Escape se ignora mientras hay una petición en curso", () => {
    const onCancel = vi.fn();
    const stopPropagation = vi.fn();

    cancelOnEscape({ key: "Escape", stopPropagation }, onCancel, true);
    expect(onCancel).not.toHaveBeenCalled();

    cancelOnEscape({ key: "Escape", stopPropagation }, onCancel, false);
    expect(onCancel).toHaveBeenCalledOnce();

    const busyMarkup = renderToStaticMarkup(
      <InlineConfirm copy={copy} busy onConfirm={() => undefined} onCancel={() => undefined} />,
    );

    expect(busyMarkup).toContain("Procesando…");
    expect(busyMarkup.match(/disabled=""/g)).toHaveLength(2);
  });

  it("al cancelar, con Escape o al confirmar el foco vuelve al botón disparador", () => {
    const registry = createFocusRegistry();
    const status = { focus: vi.fn(), isConnected: true };
    const remove = { focus: vi.fn(), isConnected: true };
    const notice = { focus: vi.fn(), isConnected: true };
    const elements = { registry, notice, firstField: null };

    registry.register(triggerKey({ type: "status", id: 11 }))(status);
    registry.register(triggerKey({ type: "delete", id: 11 }))(remove);

    // Cancelar y Escape cierran la acción sin aviso: el foco vuelve al disparador.
    const cancelled = decideFocus({
      previous: { type: "status", id: 11 }, current: null, hasNotice: false, editingChanged: false,
    });

    expect(cancelled).toEqual({ kind: "trigger", key: "11:status" });
    expect(applyFocus(cancelled, elements)).toBe(true);
    expect(status.focus).toHaveBeenCalledOnce();

    // Confirmar activar/desactivar: la tarjeta sigue, el foco vuelve al disparador.
    applyFocus(
      decideFocus({ previous: { type: "status", id: 11 }, current: null, hasNotice: true, editingChanged: false }),
      elements,
    );
    expect(status.focus).toHaveBeenCalledTimes(2);

    // Confirmar eliminar: la tarjeta va a desaparecer, el foco pasa al aviso.
    applyFocus(
      decideFocus({ previous: { type: "delete", id: 11 }, current: null, hasNotice: true, editingChanged: false }),
      elements,
    );
    expect(notice.focus).toHaveBeenCalledOnce();
    expect(remove.focus).not.toHaveBeenCalled();

    // Cancelar eliminar: vuelve al botón «Eliminar».
    applyFocus(
      decideFocus({ previous: { type: "delete", id: 11 }, current: null, hasNotice: false, editingChanged: false }),
      elements,
    );
    expect(remove.focus).toHaveBeenCalledOnce();
  });

  it("si el disparador ya no está en el documento el foco cae al aviso; sin aviso no hay foco", () => {
    const registry = createFocusRegistry();
    const gone = { focus: vi.fn(), isConnected: false };
    const notice = { focus: vi.fn(), isConnected: true };

    registry.register("5:status")(gone);
    expect(applyFocus({ kind: "trigger", key: "5:status" }, { registry, notice, firstField: null })).toBe(true);
    expect(gone.focus).not.toHaveBeenCalled();
    expect(notice.focus).toHaveBeenCalledOnce();
    expect(applyFocus({ kind: "trigger", key: "5:status" }, { registry, notice: null, firstField: null })).toBe(false);
    expect(decideFocus({ previous: null, current: { type: "delete", id: 1 }, hasNotice: false, editingChanged: false })).toBeNull();
  });

  it("«Editar» mueve el foco al primer campo del formulario, aunque cerrara una confirmación", () => {
    const registry = createFocusRegistry();
    const firstField = { focus: vi.fn(), isConnected: true };
    const target = decideFocus({
      previous: { type: "status", id: 11 }, current: null, hasNotice: false, editingChanged: true,
    });

    expect(target).toEqual({ kind: "first-field" });
    applyFocus(target, { registry, notice: null, firstField });
    expect(firstField.focus).toHaveBeenCalledOnce();
  });

  it("Escape cancela y otras teclas no", () => {
    const onCancel = vi.fn();
    const stopPropagation = vi.fn();

    cancelOnEscape({ key: "Enter", stopPropagation }, onCancel);
    cancelOnEscape({ key: "Tab", stopPropagation }, onCancel);
    expect(onCancel).not.toHaveBeenCalled();

    cancelOnEscape({ key: "Escape", stopPropagation }, onCancel);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("solo hay una acción en línea abierta a la vez en cada sección", () => {
    const news = createHarness(newsReducer, newsReady());
    const users = createHarness<StaffState, StaffAction>(staffAccountsReducer, staffReady());

    news.dispatch({ type: "action-opened", action: { type: "delete", id: 11 } });
    news.dispatch({ type: "action-opened", action: { type: "status", id: 12 } });
    users.dispatch({ type: "action-opened", action: { type: "reset-password", id: 7 } });
    users.dispatch({ type: "action-opened", action: { type: "reset-two-factor", id: 8 } });

    expect(news.state.pendingAction).toEqual({ type: "status", id: 12 });
    expect(users.state.pendingAction).toEqual({ type: "reset-two-factor", id: 8 });
    expect(renderNews(news.state).match(/role="group"/g)).toHaveLength(1);
    expect(renderUsers(users.state).match(/role="group"/g)).toHaveLength(1);
  });
});

describe("CA-13 inline-content-forms", () => {
  it("tras un éxito recarga la lista, muestra un aviso role=status y, si era el elemento editado, vuelve al alta", async () => {
    const api = createAdminApiMock();
    const preview = createPreviewMock();
    const h = createHarness(newsReducer, newsReady());

    startContentEdit(newsConfig, h.state, h.dispatch, preview, savedNews);
    h.dispatch({ type: "action-opened", action: { type: "delete", id: 11 } });
    await confirmNewsAction(api, h.dispatch, h.state, preview);
    const markup = renderNews(h.state);

    expect(api.news.list).toHaveBeenCalledOnce();
    expect(h.state.notice).toBe("La noticia se eliminó.");
    expect(markup).toContain('role="status"');
    expect(markup).toContain("La noticia se eliminó.");
    expect(h.state.editing).toBeNull();
    expect(h.state.form.title).toBe("");
  });

  it("otra acción sobre un elemento distinto no saca el formulario del modo de edición", async () => {
    const api = createAdminApiMock();
    const preview = createPreviewMock();
    const h = createHarness(eventsReducer, eventsReady());

    startContentEdit(eventsConfig, h.state, h.dispatch, preview, savedEvent);
    h.dispatch({ type: "action-opened", action: { type: "status", id: 22 } });
    await confirmEventAction(api, h.dispatch, h.state, preview);

    expect(h.state.editing).toBe(savedEvent);
    expect(h.state.notice).toBe("El evento se desactivó.");
  });

  it("guardar un alta o una edición vuelve al modo de alta, libera la vista previa y avisa", async () => {
    const api = createAdminApiMock();
    const preview = createPreviewMock();
    const h = createHarness(eventsReducer, eventsReady());

    chooseContentImage(h.state, h.dispatch, preview, imageFile());
    h.dispatch({ type: "form-changed", changes: { name: "Nuevo", start_date: "2026-12-01" } });
    await saveEvent(api, h.dispatch, h.state, preview);

    expect(api.events.create.mock.calls[0][0]).toMatchObject({ name: "Nuevo", image: expect.any(File) });
    expect(preview.revoke).toHaveBeenCalledWith("blob:preview-1");
    expect(h.state.notice).toBe("El evento se creó correctamente.");
    expect(h.state.form.name).toBe("");
    expect(h.state.form.image.file).toBeNull();
  });
});

describe("CA-14 inline-content-forms", () => {
  it("las tarjetas muestran miniatura con alt que nombra el elemento, marcador sin imagen y estado", () => {
    const news = renderNews();
    const events = renderEvents();

    expect(news).toContain('src="https://zoo.test/storage/news/a.png"');
    expect(news).toContain('alt="Imagen de Nace una cría de jaguar"');
    expect(news).toContain("Sin imagen: Borrador");
    expect(news).toContain(">Activa</span>");
    expect(news).toContain(">Inactiva</span>");
    expect(events).toContain('alt="Imagen de Noche de safari"');
    expect(events).toContain("Sin imagen: Taller");
    expect(events).toContain(">Activo</span>");
    expect(events).toContain(">Inactivo</span>");
  });

  it("la tabla de Usuarios muestra el estado activo o inactivo en cada fila", () => {
    const users = renderUsers();

    expect(users).toContain(">Activa</span>");
    expect(users).toContain(">Inactiva</span>");
  });
});

describe("CA-15 inline-content-forms", () => {
  it.each([
    [403, "No tienes permiso para realizar esta acción."],
    [404, "El registro ya no existe."],
    [0, "No fue posible conectar con el servidor. Revisa tu conexión e intenta de nuevo."],
  ])("un error %i de una acción se muestra en la sección sin perder lista ni formulario", async (status, message) => {
    const api = createAdminApiMock();
    const preview = createPreviewMock();

    api.news.remove.mockRejectedValueOnce(status === 0 ? new TypeError("Failed to fetch") : apiError(status, message));
    const h = createHarness(newsReducer, newsReady());

    h.dispatch({ type: "form-changed", changes: { title: "Conservado" } });
    h.dispatch({ type: "action-opened", action: { type: "delete", id: 11 } });
    await confirmNewsAction(api, h.dispatch, h.state, preview);
    const markup = renderNews(h.state);

    expect(h.state.actionError).toBe(message);
    expect(h.state.items).toHaveLength(2);
    expect(h.state.form.title).toBe("Conservado");
    expect(markup).toContain(message);
    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Nace una cría de jaguar");
    expect(markup).toContain('value="Conservado"');
  });

  it("un 401 no muestra mensaje propio de la sección (lo atiende el manejador global)", async () => {
    const api = createAdminApiMock();
    const preview = createPreviewMock();

    api.events.remove.mockRejectedValueOnce(apiError(401, "Unauthenticated."));
    const h = createHarness(eventsReducer, eventsReady());

    h.dispatch({ type: "action-opened", action: { type: "delete", id: 21 } });
    await confirmEventAction(api, h.dispatch, h.state, preview);

    expect(h.state.actionError).toBe("");
    expect(h.state.formError).toBe("");
  });
});

describe("estado común de la lista en línea", () => {
  it("recargar tras guardar no cambia el formulario y un aviso se descarta", () => {
    const state = newsReady() as unknown as InlineListState<unknown, unknown>;
    const next = inlineListReducer(inlineListReducer(state, { type: "notice-dismissed" }), { type: "load-started" });

    expect(next.notice).toBe("");
    expect(next.status).toBe("loading");
  });
});

describe("CA-07 inline-content-forms · errores del formulario y de las acciones", () => {
  it("un 422 del alta no aparece en el restablecimiento de contraseña de una fila ni viceversa, y ninguno borra al otro", async () => {
    const api = createAdminApiMock();
    const reload = async () => undefined;
    const h = createHarness<StaffState, StaffAction>(staffAccountsReducer, staffReady());

    api.users.create.mockRejectedValueOnce(
      apiError(422, "No válido.", { password: ["La contraseña inicial es muy débil."] }),
    );
    api.users.resetPassword.mockRejectedValueOnce(
      apiError(422, "No válido.", { password: ["La nueva contraseña repite la anterior."] }),
    );
    h.dispatch({ type: "form-changed", changes: { first_name: "Nora", password: "123" } });
    await saveStaffAccount(api, h.dispatch, h.state, reload);

    // El 422 del alta no se cuela en el campo de la fila.
    h.dispatch({ type: "action-opened", action: { type: "reset-password", id: 7 } });
    let markup = renderUsers(h.state);

    expect(markup).toContain("La contraseña inicial es muy débil.");
    expect(markup).toContain('id="staff-password-error"');
    expect(markup).not.toContain('id="staff-7-new-password-error"');
    expect(h.state.fieldErrors.password).toEqual(["La contraseña inicial es muy débil."]);
    expect(h.state.actionFieldErrors).toEqual({});

    // El 422 de la fila no toca los del formulario.
    await confirmStaffAction(api, h.dispatch, h.state, "Repetida#1", reload);
    markup = renderUsers(h.state);

    expect(markup).toContain("La nueva contraseña repite la anterior.");
    expect(markup).toContain('id="staff-7-new-password-error"');
    expect(markup).toContain("La contraseña inicial es muy débil.");
    expect(h.state.fieldErrors.password).toEqual(["La contraseña inicial es muy débil."]);
    expect(h.state.actionFieldErrors.password).toEqual(["La nueva contraseña repite la anterior."]);
    expect(h.state.form.first_name).toBe("Nora");
    expect(h.state.pendingAction).toEqual({ type: "reset-password", id: 7 });
  });

  it("guardar el formulario no borra el error de la acción abierta y cerrarla no borra el del formulario", () => {
    const h = createHarness<StaffState, StaffAction>(staffAccountsReducer, staffReady());

    h.dispatch({ type: "action-opened", action: { type: "reset-password", id: 7 } });
    h.dispatch({ type: "save-started", scope: "action" });
    h.dispatch({ type: "save-failed", scope: "action", message: "Error de acción.", fieldErrors: { password: ["A"] } });
    h.dispatch({ type: "save-started", scope: "form" });
    h.dispatch({ type: "save-failed", scope: "form", message: "Error de formulario.", fieldErrors: { email: ["F"] } });

    expect(h.state.actionError).toBe("Error de acción.");
    expect(h.state.actionFieldErrors).toEqual({ password: ["A"] });
    expect(h.state.formError).toBe("Error de formulario.");
    expect(h.state.fieldErrors).toEqual({ email: ["F"] });

    h.dispatch({ type: "action-closed" });
    expect(h.state.actionFieldErrors).toEqual({});
    expect(h.state.fieldErrors).toEqual({ email: ["F"] });
  });

  it("al elegir un archivo válido se limpia el error 422 del campo imagen; uno inválido lo conserva", () => {
    const preview = createPreviewMock();
    const h = createHarness(newsReducer, {
      ...newsReady(),
      fieldErrors: { image: ["La imagen no debe pesar más de 5 MB."], title: ["Obligatorio."] },
    });

    chooseContentImage(h.state, h.dispatch, preview, imageFile("a.pdf", "application/pdf"));
    expect(h.state.fieldErrors.image).toBeDefined();

    chooseContentImage(h.state, h.dispatch, preview, imageFile());
    expect(h.state.fieldErrors.image).toBeUndefined();
    expect(h.state.fieldErrors.title).toEqual(["Obligatorio."]);
    expect(renderNews(h.state)).not.toContain("La imagen no debe pesar más de 5 MB.");
  });
});

describe("CA-13 inline-content-forms · sin doble envío", () => {
  it("edit-started, action-opened y action-closed no reinician el ocupado de una petición en curso", () => {
    const h = createHarness<StaffState, StaffAction>(staffAccountsReducer, staffReady());
    const account = staffAccount();

    h.dispatch({ type: "action-opened", action: { type: "status", id: 7 } });
    h.dispatch({ type: "save-started", scope: "action" });
    h.dispatch({ type: "edit-started", item: account, form: staffFormFromAccount(account) });
    h.dispatch({ type: "action-opened", action: { type: "delete", id: 8 } });
    h.dispatch({ type: "action-closed" });

    expect(h.state.actionBusy).toBe(true);
    expect(h.state.saving).toBe(false);
    expect(h.state.pendingAction).toEqual({ type: "status", id: 7 });

    h.dispatch({ type: "saved", scope: "action", notice: "Listo.", resetForm: null });
    expect(h.state.actionBusy).toBe(false);

    h.dispatch({ type: "save-started", scope: "form" });
    h.dispatch({ type: "edit-started", item: staffAccount({ id: 8 }), form: staffFormFromAccount(staffAccount({ id: 8 })) });
    h.dispatch({ type: "edit-cancelled", form: emptyStaffForm() });
    expect(h.state.saving).toBe(true);
    expect(h.state.editing).toBe(account);
  });

  it("los ocupados del formulario y de las acciones son independientes en el marcado", () => {
    const deleting = renderNews({ ...newsReady(), pendingAction: { type: "delete", id: 11 }, actionBusy: true });
    const saving = renderNews({ ...newsReady(), saving: true });

    // Se borra una tarjeta: el botón del formulario no dice «Guardando…».
    expect(deleting).toContain("Procesando…");
    expect(deleting).not.toContain("Guardando…");
    expect(deleting).toContain("Crear noticia");
    // Se guarda el formulario: las confirmaciones no cambian.
    expect(saving).toContain("Guardando…");
    expect(saving).not.toContain("Procesando…");
  });

  it("con una petición en curso no se lanza otra: ni guardar dos veces ni confirmar dos veces", async () => {
    const api = createAdminApiMock();
    const preview = createPreviewMock();
    const busyNews = { ...newsReady(), saving: true, actionBusy: true, pendingAction: { type: "delete" as const, id: 11 } };
    const news = createHarness(newsReducer, busyNews);
    const users = createHarness<StaffState, StaffAction>(
      staffAccountsReducer,
      staffReady({ saving: true, actionBusy: true, pendingAction: { type: "status", id: 7 } }),
    );

    expect(await saveNews(api, news.dispatch, news.state, preview)).toBe(false);
    expect(await confirmNewsAction(api, news.dispatch, news.state, preview)).toBe(false);
    expect(await confirmStaffAction(api, users.dispatch, users.state, "", async () => undefined)).toBe(false);
    expect(await saveStaffAccount(api, users.dispatch, users.state, async () => undefined)).toBe(false);
    expect(api.news.create).not.toHaveBeenCalled();
    expect(api.news.remove).not.toHaveBeenCalled();
    expect(api.users.setStatus).not.toHaveBeenCalled();
    expect(api.users.create).not.toHaveBeenCalled();
    expect(news.actions).toHaveLength(0);
  });

  it("una confirmación en curso desactiva sus botones", () => {
    const markup = renderUsers(staffReady({ pendingAction: { type: "status", id: 7 }, actionBusy: true }));

    expect(markup).toContain("Procesando…");
    expect(markup).not.toContain("Guardando…");
  });
});

describe("RN-04 inline-content-forms · vista previa al salir", () => {
  it("al salir de la sección se libera la vista previa vigente, no la del montaje", () => {
    const preview = createPreviewMock();
    const h = createHarness(newsReducer, newsReady());
    const release = createExitRelease(() => h.state, preview);

    // Al montar no había imagen; luego se elige una.
    chooseContentImage(h.state, h.dispatch, preview, imageFile());
    expect(preview.revoke).not.toHaveBeenCalled();

    release();
    expect(preview.revoke).toHaveBeenCalledWith("blob:preview-1");
  });

  it("sin vista previa no revoca nada", () => {
    const preview = createPreviewMock();

    createExitRelease(() => initialNewsState, preview)();
    expect(preview.revoke).not.toHaveBeenCalled();
  });
});

describe("CA-08 inline-content-forms · texto de la confirmación de eliminar", () => {
  it("menciona el borrado de la imagen solo si el elemento tiene imagen", () => {
    const withImage = getNewsConfirmation("delete", savedNews)?.message ?? "";
    const without = getNewsConfirmation("delete", newsItem({ image_url: null }))?.message ?? "";
    const eventWith = getEventConfirmation("delete", savedEvent)?.message ?? "";
    const eventWithout = getEventConfirmation("delete", eventItem({ image_url: null }))?.message ?? "";

    expect(withImage).toContain("su imagen se borrará del servidor");
    expect(eventWith).toContain("su imagen se borrará del servidor");
    expect(without).not.toContain("imagen");
    expect(eventWithout).not.toContain("imagen");
    expect(without).toMatch(/portal público\.$/);
  });

  it("el error de una acción se muestra dentro de la tarjeta abierta y no se duplica arriba", () => {
    const news = renderNews({ ...newsReady(), pendingAction: { type: "delete", id: 11 }, actionError: "No se pudo eliminar." });
    const events = renderEvents({ ...eventsReady(), pendingAction: { type: "status", id: 21 }, actionError: "No se pudo cambiar." });
    const noPending = renderNews({ ...newsReady(), actionError: "No se pudo actualizar la lista." });

    expect(news.match(/No se pudo eliminar\./g)).toHaveLength(1);
    expect(events.match(/No se pudo cambiar\./g)).toHaveLength(1);
    expect(noPending.match(/No se pudo actualizar la lista\./g)).toHaveLength(1);
  });
});
