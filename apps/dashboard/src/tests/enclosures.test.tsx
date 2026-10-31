import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { EnclosuresView } from "../views/EnclosuresView";
import {
  enclosuresReducer,
  initialEnclosuresState,
  loadEnclosures,
  saveEnclosure,
  type EnclosuresViewModel,
} from "../viewmodels/enclosures-management";
import { apiError, createAdminApiMock, createHarness, enclosure } from "./admin-fixtures";

const actions: EnclosuresViewModel["actions"] = {
  reload: vi.fn(),
  openDialog: vi.fn(),
  closeDialog: vi.fn(),
  dismissNotice: vi.fn(),
  save: vi.fn(),
};

const ready = {
  ...initialEnclosuresState,
  status: "ready" as const,
  items: [enclosure(), enclosure({ id: 6, name: "Aviario", animals_count: 1 })],
};

describe("CA-09 administration-sections", () => {
  it("lista los recintos con su número de animales, permite crear y renombrar, y no ofrece eliminar", () => {
    const markup = renderToStaticMarkup(<EnclosuresView state={ready} actions={actions} />);

    expect(markup).toContain("Zona de felinos");
    expect(markup).toContain("3 animales");
    expect(markup).toContain("1 animal<");
    expect(markup).toContain("Crear recinto");
    expect(markup).toContain("Renombrar");
    expect(markup).not.toContain("Eliminar");
    expect(markup).not.toContain("Prototipo de demostración");
  });

  it("crea y renombra recintos y recarga la lista", async () => {
    const api = createAdminApiMock();
    const h = createHarness(enclosuresReducer, ready);

    await loadEnclosures(api, h.dispatch);
    expect(h.state.status).toBe("ready");

    h.dispatch({ type: "dialog-opened", dialog: { kind: "create" } });
    await saveEnclosure(api, h.dispatch, h.state.dialog, "  Reptilario ");
    expect(api.enclosures.create).toHaveBeenCalledWith({ name: "Reptilario" });
    expect(h.state.notice).toBe("El recinto se creó correctamente.");
    expect(h.state.dialog).toBeNull();

    h.dispatch({ type: "dialog-opened", dialog: { kind: "rename", item: enclosure() } });
    await saveEnclosure(api, h.dispatch, h.state.dialog, "Felinos");
    expect(api.enclosures.rename).toHaveBeenCalledWith(5, { name: "Felinos" });
    expect(api.enclosures.list).toHaveBeenCalledTimes(3);
  });

  it("muestra el error de la API cuando el nombre está repetido", async () => {
    const api = createAdminApiMock();
    api.enclosures.rename.mockRejectedValueOnce(
      apiError(422, "Los datos no son válidos.", { name: ["Ya existe un recinto con ese nombre."] }),
    );
    const h = createHarness(enclosuresReducer, {
      ...ready,
      dialog: { kind: "rename" as const, item: enclosure() },
    });

    const ok = await saveEnclosure(api, h.dispatch, h.state.dialog, "aviario");
    const markup = renderToStaticMarkup(<EnclosuresView state={h.state} actions={actions} />);

    expect(ok).toBe(false);
    expect(h.state.dialog).not.toBeNull();
    expect(markup).toContain("Ya existe un recinto con ese nombre.");
    expect(markup).toContain('id="enclosure-name-error"');
    expect(markup).toContain('role="alert"');
  });
});
