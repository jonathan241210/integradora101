import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EventsView } from "../views/EventsView";
import { NewsView } from "../views/NewsView";

describe("CA-03 admin-dashboard-prototype", () => {
  it("presenta formularios y listados de noticias y eventos sin prometer persistencia", () => {
    const news = renderToStaticMarkup(<NewsView onNotice={() => undefined} />);
    const events = renderToStaticMarkup(<EventsView onNotice={() => undefined} />);

    expect(news).toContain("Registrar noticia");
    expect(news).toContain('for="news-title"');
    expect(news).toContain("Noticias publicadas");
    expect(news).toContain("no se guardan cambios");
    expect(events).toContain("Registrar evento");
    expect(events).toContain("Hora de inicio");
    expect(events).toContain("Próximos eventos");
    expect(events).toContain("no se guardan cambios");
  });
});
