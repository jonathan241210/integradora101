import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { EventsView } from "../views/EventsView";
import { NewsView } from "../views/NewsView";
import {
  confirmEventDialog,
  eventsReducer,
  getEventConfirmation,
  initialEventsState,
  loadEvents,
  saveEvent,
  toEventInput,
  type EventsViewModel,
} from "../viewmodels/events-management";
import {
  confirmNewsDialog,
  getNewsConfirmation,
  initialNewsState,
  loadNews,
  newsReducer,
  saveNews,
  toNewsInput,
  emptyNewsForm,
  type NewsViewModel,
} from "../viewmodels/news-management";
import {
  apiError,
  createAdminApiMock,
  createHarness,
  eventItem,
  newsItem,
} from "./admin-fixtures";

const newsActions: NewsViewModel["actions"] = {
  reload: vi.fn(),
  openDialog: vi.fn(),
  closeDialog: vi.fn(),
  dismissNotice: vi.fn(),
  save: vi.fn(),
  confirm: vi.fn(),
};
const eventActions: EventsViewModel["actions"] = { ...newsActions } as unknown as EventsViewModel["actions"];

const readyNews = { ...initialNewsState, status: "ready" as const, items: [newsItem(), newsItem({ id: 12, title: "Borrador", is_active: false })] };
const readyEvents = { ...initialEventsState, status: "ready" as const, items: [eventItem(), eventItem({ id: 22, name: "Taller", is_active: true })] };

describe("CA-08 administration-sections", () => {
  it("lista noticias activas e inactivas con su estado y acciones, sin campo de imagen", () => {
    const list = renderToStaticMarkup(<NewsView state={readyNews} actions={newsActions} />);
    const form = renderToStaticMarkup(
      <NewsView state={{ ...readyNews, dialog: { kind: "create" } }} actions={newsActions} />,
    );

    expect(list).toContain("Nace una cría de jaguar");
    expect(list).toContain("Borrador");
    expect(list).toContain(">Activa</span>");
    expect(list).toContain(">Inactiva</span>");
    expect(list).toContain("Crear noticia");
    expect(list).toContain("Editar");
    expect(list).toContain("Eliminar");
    expect(list).not.toContain("Prototipo de demostración");
    expect(form).toContain('for="news-title"');
    expect(form).not.toContain('type="file"');
    expect(form).not.toContain("image_path");
    expect(form).not.toContain("imagen");
  });

  it("lista eventos activos e inactivos con horario y sin campo de imagen", () => {
    const list = renderToStaticMarkup(<EventsView state={readyEvents} actions={eventActions} />);
    const form = renderToStaticMarkup(
      <EventsView state={{ ...readyEvents, dialog: { kind: "create" } }} actions={eventActions} />,
    );

    expect(list).toContain("Noche de safari");
    expect(list).toContain("19:00 – 22:00");
    expect(list).toContain(">Inactivo</span>");
    expect(list).toContain(">Activo</span>");
    expect(form).toContain('for="event-name"');
    expect(form).toContain('for="event-start_time"');
    expect(form).not.toContain('type="file"');
    expect(form).not.toContain("imagen");
  });

  it("crea, edita, cambia el estado y elimina noticias con confirmación", async () => {
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

    h.dispatch({ type: "dialog-opened", dialog: { kind: "create" } });
    await saveNews(api, h.dispatch, h.state.dialog, values);
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

    h.dispatch({ type: "dialog-opened", dialog: { kind: "edit", item } });
    await saveNews(api, h.dispatch, h.state.dialog, values);
    expect(api.news.update.mock.calls[0][0]).toBe(11);
    expect(api.news.update.mock.calls[0][1]).not.toHaveProperty("is_active");

    h.dispatch({ type: "dialog-opened", dialog: { kind: "status", item } });
    expect(api.news.setStatus).not.toHaveBeenCalled();
    expect(getNewsConfirmation(h.state.dialog)?.message).toContain("Nace una cría de jaguar");
    await confirmNewsDialog(api, h.dispatch, h.state.dialog);
    expect(api.news.setStatus).toHaveBeenCalledWith(11, false);

    h.dispatch({ type: "dialog-opened", dialog: { kind: "delete", item } });
    expect(api.news.remove).not.toHaveBeenCalled();
    await confirmNewsDialog(api, h.dispatch, h.state.dialog);
    expect(api.news.remove).toHaveBeenCalledWith(11);
    expect(api.news.list).toHaveBeenCalled();
  });

  it("crea, edita, cambia el estado y elimina eventos con confirmación", async () => {
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

    h.dispatch({ type: "dialog-opened", dialog: { kind: "create" } });
    await saveEvent(api, h.dispatch, h.state.dialog, values);
    expect(api.events.create).toHaveBeenCalledOnce();

    h.dispatch({ type: "dialog-opened", dialog: { kind: "edit", item } });
    await saveEvent(api, h.dispatch, h.state.dialog, values);
    expect(api.events.update.mock.calls[0][0]).toBe(21);

    h.dispatch({ type: "dialog-opened", dialog: { kind: "status", item } });
    expect(getEventConfirmation(h.state.dialog)?.title).toBe("Activar evento");
    await confirmEventDialog(api, h.dispatch, h.state.dialog);
    expect(api.events.setStatus).toHaveBeenCalledWith(21, true);

    h.dispatch({ type: "dialog-opened", dialog: { kind: "delete", item } });
    expect(api.events.remove).not.toHaveBeenCalled();
    await confirmEventDialog(api, h.dispatch, h.state.dialog);
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
    const news = createHarness(newsReducer, { ...readyNews, dialog: { kind: "create" } as const });
    const events = createHarness(eventsReducer, { ...readyEvents, dialog: { kind: "create" } as const });

    await saveNews(api, news.dispatch, news.state.dialog, emptyNewsForm());
    await saveEvent(api, events.dispatch, events.state.dialog, {
      name: "x", description: "", location: "", start_date: "2026-11-02",
      end_date: "2026-11-01", start_time: "", end_time: "", is_active: true,
    });
    const newsMarkup = renderToStaticMarkup(<NewsView state={news.state} actions={newsActions} />);
    const eventsMarkup = renderToStaticMarkup(<EventsView state={events.state} actions={eventActions} />);

    expect(news.state.dialog).toEqual({ kind: "create" });
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
