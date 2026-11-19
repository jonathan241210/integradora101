import { readFileSync, readdirSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GlobalSearch } from "../components/GlobalSearch";
import { SEARCH_ERROR, createGlobalSearchController, rateLimitMessage } from "../viewmodels/global-search";
import type { GlobalSearchViewModel } from "../viewmodels/useGlobalSearch";

const src = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const TOO_MANY = "Demasiadas búsquedas. Espera un minuto e inténtalo de nuevo.";

function rateLimited(message = TOO_MANY) {
  return Object.assign(new Error(message), { name: "ApiError", status: 429 });
}

describe("CA-39 enclosure-actions-global-search", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("ante un 429 muestra el mensaje de la API y no reintenta solo", async () => {
    const search = vi.fn(async () => { throw rateLimited(); });
    const controller = createGlobalSearchController(search, () => undefined);

    controller.setQuery("lobo");
    await vi.advanceTimersByTimeAsync(300);
    expect(controller.snapshot()).toMatchObject({ status: "error", errorMessage: TOO_MANY });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(search).toHaveBeenCalledTimes(1);

    const vm: GlobalSearchViewModel = {
      query: "lobo", trimmedQuery: "lobo", status: "error", errorMessage: TOO_MANY, groups: [], results: [],
      open: true, activeIndex: -1,
      actions: { change() {}, focus() {}, blur() {}, keyDown: () => false, choose() {}, hover() {} },
    };
    const markup = renderToStaticMarkup(<GlobalSearch {...vm} />);

    expect(markup).toContain(TOO_MANY);
    expect(markup).not.toContain(SEARCH_ERROR);
  });

  it("otros errores siguen mostrando el mensaje genérico", async () => {
    const search = vi.fn(async () => { throw Object.assign(new Error("boom"), { status: 500 }); });
    const controller = createGlobalSearchController(search, () => undefined);

    controller.setQuery("lobo");
    await vi.advanceTimersByTimeAsync(300);
    expect(controller.snapshot().status).toBe("error");
    expect(controller.snapshot().errorMessage).toBeUndefined();
    expect(rateLimitMessage(rateLimited(""))).toBeUndefined();
    expect(rateLimitMessage("x")).toBeUndefined();
  });
});

describe("CA-40 enclosure-actions-global-search", () => {
  it("el código del buscador no usa localStorage, sessionStorage, cookies ni history", () => {
    const files = [
      "viewmodels/global-search.ts", "viewmodels/useGlobalSearch.ts", "viewmodels/search-actions.ts",
      "viewmodels/search-tolerance.ts", "viewmodels/focus-target.ts", "viewmodels/useLocateHit.ts",
      "components/GlobalSearch.tsx", "components/SearchHitBanner.tsx",
    ];

    for (const file of files) {
      expect(src(file), file).not.toMatch(/localStorage|sessionStorage|document\.cookie|history\.(push|replace)State|location\.(search|hash|href)/);
    }
    expect(readdirSync(new URL("../viewmodels/", import.meta.url)).includes("search-tolerance.ts")).toBe(true);
  });
});
