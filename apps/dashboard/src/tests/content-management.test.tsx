import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { EventsView } from "../views/EventsView";
import { NewsView } from "../views/NewsView";
import { emptyImage, type ImagePreview } from "../viewmodels/image-field";
import {
  confirmEventAction,
  eventsReducer,
  getEventConfirmation,
  initialEventsState,
  loadEvents,
  saveEvent,
  toEventInput,
  type EventsViewModel,
} from "../viewmodels/events-management";
import { getEventsPage } from "../viewmodels/useEventsPagination";
import {
  confirmNewsAction,
  emptyNewsForm,
  getNewsConfirmation,
  initialNewsState,
  loadNews,
  newsFormFromDto,
  newsReducer,
  saveNews,
  toNewsInput,
  type NewsViewModel,
} from "../viewmodels/news-management";
import {
  apiError,
  createAdminApiMock,
  createHarness,
  createPreviewMock,
  eventItem,
  newsItem,
} from "./admin-fixtures";

const previewStub: ImagePreview = createPreviewMock();

const newsActions: NewsViewModel["actions"] = {
  reload: vi.fn(),
  dismissNotice: vi.fn(),
  toggleForm: vi.fn(),
  changeForm: vi.fn(),
  chooseImage: vi.fn(),
  removeImage: vi.fn(),
  startEdit: vi.fn(),
  cancelEdit: vi.fn(),
  submit: vi.fn(),
  openAction: vi.fn(),
  closeAction: vi.fn(),
  confirmAction: vi.fn(),
};
const eventActions = { ...newsActions } as unknown as EventsViewModel["actions"];

const readyNews = { ...initialNewsState, status: "ready" as const, items: [newsItem(), newsItem({ id: 12, title: "Borrador", is_active: false })] };
const readyEvents = { ...initialEventsState, status: "ready" as const, items: [eventItem(), eventItem({ id: 22, name: "Taller", is_active: true })] };
const pagedEvents = Array.from({ length: 9 }, (_, index) =>
  eventItem({ id: index + 1, name: `Evento ${index + 1}` }),
);

describe("CA-03 collapsible-menu-event-pagination", () => {
  it("divide eventos en grupos de cuatro sin cambiar el orden y contempla la lista vacía", () => {
    expect(getEventsPage([], 1, null)).toEqual({ page: 1, lastPage: 1, items: [] });
    expect(getEventsPage(pagedEvents.slice(0, 4), 1, null).lastPage).toBe(1);
    expect(getEventsPage(pagedEvents.slice(0, 5), 2, null).items.map((item) => item.id)).toEqual([5]);
    expect(getEventsPage(pagedEvents, 1, null).items.map((item) => item.id)).toEqual([1, 2, 3, 4]);
    expect(getEventsPage(pagedEvents, 2, null).items.map((item) => item.id)).toEqual([5, 6, 7, 8]);
    expect(getEventsPage(pagedEvents, 3, null).items.map((item) => item.id)).toEqual([9]);

    const markup = renderToStaticMarkup(<EventsView state={{ ...readyEvents, items: pagedEvents }} actions={eventActions} />);
    expect(markup).toContain("Evento 4");
    expect(markup).not.toContain("Evento 5");
    expect(markup).toContain("Página 1 de 3");
  });
});

describe("CA-04 collapsible-menu-event-pagination", () => {
  it("ajusta a la última página cuando se elimina el único evento de la última", () => {
    const page = getEventsPage(pagedEvents.slice(0, 8), 3, null);

    expect(page.page).toBe(2);
    expect(page.lastPage).toBe(2);
    expect(page.items.map((item) => item.id)).toEqual([5, 6, 7, 8]);
  });
});

describe("CA-05 collapsible-menu-event-pagination", () => {
  it("mantiene visible la confirmación aunque cambie el orden y deshabilita la paginación", () => {
    const pendingAction = { type: "delete" as const, id: 5 };
    const state = {
      ...readyEvents,
      items: pagedEvents,
      pendingAction,
      form: { ...readyEvents.form, name: "Borrador conservado" },
    };
    const markup = renderToStaticMarkup(<EventsView state={state} actions={eventActions} />);

    expect(getEventsPage(pagedEvents, 1, pendingAction).page).toBe(2);
    expect(markup).toContain("Confirmar eliminar el evento Evento 5");
    expect(markup).toContain('value="Borrador conservado"');
    expect(markup).toMatch(/<button[^>]*disabled[^>]*>Anterior<\/button>/);
    expect(markup).toMatch(/<button[^>]*disabled[^>]*>Siguiente<\/button>/);
    expect(markup).toContain("Confirma o cancela la acción para cambiar de página.");
  });

  it("permite cerrar la confirmación si el evento ya no está en la lista", () => {
    const state = { ...readyEvents, pendingAction: { type: "delete" as const, id: 999 } };
    const markup = renderToStaticMarkup(<EventsView state={state} actions={eventActions} />);

    expect(markup).toContain("El evento ya no está en la lista.");
    expect(markup).toContain("Cerrar confirmación");
  });
});

describe("CA-07 collapsible-menu-event-pagination", () => {
  it("conserva las acciones de edición y confirmación de los eventos visibles", () => {
    const markup = renderToStaticMarkup(<EventsView state={{ ...readyEvents, items: pagedEvents }} actions={eventActions} />);

    expect(markup).toContain("Editar el evento Evento 1");
    expect(markup).toContain("Eliminar el evento Evento 1");
    expect(markup).toContain("Crear evento");
  });
});

describe("CA-08 administration-sections", () => {
  it("lista noticias activas e inactivas con su estado y acciones, y el formulario fijo con imagen", () => {
    const markup = renderToStaticMarkup(<NewsView state={readyNews} actions={newsActions} />);

    expect(markup).toContain("Nace una cría de jaguar");
    expect(markup).toContain("Borrador");
    expect(markup).toContain(">Activa</span>");
    expect(markup).toContain(">Inactiva</span>");
    expect(markup).toContain("Crear noticia");
    expect(markup).toContain("Editar");
    expect(markup).toContain("Eliminar");
    expect(markup).not.toContain("Prototipo de demostración");
    expect(markup).toContain('for="news-title"');
    // dashboard-004 reemplaza el «sin campo de imagen» de dashboard-003 (RN-09).
    expect(markup).toContain('type="file"');
    expect(markup).toContain("JPG, PNG o WebP · máximo 5 MB");
    expect(markup).not.toContain("image_path");
  });

  it("lista eventos activos e inactivos con horario y el formulario fijo con imagen", () => {
    const markup = renderToStaticMarkup(<EventsView state={readyEvents} actions={eventActions} />);

    expect(markup).toContain("Noche de safari");
    expect(markup).toContain("19:00 – 22:00");
    expect(markup).toContain(">Inactivo</span>");
    expect(markup).toContain(">Activo</span>");
    expect(markup).toContain('for="event-name"');
    expect(markup).toContain('for="event-start_time"');
    expect(markup).toContain('type="file"');
  });

  it("crea, edita, cambia el estado y elimina noticias con confirmación en línea", async () => {
    const api = createAdminApiMock();
    const h = createHarness(newsReducer, readyNews);
    const item = newsItem();
    const values = {
      ...emptyNewsForm(),
      title: " Título ",
      content: "Cuerpo",
      category: "Cat",
      published_date: "2026-10-30",
    };

    h.dispatch({ type: "form-changed", changes: values });
    await saveNews(api, h.dispatch, h.state, previewStub);
    expect(api.news.create).toHaveBeenCalledWith({
      title: "Título",
      description: null,
      content: "Cuerpo",
      category: "Cat",
      published_date: "2026-10-30",
      start_date: null,
      end_date: null,
      is_active: true,
    });
    expect(h.state.notice).toBe("La noticia se creó correctamente.");

    h.dispatch({ type: "edit-started", item, form: { ...newsFormFromDto(item) } });
    await saveNews(api, h.dispatch, h.state, previewStub);
    expect(api.news.update.mock.calls[0][0]).toBe(11);
    expect(api.news.update.mock.calls[0][1]).not.toHaveProperty("is_active");

    h.dispatch({ type: "action-opened", action: { type: "status", id: 11 } });
    expect(api.news.setStatus).not.toHaveBeenCalled();
    expect(getNewsConfirmation("status", item)?.message).toContain("Nace una cría de jaguar");
    await confirmNewsAction(api, h.dispatch, h.state, previewStub);
    expect(api.news.setStatus).toHaveBeenCalledWith(11, false);

    h.dispatch({ type: "action-opened", action: { type: "delete", id: 11 } });
    expect(api.news.remove).not.toHaveBeenCalled();
    await confirmNewsAction(api, h.dispatch, h.state, previewStub);
    expect(api.news.remove).toHaveBeenCalledWith(11);
    expect(api.news.list).toHaveBeenCalled();
  });

  it("crea, edita, cambia el estado y elimina eventos con confirmación en línea", async () => {
    const api = createAdminApiMock();
    const h = createHarness(eventsReducer, readyEvents);
    const item = eventItem();
    const values = {
      name: "Taller",
      description: "",
      location: "",
      start_date: "2026-11-01",
      end_date: "",
      start_time: "10:00",
      end_time: "",
      is_active: false,
      image: emptyImage(),
    };

    expect(toEventInput(values, true)).toEqual({
      name: "Taller",
      description: null,
      location: null,
      start_date: "2026-11-01",
      end_date: null,
      start_time: "10:00",
      end_time: null,
      is_active: false,
    });
    expect(toEventInput(values, false)).not.toHaveProperty("is_active");

    h.dispatch({ type: "form-changed", changes: values });
    await saveEvent(api, h.dispatch, h.state, previewStub);
    expect(api.events.create).toHaveBeenCalledOnce();

    h.dispatch({ type: "edit-started", item, form: values });
    await saveEvent(api, h.dispatch, h.state, previewStub);
    expect(api.events.update.mock.calls[0][0]).toBe(21);

    h.dispatch({ type: "action-opened", action: { type: "status", id: 21 } });
    expect(getEventConfirmation("status", item)?.confirmLabel).toBe("Confirmar");
    await confirmEventAction(api, h.dispatch, h.state, previewStub);
    expect(api.events.setStatus).toHaveBeenCalledWith(21, true);

    h.dispatch({ type: "action-opened", action: { type: "delete", id: 21 } });
    expect(api.events.remove).not.toHaveBeenCalled();
    await confirmEventAction(api, h.dispatch, h.state, previewStub);
    expect(api.events.remove).toHaveBeenCalledWith(21);
  });

  it("muestra la validación 422 junto a cada campo y conserva lo escrito", async () => {
    const api = createAdminApiMock();
    api.news.create.mockRejectedValueOnce(
      apiError(422, "Los datos no son válidos.", { title: ["El título es obligatorio."] }),
    );
    api.events.create.mockRejectedValueOnce(
      apiError(422, "Los datos no son válidos.", { end_date: ["La fecha final debe ser posterior."] }),
    );
    const news = createHarness(newsReducer, readyNews);
    const events = createHarness(eventsReducer, readyEvents);

    events.dispatch({ type: "form-changed", changes: { name: "x", start_date: "2026-11-02", end_date: "2026-11-01" } });
    await saveNews(api, news.dispatch, news.state, previewStub);
    await saveEvent(api, events.dispatch, events.state, previewStub);
    const newsMarkup = renderToStaticMarkup(<NewsView state={news.state} actions={newsActions} />);
    const eventsMarkup = renderToStaticMarkup(<EventsView state={events.state} actions={eventActions} />);

    expect(news.state.editing).toBeNull();
    expect(events.state.form.name).toBe("x");
    expect(newsMarkup).toContain('id="news-title-error"');
    expect(newsMarkup).toContain("El título es obligatorio.");
    expect(eventsMarkup).toContain('id="event-end_date-error"');
    expect(eventsMarkup).toContain("La fecha final debe ser posterior.");
  });

  it("carga las listas de noticias y eventos y envía solo campos del contrato", async () => {
    const api = createAdminApiMock();
    const news = createHarness(newsReducer, { ...initialNewsState });
    const events = createHarness(eventsReducer, { ...initialEventsState });

    await loadNews(api, news.dispatch);
    await loadEvents(api, events.dispatch);

    expect(news.state.status).toBe("ready");
    expect(events.state.status).toBe("ready");
    expect(toNewsInput(emptyNewsForm(), true)).not.toHaveProperty("image_path");
  });
});
