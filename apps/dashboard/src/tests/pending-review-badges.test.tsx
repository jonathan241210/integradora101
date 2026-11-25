import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { NotificationAlert } from "../components/DashboardNotifications";
import { SidebarLink } from "../components/SidebarLink";
import { initialNotifications, notificationsReducer } from "../viewmodels/dashboard-notifications";
import {
  PENDING_MIN_INTERVAL_MS,
  createPendingQueryMemo,
  initialPendingReviewState,
  pendingKeysFor,
  pendingNoticeMessages,
  pendingNoticeText,
  pendingReviewReducer,
  refreshPendingCounts,
  type PendingCounts,
  type PendingReviewState,
} from "../viewmodels/pending-review";
import { apiError, createHarness } from "./admin-fixtures";

const read = (path: string) =>
  readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf8");

const both = ["species.review", "memories.review", "dashboard.view"];

function start(permissions: readonly string[] = both) {
  const h = createHarness<PendingReviewState, Parameters<typeof pendingReviewReducer>[1]>(
    pendingReviewReducer,
    initialPendingReviewState,
  );
  const memo = createPendingQueryMemo();
  const api = { pendingCounts: vi.fn(async (): Promise<PendingCounts> => ({ species_requests: 3, memories: 1 })) };
  const load = (now: number) => refreshPendingCounts(api, memo, h.dispatch, { permissions, now });

  return { h, memo, api, load };
}

const link = (id: "memories" | "tulanpedia" | "news", label: string, counts: PendingCounts) =>
  renderToStaticMarkup(
    <SidebarLink id={id} label={label} icon="news" active={false} counts={counts} onSelect={vi.fn()} />,
  );

/** Reproduce la cola de DashboardNotifications con los avisos publicados. */
function publishAll(messages: string[], before: Array<{ message: string; tone: "success" | "error" }> = []) {
  let state = initialNotifications;
  for (const item of before) state = notificationsReducer(state, { type: "publish", ...item });
  for (const message of messages) state = notificationsReducer(state, { type: "publish", message, tone: "info" });

  return state;
}

describe("CA-01 pending-review-badges", () => {
  it("CA-01 pending-review-badges: aviso al iniciar con pendientes", async () => {
    const { h, load } = start();
    await load(0);

    expect(h.state.announcement?.messages).toEqual([
      "Tienes 3 solicitudes de especies pendientes.",
      "Tienes 1 momento pendiente de revisión.",
    ]);
    const queue = publishAll(h.state.announcement?.messages ?? []);
    const markup = renderToStaticMarkup(<NotificationAlert item={queue.visible!} onDismiss={vi.fn()} />);
    expect(markup).toContain("Tienes 3 solicitudes de especies pendientes.");
    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-label="Cerrar aviso"');
    expect(markup).toContain('data-tone="info"');
    expect(markup).toContain("Aviso");
    expect(queue.queue).toHaveLength(1);

    const memories = start(["memories.review"]);
    memories.api.pendingCounts.mockResolvedValueOnce({ memories: 4 });
    await memories.load(0);
    expect(memories.h.state.announcement?.messages).toEqual(["Tienes 4 momentos pendientes de revisión."]);
  });
});

describe("CA-02 pending-review-badges", () => {
  it("CA-02 pending-review-badges: sin aviso con cero", async () => {
    const { h, api, load } = start();
    api.pendingCounts.mockResolvedValueOnce({ species_requests: 0, memories: 0 });
    await load(0);
    expect(h.state.announcement).toBeNull();
    expect(pendingNoticeMessages({ species_requests: 0, memories: 0 })).toEqual([]);

    const none = start(["dashboard.view"]);
    await none.load(0);
    expect(none.h.state.announcement).toBeNull();
  });
});

describe("CA-03 pending-review-badges", () => {
  it("CA-03 pending-review-badges: singular y plural", () => {
    expect(pendingNoticeText("species_requests", 1)).toBe("Tienes 1 solicitud de especie pendiente.");
    expect(pendingNoticeText("species_requests", 2)).toBe("Tienes 2 solicitudes de especies pendientes.");
    expect(pendingNoticeText("memories", 1)).toBe("Tienes 1 momento pendiente de revisión.");
    expect(pendingNoticeText("memories", 5)).toBe("Tienes 5 momentos pendientes de revisión.");
  });
});

describe("CA-04 pending-review-badges", () => {
  it("CA-04 pending-review-badges: aviso no se repite al cambiar de pantalla", async () => {
    const { h, load } = start();
    await load(0);
    const first = h.state.announcement;
    expect(first).not.toBeNull();

    await load(PENDING_MIN_INTERVAL_MS + 1);
    expect(h.state.announcement).toBe(first);
    expect(h.state.counts.memories).toBe(1);

    // Si el primer inicio trajo 0, tampoco se anuncia después: es un aviso de inicio.
    const quiet = start();
    quiet.api.pendingCounts.mockResolvedValueOnce({ species_requests: 0, memories: 0 });
    await quiet.load(0);
    await quiet.load(PENDING_MIN_INTERVAL_MS + 1);
    expect(quiet.h.state.announcement).toBeNull();
    // El componente publica una sola vez por nonce.
    expect(read("components/PendingReviewNotices.tsx")).toContain("published.current === announcement.nonce");
  });
});

describe("CA-05 pending-review-badges", () => {
  it("CA-05 pending-review-badges: puntito por sección", () => {
    const counts = { species_requests: 2, memories: 1 };

    expect(link("tulanpedia", "Zoopedia", counts)).toContain("sidebar-link__dot");
    expect(link("memories", "Momentos", counts)).toContain("sidebar-link__dot");
    expect(link("news", "Noticias", counts)).not.toContain("sidebar-link__dot");
    expect(link("tulanpedia", "Zoopedia", { memories: 3 })).not.toContain("sidebar-link__dot");
    expect(link("memories", "Momentos", { species_requests: 3 })).not.toContain("sidebar-link__dot");
  });
});

describe("CA-06 pending-review-badges", () => {
  it("CA-06 pending-review-badges: puntito baja a cero", async () => {
    const { h, api, load } = start();
    await load(0);
    expect(link("memories", "Momentos", h.state.counts)).toContain("sidebar-link__dot");

    api.pendingCounts.mockResolvedValueOnce({ species_requests: 3, memories: 0 });
    await load(PENDING_MIN_INTERVAL_MS);
    expect(link("memories", "Momentos", h.state.counts)).not.toContain("sidebar-link__dot");
    expect(link("tulanpedia", "Zoopedia", h.state.counts)).toContain("sidebar-link__dot");
  });
});

describe("CA-07 pending-review-badges", () => {
  it("CA-07 pending-review-badges: consulta al cambiar de sección", async () => {
    const { api, load } = start();
    await load(0);
    await load(PENDING_MIN_INTERVAL_MS);
    expect(api.pendingCounts).toHaveBeenCalledTimes(2);

    // El hook depende de la sección activa del shell: menú, búsqueda global y enlaces
    // internos navegan todos por `shell.navigate` (RN-13: la misma sección no cambia la dependencia).
    const hook = read("viewmodels/usePendingReviewCounts.ts");
    expect(hook).toMatch(/\[enabled, accountId, activeSection, permissionKey\]/);
    const app = read("App.tsx");
    expect(app).toContain("shell.state.activeSection,\n  );");
    expect(app.match(/shell\.navigate\(/g)!.length).toBeGreaterThanOrEqual(3);
  });
});

describe("CA-08 pending-review-badges", () => {
  it("CA-08 pending-review-badges: sin sondeo", () => {
    for (const file of [
      "viewmodels/usePendingReviewCounts.ts",
      "viewmodels/pending-review.ts",
      "components/PendingReviewNotices.tsx",
      "components/SidebarLink.tsx",
    ]) {
      const source = read(file);
      expect(source, file).not.toMatch(/setInterval|WebSocket|EventSource|requestAnimationFrame/);
    }
  });
});

describe("CA-09 pending-review-badges", () => {
  it("CA-09 pending-review-badges: nombre accesible y puntito decorativo", () => {
    const counts = { species_requests: 2, memories: 1 };

    expect(link("tulanpedia", "Zoopedia", counts)).toContain('aria-label="Zoopedia, con solicitudes pendientes"');
    expect(link("memories", "Momentos", counts)).toContain('aria-label="Momentos, con momentos pendientes de revisión"');
    expect(link("memories", "Momentos", {})).toContain('aria-label="Momentos"');
    expect(link("news", "Noticias", counts)).toContain('aria-label="Noticias"');
    expect(link("tulanpedia", "Zoopedia", counts)).toContain('class="sidebar-link__dot" aria-hidden="true"');
    expect(renderToStaticMarkup(<NotificationAlert item={{ id: 1, tone: "info", message: "x" }} onDismiss={vi.fn()} />)).toContain('role="status"');
  });
});

describe("CA-10 pending-review-badges", () => {
  it("CA-10 pending-review-badges: fallo no bloquea", async () => {
    const { h, api, load, memo } = start();
    api.pendingCounts.mockRejectedValueOnce(apiError(500, "Error interno."));
    await expect(load(0)).resolves.toBeUndefined();
    expect(h.state).toBe(initialPendingReviewState);
    expect(h.actions).toHaveLength(0);
    expect(memo.inFlight).toBe(false);

    api.pendingCounts.mockRejectedValueOnce(new TypeError("fetch failed"));
    await expect(load(1)).resolves.toBeUndefined();
    // Un fallo no cuenta para el intervalo: la siguiente pantalla reintenta (RN-07).
    await load(2);
    expect(api.pendingCounts).toHaveBeenCalledTimes(3);
    expect(h.state.counts.memories).toBe(1);
  });
});

describe("CA-11 pending-review-badges", () => {
  it("CA-11 pending-review-badges: sin permisos no consulta", async () => {
    const { h, api, load } = start(["dashboard.view", "news.manage"]);
    await load(0);
    await load(PENDING_MIN_INTERVAL_MS * 2);

    expect(pendingKeysFor(["dashboard.view"])).toEqual([]);
    expect(api.pendingCounts).not.toHaveBeenCalled();
    expect(h.state).toBe(initialPendingReviewState);
  });
});

describe("CA-12 pending-review-badges", () => {
  it("CA-12 pending-review-badges: solo cifras", async () => {
    const { h, api, load } = start();
    api.pendingCounts.mockResolvedValueOnce({
      species_requests: 2,
      memories: 1,
      // @ts-expect-error la API no debería enviar más; el dashboard lo ignora
      names: ["Lobo gris", "Ana Pérez"],
    });
    await load(0);

    expect(Object.keys(h.state.counts).sort()).toEqual(["memories", "species_requests"]);
    expect(JSON.stringify(h.state)).not.toMatch(/Lobo|Ana/);
  });
});

describe("CA-15 pending-review-badges", () => {
  it("CA-15 pending-review-badges: espera a otro aviso", () => {
    const state = publishAll(["Tienes 1 momento pendiente de revisión."], [{ message: "Guardado.", tone: "success" }]);

    expect(state.visible?.message).toBe("Guardado.");
    expect(state.queue.map((item) => item.message)).toEqual(["Tienes 1 momento pendiente de revisión."]);
    const after = notificationsReducer(state, { type: "dismiss", id: state.visible!.id });
    expect(after.visible?.tone).toBe("info");
    expect(after.queue).toHaveLength(0);
  });
});

describe("CA-16 pending-review-badges", () => {
  it("CA-16 pending-review-badges: intervalo mínimo de 15 s", async () => {
    const { api, load } = start();
    await load(1_000);
    await load(1_000 + PENDING_MIN_INTERVAL_MS - 1);
    expect(api.pendingCounts).toHaveBeenCalledTimes(1);

    await load(1_000 + PENDING_MIN_INTERVAL_MS);
    expect(api.pendingCounts).toHaveBeenCalledTimes(2);
    expect(PENDING_MIN_INTERVAL_MS).toBe(15_000);
  });

  it("CA-16 pending-review-badges: no lanza una segunda consulta mientras otra está en curso", async () => {
    const { api, load } = start();
    await Promise.all([load(0), load(1)]);
    expect(api.pendingCounts).toHaveBeenCalledTimes(1);
  });
});
