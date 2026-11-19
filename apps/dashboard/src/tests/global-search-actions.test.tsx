import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { StaffProfile } from "@arca/api-client";
import { GlobalSearch } from "../components/GlobalSearch";
import { renderToStaticMarkup } from "react-dom/server";
import { createGlobalSearchController, orderSearchGroups, type SearchSectionInfo } from "../viewmodels/global-search";
import { getNavigationForProfile } from "../viewmodels/navigation";
import {
  pairedAction,
  searchActionCatalog,
  splitSearchQuery,
  visibleSearchActions,
} from "../viewmodels/search-actions";
import type { GlobalSearchViewModel } from "../viewmodels/useGlobalSearch";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

function profile(permissions: string[]): StaffProfile {
  return {
    id: 1,
    first_name: "P",
    last_name: "P",
    second_last_name: null,
    full_name: "P P",
    email: "p@test.arca.invalid",
    department: null,
    roles: ["admin"],
    permissions,
    home: "administration",
    pwa_url: null,
    two_factor_setup_required: false,
  };
}

const adminPermissions = [
  "dashboard.view", "users.manage", "enclosures.manage", "news.manage", "events.manage",
  "memories.review", "species.review", "tickets.view", "tickets.cancel", "reports.view", "ticket-prices.manage",
];
const visibleFor = (p: StaffProfile) =>
  visibleSearchActions(p.permissions, getNavigationForProfile(p).map((item) => item.id));
const admin = visibleFor(profile(adminPermissions));
const sections: SearchSectionInfo[] = getNavigationForProfile(profile(adminPermissions)).map(({ id, label, icon }) => ({ id, label, icon }));

describe("CA-32 enclosure-actions-global-search", () => {
  it("cada acción existe en su vista (su texto aparece en el código) y declara sección, permiso y sinónimos", () => {
    expect(searchActionCatalog).toHaveLength(29);

    for (const entry of searchActionCatalog) {
      expect(read(entry.evidence.file), entry.id).toContain(entry.evidence.text);
      expect(entry.permission, entry.id).toMatch(/\./);
      expect(entry.synonyms.length, entry.id).toBeGreaterThan(0);
      expect(entry.section, entry.id).toBeTruthy();
    }
  });

  it("solo Usuarios, Recintos e Historial declaran diálogo y no hay una acción llamada «QR»", () => {
    const opening = searchActionCatalog.filter((entry) => entry.opens).map((entry) => entry.section);

    expect(new Set(opening)).toEqual(new Set(["users", "enclosures", "ticket-history"]));
    expect(searchActionCatalog.some((entry) => /^qr$/i.test(entry.label))).toBe(false);
  });

  it("«QR» y «código QR» son sinónimos de Nueva venta (decisión de la sesión principal)", () => {
    const sale = searchActionCatalog.find((entry) => entry.id === "tickets.sale");

    expect(sale?.permission).toBe("tickets.create");
    expect(sale?.synonyms).toEqual(expect.arrayContaining(["qr", "código qr"]));
  });
});

describe("CA-33 enclosure-actions-global-search", () => {
  it("solo aparecen las acciones cuyo permiso figura en profile.permissions", () => {
    const only = visibleFor(profile(["dashboard.view", "enclosures.manage"]));

    expect(only.map((entry) => entry.permission)).toEqual(Array(only.length).fill("enclosures.manage"));
    expect(only.map((entry) => entry.id)).toContain("enclosures.delete");
    expect(admin.some((entry) => entry.id === "tickets.sale")).toBe(false);
    expect(visibleFor(profile(["dashboard.view", "tickets.create"])).map((entry) => entry.id)).toEqual(["tickets.sale"]);
    expect(visibleFor(profile([]))).toEqual([]);
  });

  it("«Cancelar boleto» exige tickets.cancel además del Historial", () => {
    expect(visibleFor(profile(["tickets.view"])).map((entry) => entry.id)).not.toContain("ticket-history.cancel");
    expect(visibleFor(profile(["tickets.view", "tickets.cancel"])).map((entry) => entry.id)).toContain("ticket-history.cancel");
  });
});

describe("CA-34 enclosure-actions-global-search", () => {
  const groups = [{ section: "users", label: "Usuarios", items: [{ id: 1, title: "Juan", subtitle: "j@x" }] }];

  it("«Acciones» va después de los grupos de la API y antes de «Secciones»", () => {
    const split = splitSearchQuery("reporte", admin);
    const ordered = orderSearchGroups(groups, null, sections, "reporte", { actions: split.actions, pairing: split.pairing });

    expect(ordered.map((group) => group.heading)).toEqual(["En Usuarios", "Acciones", "Secciones"]);
    const action = ordered[1].results[0];

    expect(action.isAction).toBe(true);
    expect(action.subtitle).toBe("Reporte de boletos");
  });

  it("sin acciones coincidentes no hay grupo", () => {
    const ordered = orderSearchGroups(groups, null, sections, "juan", { actions: splitSearchQuery("juan", admin).actions });

    expect(ordered.map((group) => group.heading)).not.toContain("Acciones");
  });

  it("muestra la etiqueta de la acción y su sección", () => {
    const split = splitSearchQuery("contraseña", admin);
    const display = orderSearchGroups([], null, sections, "contraseña", { actions: split.actions });
    const vm: GlobalSearchViewModel = {
      query: "contraseña", trimmedQuery: "contraseña", status: "ready", groups: display,
      results: display.flatMap((g) => g.results), open: true, activeIndex: -1,
      actions: { change() {}, focus() {}, blur() {}, keyDown: () => false, choose() {}, hover() {} },
    };
    const markup = renderToStaticMarkup(<GlobalSearch {...vm} />);

    expect(markup).toContain("Acciones");
    expect(markup).toContain("<mark>contraseña</mark>");
    expect(markup).toContain("Usuarios");
    expect(markup).not.toContain("Ir a:");
  });
});

describe("CA-35 enclosure-actions-global-search", () => {
  it("«contraseña juan»: la API recibe solo «juan» y el elemento de Usuarios muestra «Ir a: Restablecer contraseña»", () => {
    const split = splitSearchQuery("contraseña juan", admin);

    expect(split.apiQuery).toBe("juan");
    expect(split.pairing).toBe(true);
    expect(pairedAction(split.actions, "users")?.label).toBe("Restablecer contraseña");

    const display = orderSearchGroups(
      [{ section: "users", label: "Usuarios", items: [{ id: 4, title: "Juan López", subtitle: "j@x" }] }],
      null, sections, "contraseña juan", { actions: split.actions, pairing: split.pairing },
    );
    const item = display[0].results[0];

    expect(item.action?.label).toBe("Restablecer contraseña");
    expect(item.action?.opens).toBe("reset-password");

    const vm: GlobalSearchViewModel = {
      query: "contraseña juan", trimmedQuery: "contraseña juan", highlightTerm: split.rest, status: "ready",
      groups: display, results: display.flatMap((g) => g.results), open: true, activeIndex: -1,
      actions: { change() {}, focus() {}, blur() {}, keyDown: () => false, choose() {}, hover() {} },
    };

    expect(renderToStaticMarkup(<GlobalSearch {...vm} />)).toContain("Ir a: Restablecer contraseña");
  });

  it("con un resto de menos de 2 caracteres no hay llamada y solo aparece «Acciones»", async () => {
    vi.useFakeTimers();
    const search = vi.fn(async () => ({ groups: [] }));
    const controller = createGlobalSearchController(search, () => undefined, 300, (q) => splitSearchQuery(q, admin).apiQuery);

    controller.setQuery("contraseña j");
    vi.advanceTimersByTime(1000);
    expect(search).not.toHaveBeenCalled();
    expect(controller.snapshot().status).toBe("ready");
    expect(splitSearchQuery("contraseña j", admin).actions.length).toBeGreaterThan(0);
    vi.useRealTimers();
  });

  it("si todas las palabras son de acción la llamada usa la consulta completa y sin «Ir a»", async () => {
    vi.useFakeTimers();
    const search = vi.fn(async () => ({ groups: [] }));
    const controller = createGlobalSearchController(search, () => undefined, 300, (q) => splitSearchQuery(q, admin).apiQuery);

    controller.setQuery("contraseña");
    vi.advanceTimersByTime(300);
    expect(search).toHaveBeenCalledWith("contraseña");
    expect(splitSearchQuery("contraseña", admin).pairing).toBe(false);
    vi.useRealTimers();
  });

  it("sin palabras de acción la consulta pasa tal cual; «clara» no activa «Clave»", () => {
    expect(splitSearchQuery("elefante africano", admin).apiQuery).toBe("elefante africano");
    expect(splitSearchQuery("clara", admin).actions).toEqual([]);
    expect(splitSearchQuery("clara", admin).apiQuery).toBe("clara");
  });

  it("si hay varias acciones de la sección gana la primera del catálogo", () => {
    const split = splitSearchQuery("eliminar lobo", admin);

    expect(pairedAction(split.actions, "enclosures")?.id).toBe("enclosures.delete");
    expect(split.apiQuery).toBe("lobo");
  });
});
