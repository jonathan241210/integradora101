import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StaffProfile } from "@arca/api-client";

const mocked = vi.hoisted(() => ({ override: null as null | (() => unknown) }));

vi.mock("../viewmodels/useEnclosureQr", async (importActual) => {
  const actual = await importActual<typeof import("../viewmodels/useEnclosureQr")>();

  return {
    ...actual,
    useEnclosureQr: (...args: Parameters<typeof actual.useEnclosureQr>) =>
      mocked.override ? (mocked.override() as ReturnType<typeof actual.useEnclosureQr>) : actual.useEnclosureQr(...args),
  };
});

import { EnclosureQrDialog, EnclosureQrSheet } from "../components/EnclosureQrDialog";
import { EnclosuresView } from "../views/EnclosuresView";
import {
  clampPage,
  enclosureDialogForFocus,
  enclosurePage,
  enclosurePageCount,
  enclosuresReducer,
  getEnclosureConfirmation,
  getEnclosureWarning,
  initialEnclosuresState,
  qrDialogForCard,
  type EnclosuresViewModel,
} from "../viewmodels/enclosures-management";
import {
  enclosureQrReducer,
  generateEnclosureQr,
  hasActiveQr,
  initialEnclosureQrState,
  loadEnclosureQr,
  qrCardButton,
  qrDialogButtons,
  qrDialogTitle,
  qrImageAlt,
  qrImageSource,
  regenerateConfirmation,
  regenerateEnclosureQr,
  QR_TEXTS,
  type EnclosureQrApi,
  type EnclosureQrState,
} from "../viewmodels/enclosure-qr";
import { qrFocusAction, resolveSelection } from "../viewmodels/focus-target";
import { rankActions, searchActionCatalog, splitSearchQuery, visibleSearchActions } from "../viewmodels/search-actions";
import { getNavigationForProfile } from "../viewmodels/navigation";
import { orderSearchGroups } from "../viewmodels/global-search";
import { useEnclosureQr, type EnclosureQrViewModel } from "../viewmodels/useEnclosureQr";
import { createAdminApiMock, createHarness, enclosure, enclosureQr } from "./admin-fixtures";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const styles = read("styles.css");
const qrStyles = styles.slice(styles.indexOf("enclosure-qr:start"), styles.indexOf("enclosure-qr:end"));
const info = { id: 5, name: "Lobos", is_active: true };

afterEach(() => {
  mocked.override = null;
  vi.unstubAllGlobals();
});

const noopActions: EnclosuresViewModel["actions"] = {
  reload: vi.fn(), openDialog: vi.fn(), closeDialog: vi.fn(), dismissNotice: vi.fn(), save: vi.fn(),
  goToPage: vi.fn(), toggleStatus: vi.fn(), requestDelete: vi.fn(), confirm: vi.fn(),
  openQr: vi.fn(), setHasQr: vi.fn(), qrNotFound: vi.fn(),
};

function renderList(items: ReturnType<typeof enclosure>[], canManage = true, dialog: EnclosuresViewModel["state"]["dialog"] = null) {
  const state = { ...initialEnclosuresState, status: "ready" as const, items, dialog };

  return renderToStaticMarkup(
    <EnclosuresView state={state} actions={noopActions} canManage={canManage} page={1}
      pageCount={enclosurePageCount(items.length)} pageItems={enclosurePage(items, 1)} />,
  );
}

function qrState(overrides: Partial<EnclosureQrState> = {}): EnclosureQrState {
  return { ...initialEnclosureQrState(info, "view"), status: "ready", data: enclosureQr({ code: "ARCA-ABCD2345" }, info), ...overrides };
}

function renderDialog(state: EnclosureQrState, focus: "view" | "print" | "regenerate" = "view") {
  const viewModel: EnclosureQrViewModel = {
    state,
    actions: { retry: vi.fn(), generate: vi.fn(), requestRegenerate: vi.fn(), cancelRegenerate: vi.fn(), confirmRegenerate: vi.fn(), print: vi.fn() },
  };

  mocked.override = () => viewModel;

  return renderToStaticMarkup(
    <EnclosureQrDialog enclosure={info} intent="view" focus={focus} onClose={vi.fn()} onHasQr={vi.fn()} onNotFound={vi.fn()} />,
  );
}

const callbacks = () => ({ onHasQr: vi.fn(), onNotFound: vi.fn() });
const apiWith = (overrides: Partial<EnclosureQrApi["enclosures"]> = {}) => {
  const api = createAdminApiMock();

  Object.assign(api.enclosures, overrides);

  return api as unknown as EnclosureQrApi & ReturnType<typeof createAdminApiMock>;
};

function run<A>(reducer: (s: EnclosureQrState, a: A) => EnclosureQrState, state: EnclosureQrState) {
  return createHarness(reducer, state);
}

function profile(permissions: string[]): StaffProfile {
  return {
    id: 1, first_name: "P", last_name: "P", second_last_name: null, full_name: "P P", email: "p@test.arca.invalid",
    department: null, roles: ["admin"], permissions, home: "administration", pwa_url: null, two_factor_setup_required: false,
  };
}
const visibleFor = (permissions: string[]) => {
  const p = profile(permissions);

  return visibleSearchActions(p.permissions, getNavigationForProfile(p).map((item) => item.id));
};
const qrIds = (query: string, permissions: string[]) => {
  const visible = visibleFor(permissions);

  return rankActions(query, splitSearchQuery(query, visible).actions).map((entry) => entry.id);
};

describe("CA-01 enclosure-qr-printing", () => {
  it("muestra «Ver QR» con código activo y «Generar QR» con la insignia «Sin QR» sin él", () => {
    const withQr = renderList([enclosure({ id: 1, name: "Lobos", has_active_qr: true })]);
    const without = renderList([enclosure({ id: 2, name: "Osos", has_active_qr: false })]);

    expect(withQr).toContain('aria-label="Ver QR del recinto Lobos"');
    expect(withQr).toContain(">Ver QR<");
    expect(withQr).not.toContain("Sin QR");
    expect(without).toContain('aria-label="Generar QR del recinto Osos"');
    expect(without).toContain(">Generar QR<");
    expect(without).toContain("Sin QR");
    expect(qrCardButton(true, "Lobos").ariaLabel).toBe("Ver QR del recinto Lobos");
  });

  it("sin enclosures.manage no se muestra ningún botón ni insignia de QR", () => {
    const markup = renderList([enclosure({ has_active_qr: false })], false);

    expect(markup).not.toContain("QR");
  });
});

describe("CA-02 enclosure-qr-printing", () => {
  it("abrir «Ver QR» consulta una sola vez y no genera ni regenera", async () => {
    const api = apiWith();
    const harness = run(enclosureQrReducer, initialEnclosureQrState(info, "view"));

    expect(qrDialogForCard(enclosure({ has_active_qr: true }))).toMatchObject({ kind: "qr", intent: "view" });
    await loadEnclosureQr(api, 5, harness.dispatch, callbacks());
    expect(api.enclosures.qr).toHaveBeenCalledTimes(1);
    expect(api.enclosures.qr).toHaveBeenCalledWith(5);
    expect(api.enclosures.generateQr).not.toHaveBeenCalled();
    expect(api.enclosures.regenerateQr).not.toHaveBeenCalled();
  });

  it("mientras carga muestra «Cargando QR…» en un role=status", () => {
    const markup = renderDialog({ ...initialEnclosureQrState(info, "view") });

    expect(markup).toMatch(/<p role="status"[^>]*>Cargando QR…<\/p>/);
  });
});

describe("CA-03 enclosure-qr-printing", () => {
  it("muestra título, imagen con alt, código monoespaciado y los tres botones", () => {
    const markup = renderDialog(qrState());

    expect(markup).toContain("QR del recinto «Lobos»");
    expect(qrDialogTitle("Lobos")).toBe("QR del recinto «Lobos»");
    expect(markup).toContain(`alt="${qrImageAlt("Lobos")}"`);
    expect(markup).toContain('alt="Código QR del recinto Lobos"');
    expect(markup).toContain("ARCA-ABCD2345");
    expect(markup).toContain(">Imprimir<");
    expect(markup).toContain(">Regenerar QR<");
    expect(markup).toContain(">Cerrar<");
    expect(qrStyles).toMatch(/\.enclosure-qr__code[^}]*monospace/);
  });

  it("Esc y «Cerrar» cierran con onClose del Dialog y el foco vuelve al disparador", () => {
    const ui = readFileSync(new URL("../../../../packages/ui/src/index.tsx", import.meta.url), "utf8");
    const dialog = read("components/EnclosureQrDialog.tsx");

    expect(ui).toContain("onCancel");
    expect(ui).toContain("dialog.close()");
    expect(dialog).toContain("onClick={onClose}");
    expect(dialog).toContain("onClose={onClose}");
  });
});

describe("CA-04 enclosure-qr-printing", () => {
  it("«Generar QR» llama una vez a generateQr sin confirmación y la tarjeta pasa a «Ver QR»", async () => {
    const api = apiWith({ generateQr: vi.fn(async () => enclosureQr({ code: "ARCA-GEN12345" }, info)) });
    const cb = callbacks();
    const harness = run(enclosureQrReducer, initialEnclosureQrState(info, "generate"));
    const list = createHarness(enclosuresReducer, { ...initialEnclosuresState, status: "ready" as const, items: [enclosure({ id: 5, has_active_qr: false })] });

    expect(qrDialogForCard(enclosure({ has_active_qr: false }))).toMatchObject({ kind: "qr", intent: "generate" });
    await generateEnclosureQr(api, 5, harness.dispatch, cb);
    expect(api.enclosures.generateQr).toHaveBeenCalledTimes(1);
    expect(harness.state.confirmingRegenerate).toBe(false);
    expect(harness.state.data?.qr?.code).toBe("ARCA-GEN12345");
    expect(cb.onHasQr).toHaveBeenCalledWith(true);
    list.dispatch({ type: "qr-status-set", id: 5, hasQr: true });
    expect(hasActiveQr(list.state.items[0])).toBe(true);
  });
});

describe("CA-05 enclosure-qr-printing", () => {
  it("regenerar pide ConfirmDialog de peligro con el texto exacto y no llama a la API hasta confirmar", () => {
    const api = apiWith();
    const harness = run(enclosureQrReducer, qrState());

    harness.dispatch({ type: "regenerate-requested" });
    expect(harness.state.confirmingRegenerate).toBe(true);
    expect(api.enclosures.regenerateQr).not.toHaveBeenCalled();
    const copy = regenerateConfirmation("Lobos");

    expect(copy.danger).toBe(true);
    expect(copy.title).toBe("¿Regenerar el QR del recinto «Lobos»?");
    expect(copy.message).toBe(
      "Los QR impresos anteriormente dejarán de funcionar, incluidos los escaneos pendientes de sincronizar. El progreso que los visitantes ya obtuvieron se conserva. Tendrás que imprimir y colocar el nuevo.",
    );
    const markup = renderDialog(harness.state);

    expect(markup).toContain("¿Regenerar el QR del recinto «Lobos»?");
    expect(markup).toContain(copy.message);
  });

  it("cancelar no cambia nada y no llama a la API", () => {
    const api = apiWith();
    const harness = run(enclosureQrReducer, { ...qrState(), confirmingRegenerate: true });

    harness.dispatch({ type: "regenerate-cancelled" });
    expect(harness.state.confirmingRegenerate).toBe(false);
    expect(harness.state.data?.qr?.code).toBe("ARCA-ABCD2345");
    expect(api.enclosures.regenerateQr).not.toHaveBeenCalled();
  });
});

describe("CA-06 enclosure-qr-printing", () => {
  it("confirmar llama una vez a regenerateQr y muestra el código nuevo con el aviso en role=status", async () => {
    const api = apiWith({ regenerateQr: vi.fn(async () => ({ ...enclosureQr({ code: "ARCA-NEW23456" }, info), deactivated: 1 })) as never });
    const harness = run(enclosureQrReducer, { ...qrState(), confirmingRegenerate: true });

    await regenerateEnclosureQr(api, 5, harness.dispatch, callbacks());
    expect(api.enclosures.regenerateQr).toHaveBeenCalledTimes(1);
    expect(harness.state.data?.qr?.code).toBe("ARCA-NEW23456");
    expect(harness.state.confirmingRegenerate).toBe(false);
    const markup = renderDialog(harness.state);

    expect(markup).toContain("ARCA-NEW23456");
    expect(markup).not.toContain("ARCA-ABCD2345");
    expect(markup).toMatch(/role="status"[^>]*>Código QR regenerado\. Imprime y coloca el nuevo\./);
  });
});

describe("CA-07 enclosure-qr-printing", () => {
  it("un recinto inactivo muestra el aviso y los botones siguen habilitados", () => {
    const state = qrState({ data: enclosureQr({ code: "ARCA-ABCD2345" }, { ...info, is_active: false }) });
    const markup = renderDialog(state);

    expect(markup).toContain(
      "Este recinto está inactivo. Los visitantes no podrán escanear este código hasta que lo actives.",
    );
    expect(qrDialogButtons(state).disabled).toBe(false);
    expect(markup).not.toMatch(/<button[^>]*disabled[^>]*>Imprimir/);
  });
});

describe("CA-08 enclosure-qr-printing", () => {
  it("«Imprimir» llama una vez a window.print y no genera ni regenera", () => {
    const print = vi.fn();
    const api = apiWith();
    let captured: EnclosureQrViewModel | null = null;

    vi.stubGlobal("window", { print });
    function Probe() {
      captured = useEnclosureQr(info, "view", callbacks(), api);

      return null;
    }
    renderToStaticMarkup(<Probe />);
    captured!.actions.print();
    expect(print).toHaveBeenCalledTimes(1);
    expect(api.enclosures.generateQr).not.toHaveBeenCalled();
    expect(api.enclosures.regenerateQr).not.toHaveBeenCalled();
  });
});

describe("CA-09 enclosure-qr-printing", () => {
  it("#enclosure-qr-print contiene solo el nombre, el QR y el código", () => {
    const markup = renderToStaticMarkup(<EnclosureQrSheet name="Lobos" qr={{ code: "ARCA-ABCD2345", svg: "<svg/>" }} />);

    expect(markup).toContain('id="enclosure-qr-print"');
    expect(markup).toContain("<h1");
    expect(markup).toContain(">Lobos</h1>");
    expect(markup).toContain("<img");
    expect(markup).toContain("ARCA-ABCD2345");
    expect(markup).not.toMatch(/<button|<nav|<a |<ul|<li/);
    expect(markup.match(/<h1/g)).toHaveLength(1);
  });
});

describe("CA-10 enclosure-qr-printing", () => {
  it("styles.css oculta el resto de la interfaz al imprimir y fija el QR en al menos 70 mm", () => {
    expect(qrStyles).toContain("@media print");
    expect(qrStyles).toMatch(/\*:not\(#enclosure-qr-print\)\s*\{\s*display:\s*none\s*!important/);
    expect(qrStyles).toMatch(/min-width:\s*70mm/);
    expect(qrStyles).toMatch(/min-height:\s*70mm/);
    expect(qrStyles).toMatch(/\.enclosure-qr-sheet\s*\{\s*display:\s*none/);
  });
});

describe("CA-11 enclosure-qr-printing", () => {
  const failing = (error: unknown) => apiWith({ qr: vi.fn(async () => { throw error; }) });

  it("403 muestra el permiso y 404 cierra el diálogo con «Recinto no encontrado.»", async () => {
    const forbidden = run(enclosureQrReducer, initialEnclosureQrState(info, "view"));
    const cb = callbacks();

    await loadEnclosureQr(failing({ status: 403, message: "x" }), 5, forbidden.dispatch, cb);
    expect(forbidden.state.loadError).toBe("No tienes permiso para realizar esta acción.");
    expect(forbidden.state.canRetry).toBe(false);

    const missing = run(enclosureQrReducer, initialEnclosureQrState(info, "view"));

    await loadEnclosureQr(failing({ status: 404, message: "x" }), 5, missing.dispatch, cb);
    expect(cb.onNotFound).toHaveBeenCalledWith("Recinto no encontrado.");
  });

  it("500 o sin conexión muestran el error con «Reintentar» que solo llama a qr(id)", async () => {
    for (const error of [{ status: 500, message: "x" }, new Error("network")]) {
      const api = failing(error);
      const harness = run(enclosureQrReducer, initialEnclosureQrState(info, "view"));

      await loadEnclosureQr(api, 5, harness.dispatch, callbacks());
      expect(harness.state.loadError).toBe("No pudimos cargar el QR. Inténtalo de nuevo.");
      expect(harness.state.canRetry).toBe(true);
      expect(renderDialog(harness.state)).toContain(">Reintentar<");
      await loadEnclosureQr(api, 5, harness.dispatch, callbacks());
      expect(api.enclosures.qr).toHaveBeenCalledTimes(2);
      expect(api.enclosures.generateQr).not.toHaveBeenCalled();
      expect(api.enclosures.regenerateQr).not.toHaveBeenCalled();
    }
  });
});

describe("CA-12 enclosure-qr-printing", () => {
  it("un error al generar no cambia la tarjeta y muestra el mensaje", async () => {
    const api = apiWith({ generateQr: vi.fn(async () => { throw { status: 500, message: "x" }; }) });
    const cb = callbacks();
    const harness = run(enclosureQrReducer, initialEnclosureQrState(info, "generate"));

    await generateEnclosureQr(api, 5, harness.dispatch, cb);
    expect(harness.state.actionError).toBe("No pudimos generar el QR. Inténtalo de nuevo.");
    expect(cb.onHasQr).not.toHaveBeenCalled();
    expect(renderDialog(harness.state)).toContain("No pudimos generar el QR. Inténtalo de nuevo.");
  });

  it("un error al regenerar conserva el código anterior", async () => {
    const api = apiWith({ regenerateQr: vi.fn(async () => { throw { status: 500, message: "x" }; }) as never });
    const harness = run(enclosureQrReducer, qrState());

    await regenerateEnclosureQr(api, 5, harness.dispatch, callbacks());
    expect(harness.state.actionError).toBe("No pudimos regenerar el QR. Inténtalo de nuevo.");
    expect(harness.state.data?.qr?.code).toBe("ARCA-ABCD2345");
    const markup = renderDialog(harness.state);

    expect(markup).toContain("ARCA-ABCD2345");
    expect(markup).toContain("No pudimos regenerar el QR. Inténtalo de nuevo.");
  });
});

describe("CA-13 enclosure-qr-printing", () => {
  it("el código no aparece en la lista ni en los resultados del buscador", () => {
    const markup = renderList([enclosure({ id: 1, name: "Lobos" }), enclosure({ id: 2, name: "Osos", has_active_qr: false })]);

    expect(markup).not.toContain("ARCA-");
    expect(markup).not.toContain("<svg");
    const groups = [{ section: "enclosures", label: "Recintos", items: [{ id: 1, title: "Lobos", subtitle: "2 animales" }] }];
    const ordered = JSON.stringify(orderSearchGroups(groups, null, [], "lobos"));

    expect(ordered).not.toContain("ARCA-");
    expect(ordered).not.toContain("svg");
  });
});

describe("CA-14 enclosure-qr-printing", () => {
  it("la vista y el hook no usan almacenamiento, cookies, URL ni logs", () => {
    for (const file of ["components/EnclosureQrDialog.tsx", "viewmodels/useEnclosureQr.ts", "viewmodels/enclosure-qr.ts"]) {
      const source = read(file);

      expect(source, file).not.toMatch(/localStorage|sessionStorage|document\.cookie|history\.|location\.|console\.|indexedDB/);
    }
  });
});

describe("CA-15 enclosure-qr-printing", () => {
  it("tiene role de diálogo, aria-modal, nombre por título y foco inicial en «Imprimir»", () => {
    const ui = readFileSync(new URL("../../../../packages/ui/src/index.tsx", import.meta.url), "utf8");
    const dialog = read("components/EnclosureQrDialog.tsx");
    const markup = renderDialog(qrState());

    expect(markup).toContain("<dialog");
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toMatch(/aria-labelledby="dialog-title-[^"]+"/);
    expect(ui).toContain('aria-modal="true"');
    expect(dialog).toContain("printRef.current");
    expect(dialog).toContain("target?.focus()");
    expect(markup).toContain('alt="Código QR del recinto Lobos"');
    expect(markup).toMatch(/<p class="enclosure-qr__code">ARCA-ABCD2345<\/p>/);
  });
});

describe("CA-16 enclosure-qr-printing", () => {
  it("tras generar o regenerar la página y el orden no cambian y el indicador se actualiza", () => {
    const items = Array.from({ length: 10 }, (_, i) => enclosure({ id: i + 1, name: `R${i + 1}`, has_active_qr: i !== 9 }));
    const harness = createHarness(enclosuresReducer, { ...initialEnclosuresState, status: "ready" as const, items });

    harness.dispatch({ type: "qr-status-set", id: 10, hasQr: true });
    expect(harness.state.items.map((e) => e.id)).toEqual(items.map((e) => e.id));
    expect(hasActiveQr(harness.state.items[9])).toBe(true);
    expect(clampPage(2, enclosurePageCount(harness.state.items.length))).toBe(2);
    expect(enclosurePage(harness.state.items, 2).map((e) => e.id)).toEqual([10]);
  });
});

describe("CA-17 enclosure-qr-printing", () => {
  it("los bloques nuevos de styles.css no usan hexadecimales ni rgb(", () => {
    expect(qrStyles.length).toBeGreaterThan(100);
    expect(qrStyles).not.toMatch(/#[0-9a-fA-F]{3,8}\b(?!\s*[,{)])/);
    expect(qrStyles.replace(/#enclosure-qr-print/g, "")).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(qrStyles).not.toMatch(/rgba?\(/);
  });
});

describe("CA-18 enclosure-qr-printing", () => {
  const all = ["enclosures.manage", "tickets.create", "dashboard.view"];

  it("«qr», «código qr», «qr recinto», «imprimir qr» y «regenerar qr» muestran «QR del recinto»", () => {
    for (const query of ["qr", "código qr", "qr recinto", "imprimir qr", "regenerar qr"]) {
      expect(qrIds(query, all), query).toContain("enclosures.qr");
    }
    const entry = searchActionCatalog.find((item) => item.id === "enclosures.qr");

    expect(entry).toMatchObject({ label: "QR del recinto", permission: "enclosures.manage", opens: "qr", section: "enclosures" });
  });

  it("elegirla con un recinto abre el diálogo con el foco según el término y no ejecuta nada", () => {
    const print = vi.fn();
    const api = apiWith();
    const items = [enclosure({ id: 5, name: "Lobos" })];
    const result = { section: "enclosures", id: 5, kind: undefined, isSection: false, isAction: false,
      action: { id: "enclosures.qr", label: "QR del recinto", opens: "qr" as const, tab: null } };
    const focusFor = (text: string) => {
      const plan = resolveSelection(result, { text, nonce: 1, currentSection: "enclosures", allowedSections: ["enclosures"] });

      return plan.type === "focus" ? plan.target.action : undefined;
    };

    vi.stubGlobal("window", { print });
    expect(qrFocusAction("imprimir qr recinto lobos")).toBe("qr-print");
    expect(focusFor("imprimir qr recinto lobos")).toBe("qr-print");
    expect(focusFor("regenerar qr")).toBe("qr-regenerate");
    expect(focusFor("qr lobos")).toBe("qr");
    expect(enclosureDialogForFocus(items, { id: 5, action: "qr-print" })).toMatchObject({ kind: "qr", intent: "view", focus: "print" });
    expect(enclosureDialogForFocus(items, { id: 5, action: "qr-regenerate" })).toMatchObject({ focus: "regenerate" });
    expect(enclosureDialogForFocus(items, { id: 5, action: "qr" })).toMatchObject({ focus: "view" });
    expect(api.enclosures.generateQr).not.toHaveBeenCalled();
    expect(api.enclosures.regenerateQr).not.toHaveBeenCalled();
    expect(print).not.toHaveBeenCalled();
  });
});

describe("CA-18 enclosure-qr-printing · flujo del buscador", () => {
  it("«imprimir qr recinto lobos» empareja el recinto con «QR del recinto» y el foco en Imprimir", () => {
    const query = "imprimir qr recinto lobos";
    const split = splitSearchQuery(query, visibleFor(["enclosures.manage", "tickets.create", "dashboard.view"]));
    const groups = [{ section: "enclosures", label: "Recintos", items: [{ id: 5, title: "Lobos", subtitle: "3 animales" }] }];
    const ordered = orderSearchGroups(groups, null, [], query, { actions: split.actions, pairing: split.pairing });
    const hit = ordered[0].results[0];

    expect(split.rest).toBe("recinto lobos");
    expect(split.apiQuery).toBe("lobos");
    expect(hit.action).toMatchObject({ label: "QR del recinto", opens: "qr" });
    const plan = resolveSelection(hit, { text: query, nonce: 1, currentSection: "enclosures", allowedSections: ["enclosures"] });

    expect(plan).toMatchObject({ type: "focus", target: { action: "qr-print", id: 5 } });
  });
});

describe("CA-19 enclosure-qr-printing", () => {
  it("sin enclosures.manage no aparece ninguna acción de QR de recinto", () => {
    expect(qrIds("qr del recinto", ["dashboard.view", "tickets.create"])).not.toContain("enclosures.qr");
    expect(visibleFor(["dashboard.view"]).map((e) => e.id)).not.toContain("enclosures.qr");
  });
});

describe("CA-20 enclosure-qr-printing", () => {
  it("«qr» muestra «QR del recinto» y «Nueva venta» según los permisos (cuatro casos)", () => {
    expect(qrIds("qr", ["enclosures.manage", "tickets.create"]).sort()).toEqual(["enclosures.qr", "tickets.sale"]);
    expect(qrIds("qr", ["enclosures.manage"])).toEqual(["enclosures.qr"]);
    expect(qrIds("qr", ["tickets.create"])).toEqual(["tickets.sale"]);
    expect(qrIds("qr", [])).toEqual([]);
  });
});

describe("CA-21 enclosure-qr-printing", () => {
  it("hay un describe por CA-01 a CA-23, registrado en administration-coverage y con cliente simulado", () => {
    const directory = fileURLToPath(new URL(".", import.meta.url));
    const source = readdirSync(directory)
      .filter((name) => name.endsWith(".test.tsx"))
      .map((name) => readFileSync(`${directory}/${name}`, "utf8"))
      .join("\n");

    for (let number = 1; number <= 23; number += 1) {
      expect(source).toContain(`describe("CA-${String(number).padStart(2, "0")} enclosure-qr-printing"`);
    }
    expect(read("tests/administration-coverage.test.tsx")).toContain("enclosure-qr-printing");
    expect(read("tests/admin-fixtures.ts")).toContain("generateQr: vi.fn");
  });
});

describe("CA-22 enclosure-qr-printing", () => {
  it("la vista no usa fetch ni axios y solo llama al hook useEnclosureQr", () => {
    for (const file of ["components/EnclosureQrDialog.tsx", "views/EnclosuresView.tsx", "viewmodels/useEnclosureQr.ts", "viewmodels/enclosure-qr.ts"]) {
      expect(read(file), file).not.toMatch(/fetch\(|axios/);
    }
    const dialog = read("components/EnclosureQrDialog.tsx");

    expect(dialog).toContain("useEnclosureQr");
    expect(dialog).not.toContain("adminApi");
    expect(dialog).not.toContain("@arca/api-client");
    expect(dialog).not.toMatch(/dangerouslySetInnerHTML|innerHTML|document\.write/);
    expect(qrImageSource("<svg a=\"1\"/>")).toBe(`data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg a="1"/>')}`);
  });
});

describe("CA-23 enclosure-qr-printing", () => {
  it("eliminar un recinto con QR añade «Sus códigos QR dejarán de funcionar.» y cancelar no cambia nada", () => {
    const item = enclosure({ name: "Lobos", animals_count: 2, has_active_qr: true });
    const copy = getEnclosureConfirmation({ kind: "delete", item });

    expect(copy?.danger).toBe(true);
    expect(copy?.message).toBe(
      "¿Eliminar el recinto «Lobos»? Desaparecerá del panel, del portal y de la app. Esta acción no se puede deshacer desde el panel. Sus códigos QR dejarán de funcionar.",
    );
    expect(getEnclosureWarning({ kind: "delete", item })).toBe("Tiene 2 animales asignados.");
    const harness = createHarness(enclosuresReducer, { ...initialEnclosuresState, status: "ready" as const, items: [item] });

    harness.dispatch({ type: "dialog-opened", dialog: { kind: "delete", item } });
    harness.dispatch({ type: "dialog-closed" });
    expect(harness.state.items).toEqual([item]);
    expect(harness.state.dialog).toBeNull();
    expect(QR_TEXTS.badgeWithoutQr).toBe("Sin QR");
  });
});
