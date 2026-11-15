import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { MemoriesView } from "../views/MemoriesView";
import {
  initialMemoryListState,
  loadList,
  memoryListReducer,
  type MemoryListState,
} from "../viewmodels/memory-review";
import { apiError, fakeApi, listHarness, listStateWith, listViewModel, summary } from "./memory-fixtures";

const source = (path: string) =>
  readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf8");

const ready = (items: ReturnType<typeof summary>[], hasMore = false, page = 1): MemoryListState =>
  listStateWith({ page, status: "ready", items, hasMore });

const render = (state: MemoryListState) =>
  renderToStaticMarkup(<MemoriesView {...listViewModel(state)} onOpen={() => undefined} />);

it("CA-02 memory-list: pide page y status solo con filtro; «Siguiente» según has_more", async () => {
  const { api, review } = fakeApi();
  review.list.mockResolvedValueOnce({ data: [summary()], meta: { has_more: true } });
  const h = listHarness(api);

  await loadList(h.ctx, { filter: "", page: 1 });

  expect(review.list).toHaveBeenNthCalledWith(1, { status: undefined, page: 1 });
  expect(h.state.hasMore).toBe(true);

  await loadList(h.ctx, { filter: "rejected", page: 2 });

  expect(review.list).toHaveBeenNthCalledWith(2, { status: "rejected", page: 2 });
  expect(h.state.hasMore).toBe(false);

  const withMore = render(ready([summary()], true));
  const withoutMore = render(ready([summary()], false));

  expect(withMore).not.toMatch(/disabled=""[^>]*>Siguiente/);
  expect(withoutMore).toMatch(/disabled=""[^>]*>Siguiente/);
  expect(withMore).toMatch(/disabled=""[^>]*>Anterior/);
  expect(render(ready([summary()], true, 2))).not.toMatch(/disabled=""[^>]*>Anterior/);
  expect(withMore).toContain("Página 1");
});

it("CA-03 memory-list: cambiar el filtro vuelve a pedir la API; «Todas» omite status; no filtra en cliente", async () => {
  const { api, review } = fakeApi();
  review.list.mockResolvedValue({
    data: [summary({ status: "accepted" }), summary({ id: 12, status: "rejected" })],
    meta: { has_more: false },
  });
  const h = listHarness(api, ready([summary()], false, 3));

  const changed = memoryListReducer(h.state, { type: "filter-changed", filter: "accepted" });

  expect(changed.filter).toBe("accepted");
  expect(changed.page).toBe(1);
  expect(changed.items).toEqual([]);

  await loadList(h.ctx, { filter: "accepted", page: 1 });
  await loadList(h.ctx, { filter: "", page: 1 });

  expect(review.list).toHaveBeenNthCalledWith(1, { status: "accepted", page: 1 });
  expect(review.list).toHaveBeenNthCalledWith(2, { status: undefined, page: 1 });
  // La API decide: las filas que devuelve se muestran tal cual, sin filtrar.
  expect(h.state.items).toHaveLength(2);

  const html = render(ready([summary({ status: "rejected" })]));

  expect(html).toContain(">Todas</option>");
  expect(html).toContain(">Enviada</option>");
  expect(html).toContain(">En proceso</option>");
  expect(html).toContain(">Aceptada</option>");
  expect(html).toContain(">Rechazada</option>");
  expect(html).not.toContain("espera la corrección del visitante");
  expect(initialMemoryListState.filter).toBe("submitted");
});

it("RN-03 memory-list: el ViewModel no calcula estados ni transiciones", () => {
  const text = source("viewmodels/memory-review.ts");
  const list = text.slice(text.indexOf("export async function loadList"), text.indexOf("/* ---"));

  expect(list).not.toMatch(/status\s*=\s*["']/);
  expect(list).not.toMatch(/\.filter\(|\.sort\(|\.slice\(/);
  expect(list).not.toMatch(/"in_review"|"accepted"|"rejected"/);
});

it("CA-02 memory-list: vacío, cargando y error con Reintentar; sin filas anteriores", async () => {
  expect(render(listStateWith({ status: "loading" }))).toContain("Cargando peticiones…");
  expect(render(listStateWith({ status: "empty" }))).toContain("No hay peticiones con este estado.");

  const { api, review } = fakeApi();
  review.list.mockRejectedValueOnce(apiError(500, "Error interno"));
  const h = listHarness(api, ready([summary({ opinion: "Texto anterior" })]));

  await loadList(h.ctx, { filter: "", page: 1 });

  expect(h.state.status).toBe("error");
  expect(h.state.items).toEqual([]);

  const html = render(h.state);

  expect(html).toContain("No se pudieron cargar las peticiones.");
  expect(html).toContain("Reintentar");
  expect(html).not.toContain("Texto anterior");

  const denied = listHarness(api);
  review.list.mockRejectedValueOnce(apiError(403, "Prohibido"));
  await loadList(denied.ctx, { filter: "", page: 1 });

  expect(render(denied.state)).toContain("No tienes permiso para revisar momentos.");
  expect(render(denied.state)).not.toContain("Reintentar");
});

it("CA-04 memory-list: fila con fecha, estado, fragmento y «Revisar»; sin datos del visitante", () => {
  const long = "x".repeat(130);
  const html = render(
    ready([
      summary({ id: 1, status: "in_review", opinion: long, resubmitted_count: 2 }),
      summary({ id: 2, opinion: null, resubmitted_count: 1 }),
      summary({ id: 3, resubmitted_count: 0 }),
    ]),
  );

  expect(html).toContain("En proceso");
  expect(html).toContain(`${"x".repeat(120)}…`);
  expect(html).not.toContain("x".repeat(121));
  expect(html).toContain("Sin opinión");
  expect(html).toContain("Reenviada 2 veces");
  expect(html).toContain("Reenviada 1 vez");
  expect(html).toMatch(/aria-label="Revisar petición enviada el [^"]+"/);
  expect(html).toMatch(/>Revisar<\/button>/);
  // La fecha de envío se formatea en la zona del dashboard.
  expect(html).toContain("2026");
  expect(html).not.toMatch(/visitor|visitante_|full_name|email|correo/i);

  for (const path of ["viewmodels/admin-types.ts"]) expect(source(path)).not.toMatch(/visitor_name|visitor_email/);
});

it("CA-13 memory-list: tabla desde 768 px y tarjetas por debajo; sin anchos fijos en la sección", () => {
  const view = source("views/MemoriesView.tsx");
  const styles = source("styles.css");
  const block = styles.slice(styles.indexOf("dashboard-008"));

  // La tabla es `DataTable` (desplazamiento propio) y se apila en pantallas angostas:
  // el punto de corte lo fija el componente compartido (640 px), no esta sección.
  expect(view).toContain("DataTable");
  expect(styles).toMatch(/@media \(max-width: 640px\)[\s\S]*?\.data-table thead/);
  expect(block).toContain("memory-review__");
  expect(block).not.toMatch(/(?<![-\w])(?:width|min-width)\s*:\s*\d+px/);
  expect(block).not.toMatch(/overflow-x\s*:\s*scroll/);
  expect(render(ready([summary()]))).toContain('class="table-scroll data-table-scroll"');
});
