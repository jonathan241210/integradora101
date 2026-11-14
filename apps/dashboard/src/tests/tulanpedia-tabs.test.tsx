import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { TulanpediaTabs } from "../components/TulanpediaTabs";
import {
  leaveTulanpediaUrl,
  syncTulanpediaUrl,
  type UrlWindow,
} from "../viewmodels/tulanpedia-tab";

const source = (path: string) =>
  readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf8");

const fakeWindow = (search: string): UrlWindow & { replaceState: ReturnType<typeof vi.fn> } => {
  const replaceState = vi.fn();

  return {
    location: { pathname: "/", search, hash: "" },
    history: { state: null, replaceState },
    replaceState,
  };
};

it("CA-63 tulanpedia-tabs: dos pestañas en tablist con tab y aria-selected; Solicitudes primero", () => {
  const html = renderToStaticMarkup(
    <TulanpediaTabs active="published" onSelect={() => undefined}>
      <p>contenido</p>
    </TulanpediaTabs>,
  );

  expect(html).toContain('role="tablist"');
  expect(html.match(/role="tab"/g)).toHaveLength(2);
  expect(html.indexOf(">Solicitudes<")).toBeLessThan(html.indexOf(">Publicadas<"));
  expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
  expect(html).toMatch(/aria-selected="true"[^>]*>Publicadas</);
  expect(html).toMatch(/aria-selected="false"[^>]*>Solicitudes</);
  expect(html).toContain('role="tabpanel"');
});

it("CA-63 tulanpedia-tabs: cambiar de pestaña actualiza la URL con replaceState, sin recarga", () => {
  const win = fakeWindow("");

  syncTulanpediaUrl(win, "published");
  expect(win.replaceState).toHaveBeenLastCalledWith(null, "", "/?section=tulanpedia&tab=published");

  syncTulanpediaUrl(win, "requests");
  expect(win.replaceState).toHaveBeenLastCalledWith(null, "", "/?section=tulanpedia&tab=requests");

  const win2 = fakeWindow("?section=tulanpedia&tab=published");

  leaveTulanpediaUrl(win2);
  expect(win2.replaceState).toHaveBeenLastCalledWith(null, "", "/");

  // Ni pushState ni recarga en el mecanismo.
  const text = source("viewmodels/tulanpedia-tab.ts") + source("viewmodels/useTulanpediaTab.ts");

  expect(text).not.toMatch(/pushState|location\.(?:assign|reload|href\s*=)/);
});

it("CA-65 tulanpedia-tabs: sin rutas de detalle; recargar vuelve a la lista de la pestaña", () => {
  // La URL solo contiene section y tab: ningún identificador de solicitud ni de especie.
  const win = fakeWindow("");

  syncTulanpediaUrl(win, "requests");
  expect(win.replaceState.mock.calls[0]?.[2]).toBe("/?section=tulanpedia&tab=requests");

  // El detalle es estado de la vista (selectedId), sin router ni parámetros de URL.
  const text = [
    "sections/TulanpediaSection.tsx",
    "viewmodels/useTulanpediaTab.ts",
    "viewmodels/tulanpedia-tab.ts",
  ]
    .map(source)
    .join("\n");

  expect(text).not.toMatch(/react-router|selectedId|[?&]id=|request_id|species_id/);
});
