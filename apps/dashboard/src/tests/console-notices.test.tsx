import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  canSeeConsoleNotices,
  consoleNoticeText,
  consoleNoticesReducer,
  initialConsoleNoticesState,
  loadConsoleNotices,
  markConsoleNoticesRead,
  planConsoleNotices,
  type ConsoleNoticesAction,
  type ConsoleNoticesState,
} from "../viewmodels/console-notices";
import { initialNotifications, notificationsReducer } from "../viewmodels/dashboard-notifications";
import { apiError, consoleNotice, createAdminApiMock, createHarness } from "./admin-fixtures";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = (path: string) => readFileSync(`${root}/${path}`, "utf8");

const harness = (state: ConsoleNoticesState = initialConsoleNoticesState) =>
  createHarness<ConsoleNoticesState, ConsoleNoticesAction>(consoleNoticesReducer, state);

const NOW = Date.parse("2026-11-21T12:00:00+00:00");
const daysAgo = (days: number) => new Date(NOW - days * 24 * 60 * 60 * 1000).toISOString();
const notice = (id: number, days: number) =>
  consoleNotice({ id, account_email: `u${id}@test.arca.invalid`, created_at: daysAgo(days) });

describe("avisos de consola emergentes (dashboard-017)", () => {
  it("CA-19 fixed-roles-account-management: cada aviso sale una vez como emergente informativo con el texto de siempre y se marca leído", async () => {
    const api = createAdminApiMock();
    api.consoleNotices.list.mockResolvedValueOnce([notice(31, 1), notice(32, 2)]);
    const h = harness();

    await loadConsoleNotices(api, h.dispatch, () => true, NOW);
    const announcement = h.state.announcement!;

    expect(consoleNoticeText(notice(31, 1))).toMatch(
      /^Cambio por consola: Contraseña restablecida en u31@test\.arca\.invalid el .+\. Motivo: Solicitud de la titular\.$/,
    );
    expect(announcement.messages).toEqual([consoleNoticeText(notice(31, 1)), consoleNoticeText(notice(32, 2))]);
    expect(announcement.readIds).toEqual([31, 32]);
    // Cargar no marca; el componente marca al publicar, una vez por nonce.
    expect(api.consoleNotices.read).not.toHaveBeenCalled();

    await markConsoleNoticesRead(api, announcement.readIds);
    expect(api.consoleNotices.read.mock.calls.map(([id]) => id)).toEqual([31, 32]);

    const publisher = source("components/ConsoleNoticesPublisher.tsx");

    expect(publisher).toContain('publish(message, "info")');
    expect(publisher).toContain("actions.markRead(announcement.readIds)");
    expect(publisher).toContain("handled.current === announcement.nonce");
  });

  it("CA-20 fixed-roles-account-management: solo se muestran los avisos de los últimos 7 días y los viejos se marcan leídos sin mostrarse", () => {
    const plan = planConsoleNotices([notice(1, 6.9), notice(2, 8), notice(3, 30)], NOW);

    expect(plan.messages).toHaveLength(1);
    expect(plan.messages[0]).toContain("u1@test.arca.invalid");
    expect(plan.messages.join(" ")).not.toContain("u2@test.arca.invalid");
    expect(plan.readIds).toEqual([1, 2, 3]);
    // Solo viejos: nada que mostrar, pero se marcan.
    expect(planConsoleNotices([notice(4, 9)], NOW)).toEqual({ messages: [], readIds: [4] });
  });

  it("CA-21 fixed-roles-account-management: con más de 3 avisos se muestran los 3 más recientes y un resumen", () => {
    const plan = planConsoleNotices([notice(1, 5), notice(2, 1), notice(3, 4), notice(4, 2), notice(5, 3)], NOW);

    expect(plan.messages).toHaveLength(4);
    expect(plan.messages[0]).toContain("u2@");
    expect(plan.messages[1]).toContain("u4@");
    expect(plan.messages[2]).toContain("u5@");
    expect(plan.messages[3]).toBe("Y 2 cambios más por consola en los últimos días.");
    expect(plan.readIds).toHaveLength(5);
    // Exactamente 3: sin resumen.
    expect(planConsoleNotices([notice(1, 1), notice(2, 2), notice(3, 3)], NOW).messages).toHaveLength(3);
  });

  it("CA-22 fixed-roles-account-management: un fallo al marcar como leído no reintenta en bucle", async () => {
    const api = createAdminApiMock();
    api.consoleNotices.read.mockRejectedValue(apiError(500, "Error interno."));

    await expect(markConsoleNoticesRead(api, [31, 32])).resolves.toBeUndefined();

    expect(api.consoleNotices.read).toHaveBeenCalledTimes(2);
    expect(source("viewmodels/useConsoleNotices.ts")).not.toMatch(/setInterval|setTimeout/);
    expect(source("components/ConsoleNoticesPublisher.tsx")).not.toMatch(/setInterval|setTimeout/);
  });

  it("CA-23 fixed-roles-account-management: el Panel principal ya no muestra el banner de avisos de consola", () => {
    const app = source("App.tsx");

    expect(existsSync(`${root}/components/ConsoleNoticesBanner.tsx`)).toBe(false);
    expect(app).not.toContain("ConsoleNoticesBanner");
    expect(app).toContain("<ConsoleNoticesPublisher");
    expect(source("styles.css")).not.toContain(".console-notices");
  });

  it("CA-24 fixed-roles-account-management: los avisos de consola entran en la cola FIFO junto a los de pendientes y no se duplican al cambiar de sección", () => {
    let queue = initialNotifications;
    const plan = planConsoleNotices([notice(1, 1), notice(2, 2)], NOW);

    for (const message of ["Hay 2 cancelaciones pendientes.", ...plan.messages]) {
      queue = notificationsReducer(queue, { type: "publish", message, tone: "info" });
    }
    expect(queue.visible?.message).toBe("Hay 2 cancelaciones pendientes.");
    expect(queue.queue.map((item) => item.message)).toEqual(plan.messages);

    // El hook consulta solo al iniciar sesión: no depende de la sección activa.
    const hook = source("viewmodels/useConsoleNotices.ts");

    expect(hook).toContain("[enabled, accountId]");
    expect(hook).not.toMatch(/activeSection/);
  });

  it("CA-25 fixed-roles-account-management: un fallo al consultar los avisos se publica como aviso de error y no bloquea el panel", async () => {
    const api = createAdminApiMock();
    api.consoleNotices.list.mockRejectedValueOnce(new TypeError("fetch failed"));
    const h = harness();

    await loadConsoleNotices(api, h.dispatch);

    expect(h.state.status).toBe("error");
    expect(h.state.error).toContain("No fue posible consultar los avisos de consola.");
    expect(source("components/ConsoleNoticesPublisher.tsx")).toContain('publish(state.error, "error")');
  });

  it("CA-12 fixed-roles-account-management: sin users.manage no se consultan avisos", () => {
    expect(canSeeConsoleNotices(["dashboard.view", "news.manage"])).toBe(false);
    expect(canSeeConsoleNotices(["users.manage"])).toBe(true);
  });

  it("CA-16 fixed-roles-account-management: un 401 en avisos lo atiende el estado de sesión y no se muestra como error local", async () => {
    const api = createAdminApiMock();
    api.consoleNotices.list.mockRejectedValueOnce(apiError(401, "Unauthenticated."));
    const h = harness();

    await loadConsoleNotices(api, h.dispatch);

    expect(h.state.status).toBe("loading");
    expect(h.state.error).toBe("");
    expect(h.actions.some((action) => action.type === "failed")).toBe(false);
  });
});
