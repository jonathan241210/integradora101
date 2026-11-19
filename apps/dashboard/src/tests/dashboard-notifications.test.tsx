import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { NotificationAlert } from "../components/DashboardNotifications";
import { initialNotifications, notificationsReducer } from "../viewmodels/dashboard-notifications";

describe("news-pagination-and-feedback", () => {
  it("CA-04 distingue los anuncios de éxito y error y ofrece un cierre accesible", () => {
    const saved = { id: 1, tone: "success", message: "Noticia creada." } as const;
    const error = { id: 2, tone: "error", message: "No se pudo guardar." } as const;
    const successMarkup = renderToStaticMarkup(<NotificationAlert item={saved} onDismiss={vi.fn()} />);
    const errorMarkup = renderToStaticMarkup(<NotificationAlert item={error} onDismiss={vi.fn()} />);

    expect(successMarkup).toContain('role="status"');
    expect(successMarkup).toContain(saved.message);
    expect(errorMarkup).toContain('role="alert"');
    expect(errorMarkup).toContain(error.message);
    expect(errorMarkup).toContain('aria-label="Cerrar aviso"');
  });

  it("CA-04 solo permite que el cierre afecte al aviso correspondiente", () => {
    const first = notificationsReducer(initialNotifications, { type: "publish", tone: "success", message: "Guardado." });
    const second = notificationsReducer(first, { type: "publish", tone: "error", message: "Error." });

    expect(notificationsReducer(second, { type: "dismiss", id: 1 })).toBe(second);
    expect(notificationsReducer(second, { type: "dismiss", id: 2 }).visible).toBeNull();
  });
});
