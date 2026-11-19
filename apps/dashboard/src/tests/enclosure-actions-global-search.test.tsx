import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { EnclosuresView } from "../views/EnclosuresView";
import {
  clampPage,
  deleteEnclosure,
  enclosureAnimalsWarning,
  enclosurePage,
  enclosurePageCount,
  enclosuresReducer,
  getEnclosureConfirmation,
  getEnclosureWarning,
  initialEnclosuresState,
  loadEnclosures,
  pageAfterCreate,
  pageAfterDelete,
  setEnclosureStatus,
  type EnclosureDialog,
  pageOfEnclosure,
  saveEnclosure,
  type EnclosuresViewModel,
} from "../viewmodels/enclosures-management";
import { apiError, createAdminApiMock, createHarness, enclosure } from "./admin-fixtures";

const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

const actions: EnclosuresViewModel["actions"] = {
  reload: vi.fn(),
  openDialog: vi.fn(),
  closeDialog: vi.fn(),
  dismissNotice: vi.fn(),
  save: vi.fn(),
  goToPage: vi.fn(),
  toggleStatus: vi.fn(),
  requestDelete: vi.fn(),
  confirm: vi.fn(),
  openQr: vi.fn(),
  setHasQr: vi.fn(),
  qrNotFound: vi.fn(),
};

const many = (count: number) =>
  Array.from({ length: count }, (_, i) => enclosure({ id: i + 1, name: `Recinto ${i + 1}` }));

function render(items: ReturnType<typeof many>, page: number, error = "") {
  const state = { ...initialEnclosuresState, status: items.length === 0 ? ("empty" as const) : ("ready" as const), items, error };
  return renderToStaticMarkup(
    <EnclosuresView
      state={state}
      actions={actions}
      canManage
      page={page}
      pageCount={enclosurePageCount(items.length)}
      pageItems={enclosurePage(items, page)}
    />,
  );
}

describe("CA-07 enclosure-actions-global-search", () => {
  it("10 recintos dan páginas de 9 y 1 en el orden recibido", () => {
    const items = many(10);

    expect(enclosurePageCount(10)).toBe(2);
    expect(enclosurePage(items, 1).map((e) => e.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(enclosurePage(items, 2).map((e) => e.id)).toEqual([10]);
    expect(enclosurePage(items, 99)).toHaveLength(1);
    expect(clampPage(0, 2)).toBe(1);
    expect(pageOfEnclosure(items, 10)).toBe(2);
    expect(pageOfEnclosure(items, 999)).toBeNull();
  });

  it("muestra «Página X de Y», extremos deshabilitados y aria-current", () => {
    const first = render(many(10), 1);
    expect(first).toContain("Página 1 de 2");
    expect((first.match(/<article|enclosure-card/g) ?? []).length).toBeGreaterThan(0);
    expect(first).toContain('aria-current="page"');
    expect(first).toMatch(/<button[^>]*disabled[^>]*>Anterior<\/button>/);
    expect(first).not.toMatch(/<button[^>]*disabled[^>]*>Siguiente<\/button>/);
    expect(first).toContain("Recinto 9");
    expect(first).not.toContain("Recinto 10<");

    const second = render(many(10), 2);
    expect(second).toContain("Página 2 de 2");
    expect(second).toContain("Recinto 10");
    expect(second).toMatch(/<button[^>]*disabled[^>]*>Siguiente<\/button>/);
  });
});

describe("CA-08 enclosure-actions-global-search", () => {
  it("la cuadrícula tiene 3 columnas, 2 hasta 1024 px y 1 hasta 640 px", () => {
    expect(styles).toMatch(/\.dashboard-app--admin \.enclosure-grid \{\s*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/);
    expect(styles).toMatch(/@media \(max-width: 1024px\) \{\s*\.dashboard-app--admin \.enclosure-grid \{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
    expect(styles).toMatch(/@media \(max-width: 640px\) \{\s*\.dashboard-app--admin \.enclosure-grid \{\s*grid-template-columns: minmax\(0, 1fr\);/);
    const block = styles.slice(styles.indexOf("dashboard-012 · cuadrícula de recintos"));
    expect(block).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

describe("CA-09 enclosure-actions-global-search", () => {
  it("al crear, la página se recalcula para mostrar el recinto nuevo", () => {
    const before = many(9);
    const after = [...many(9), enclosure({ id: 10, name: "Nuevo" })];

    expect(pageAfterCreate(before, after, 1)).toBe(2);
    expect(pageAfterCreate(after, after, 2)).toBe(2);
    expect(pageAfterCreate(many(3), [enclosure({ id: 99 }), ...many(3)], 1)).toBe(1);
  });
});

describe("CA-10 enclosure-actions-global-search", () => {
  it("conserva el estado vacío y muestra error con reintento", () => {
    const empty = render([], 1);
    expect(empty).toContain("Aún no hay recintos registrados.");
    expect(empty).not.toContain("Página 1 de");

    const failed = renderToStaticMarkup(
      <EnclosuresView
        state={{ ...initialEnclosuresState, status: "error", error: "Fallo de red" }}
        actions={actions}
        canManage
        page={1}
        pageCount={1}
        pageItems={[]}
      />,
    );
    expect(failed).toContain("Fallo de red");
    expect(failed).toContain("Reintentar");
  });
});

describe("CA-11 enclosure-actions-global-search", () => {
  it("crear y renombrar siguen igual y el nombre repetido muestra el error de la API", async () => {
    const api = createAdminApiMock();
    const h = createHarness(enclosuresReducer, initialEnclosuresState);
    await loadEnclosures(api, h.dispatch);

    h.dispatch({ type: "dialog-opened", dialog: { kind: "create" } });
    await saveEnclosure(api, h.dispatch, h.state.dialog, " Reptilario ");
    expect(api.enclosures.create).toHaveBeenCalledWith({ name: "Reptilario" });

    api.enclosures.rename.mockRejectedValueOnce(
      apiError(422, "El nombre ya existe.", { name: ["El nombre ya existe."] }),
    );
    h.dispatch({ type: "dialog-opened", dialog: { kind: "rename", item: enclosure() } });
    await saveEnclosure(api, h.dispatch, h.state.dialog, "Aviario");
    expect(h.state.fieldErrors.name).toEqual(["El nombre ya existe."]);
  });
});

/* ---------- Bloque B: acciones de recintos ---------- */
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const withDialog = (dialog: EnclosureDialog | null, extra: Partial<typeof initialEnclosuresState> = {}) => ({
  ...initialEnclosuresState,
  status: "ready" as const,
  items: [enclosure({ id: 1, name: "Lobos", animals_count: 3 }), enclosure({ id: 2, name: "Aviario", animals_count: 0, is_active: false })],
  dialog,
  ...extra,
});

function renderState(state: ReturnType<typeof withDialog>, canManage = true) {
  return renderToStaticMarkup(
    <EnclosuresView
      state={state}
      actions={actions}
      canManage={canManage}
      page={1}
      pageCount={1}
      pageItems={state.items}
    />,
  );
}

describe("CA-01 enclosure-actions-global-search", () => {
  it("muestra insignia en texto y botones con el nombre del recinto; sin permiso no hay botones", () => {
    const markup = renderState(withDialog(null));

    expect(markup).toContain(">Activo<");
    expect(markup).toContain(">Inactivo<");
    expect(markup).toContain('aria-label="Desactivar recinto Lobos"');
    expect(markup).toContain('aria-label="Activar recinto Aviario"');
    expect(markup).toContain('aria-label="Eliminar recinto Lobos"');

    const denied = renderState(withDialog(null), false);
    expect(denied).not.toContain("Desactivar recinto");
    expect(denied).not.toContain("Eliminar recinto");
    expect(denied).not.toContain("Activar recinto");
  });
});

describe("CA-02 enclosure-actions-global-search", () => {
  it("el diálogo de desactivar usa el texto exacto y la advertencia según N", () => {
    const item = enclosure({ name: "Lobos", animals_count: 3 });
    const copy = getEnclosureConfirmation({ kind: "status", item });

    expect(copy?.message).toBe(
      "¿Desactivar el recinto «Lobos»? Dejará de mostrarse en el portal y la app de visitantes y no podrá asignarse a animales. No se elimina y puedes reactivarlo cuando quieras.",
    );
    expect(copy?.danger).toBe(false);
    expect(enclosureAnimalsWarning(0)).toBe("");
    expect(enclosureAnimalsWarning(1)).toBe("Tiene 1 animal asignado.");
    expect(enclosureAnimalsWarning(3)).toBe("Tiene 3 animales asignados.");
    expect(getEnclosureWarning({ kind: "status", item })).toBe("Tiene 3 animales asignados.");

    const markup = renderState(withDialog({ kind: "status", item }));
    expect(markup).toContain("Tiene 3 animales asignados.");
  });

  it("no llama a la API hasta confirmar y cancelar no cambia nada", async () => {
    const api = createAdminApiMock();
    const h = createHarness(enclosuresReducer, withDialog(null));

    h.dispatch({ type: "dialog-opened", dialog: { kind: "status", item: enclosure() } });
    h.dispatch({ type: "dialog-closed" });
    expect(api.enclosures.setStatus).not.toHaveBeenCalled();
    expect(h.state.dialog).toBeNull();
    expect(h.state.items).toHaveLength(2);
  });
});

describe("CA-03 enclosure-actions-global-search", () => {
  it("el diálogo de eliminar es de peligro, con el texto exacto y la misma advertencia", () => {
    const item = enclosure({ name: "Lobos", animals_count: 1, has_active_qr: false });
    const copy = getEnclosureConfirmation({ kind: "delete", item });

    expect(copy?.danger).toBe(true);
    expect(copy?.message).toBe(
      "¿Eliminar el recinto «Lobos»? Desaparecerá del panel, del portal y de la app. Esta acción no se puede deshacer desde el panel.",
    );
    expect(getEnclosureWarning({ kind: "delete", item })).toBe("Tiene 1 animal asignado.");
    expect(getEnclosureConfirmation({ kind: "create" })).toBeNull();
    // dashboard-013 CA-23: con QR activo se añade el aviso de los códigos.
    expect(getEnclosureConfirmation({ kind: "delete", item: { ...item, has_active_qr: true } })?.message).toContain(
      " Sus códigos QR dejarán de funcionar.",
    );
  });
});

describe("CA-04 enclosure-actions-global-search", () => {
  it("activar llama a setStatus(id, true) sin diálogo y avisa «Recinto activado.»", async () => {
    const api = createAdminApiMock();
    const h = createHarness(enclosuresReducer, withDialog(null));

    await setEnclosureStatus(api, h.dispatch, enclosure({ id: 2, is_active: false }), true);
    expect(api.enclosures.setStatus).toHaveBeenCalledWith(2, true);
    expect(h.actions.some((a) => a.type === "dialog-opened")).toBe(false);
    expect(h.state.notice).toBe("Recinto activado.");
  });
});

describe("CA-05 enclosure-actions-global-search", () => {
  it("el ViewModel llama a setStatus y remove del cliente; sin fetch ni axios en components/ ni views/", async () => {
    const api = createAdminApiMock();
    const h = createHarness(enclosuresReducer, withDialog(null));

    await setEnclosureStatus(api, h.dispatch, enclosure({ id: 1 }), false);
    expect(api.enclosures.setStatus).toHaveBeenCalledWith(1, false);
    expect(h.state.notice).toBe("Recinto desactivado.");

    await deleteEnclosure(api, h.dispatch, enclosure({ id: 1 }));
    expect(api.enclosures.remove).toHaveBeenCalledWith(1);
    expect(h.state.notice).toBe("Recinto eliminado.");

    for (const file of ["views/EnclosuresView.tsx", "components/GlobalSearch.tsx", "components/SearchHitBanner.tsx"]) {
      expect(read(file)).not.toMatch(/\bfetch\(|axios/);
    }
  });
});

describe("CA-06 enclosure-actions-global-search", () => {
  it("muestra el mensaje de la API en 404 y 403 y recarga la lista", async () => {
    for (const [status, message] of [
      [404, "Recinto no encontrado."],
      [403, "No tienes permiso para realizar esta acción."],
    ] as const) {
      const api = createAdminApiMock();
      api.enclosures.remove.mockRejectedValueOnce(apiError(status, message));
      const h = createHarness(enclosuresReducer, withDialog({ kind: "delete", item: enclosure() }));

      const done = await deleteEnclosure(api, h.dispatch, enclosure());

      expect(done).toBe(false);
      expect(h.state.actionError).toBe(message);
      expect(h.state.dialog).toBeNull();
      expect(api.enclosures.list).toHaveBeenCalledTimes(1);
      expect(renderState({ ...h.state, items: h.state.items })).toContain(message);
    }
  });
});

describe("CA-09 enclosure-actions-global-search (eliminar y estado)", () => {
  it("eliminar el último de la página muestra la anterior; desactivar no cambia la página", () => {
    const items = many(10);

    expect(pageAfterDelete(items, 10, 2)).toBe(1);
    expect(pageAfterDelete(many(19), 3, 2)).toBe(2);
    // Desactivar no cambia la lista de ids: la página se conserva.
    expect(pageAfterCreate(items, items.map((i) => ({ ...i, is_active: false })), 2)).toBe(2);
  });
});
