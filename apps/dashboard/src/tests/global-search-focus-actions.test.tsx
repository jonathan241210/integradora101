import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { resolveSelection } from "../viewmodels/focus-target";
import { enclosureDialogForFocus } from "../viewmodels/enclosures-management";
import { pendingActionForFocus } from "../viewmodels/staff-accounts";
import { cancelTargetForFocus } from "../viewmodels/ticket-history";
import type { SearchResult } from "../viewmodels/global-search";
import { enclosure, staffAccount } from "./admin-fixtures";
import { historyRow } from "./ticket-sales-fixtures";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const allowed = ["users", "enclosures", "ticket-history", "tulanpedia", "news"];
const context = { text: "juan", nonce: 7, currentSection: "news" as const, allowedSections: allowed };

function result(overrides: Partial<SearchResult>): SearchResult {
  return {
    key: "k", section: "users", sectionLabel: "Usuarios", icon: "users", id: 4,
    title: "Juan", subtitle: "", isSection: false, ...overrides,
  };
}

describe("CA-36 enclosure-actions-global-search", () => {
  it("una acción sin elemento cambia de sección sin diálogo y sin datos", () => {
    const plan = resolveSelection(
      result({ id: null, isAction: true, action: { id: "users.reset-password", label: "Restablecer contraseña", opens: "reset-password", tab: null } }),
      context,
    );

    expect(plan).toEqual({ type: "section", section: "users", tab: null });
  });

  it("la acción de TulanPedia lleva la pestaña; una sección no permitida se ignora", () => {
    const tab = resolveSelection(
      result({ section: "tulanpedia", id: null, isAction: true, action: { id: "species.reject", label: "Rechazar solicitud", opens: null, tab: "requests" } }),
      context,
    );

    expect(tab).toEqual({ type: "section", section: "tulanpedia", tab: "requests" });
    expect(resolveSelection(result({ section: "reports", id: null, isAction: true }), context)).toEqual({ type: "ignore" });
  });
});

describe("CA-37 enclosure-actions-global-search", () => {
  const reset = { id: "users.reset-password", label: "Restablecer contraseña", opens: "reset-password" as const, tab: null };

  it("con elemento navega, ubica y lleva la acción por abrir, sin ejecutar nada", () => {
    const plan = resolveSelection(result({ action: reset }), context);

    expect(plan).toMatchObject({ type: "focus", navigate: true, target: { section: "users", id: 4, action: "reset-password", nonce: 7 } });
  });

  it("en la misma sección solo ubica", () => {
    const plan = resolveSelection(result({ action: reset }), { ...context, currentSection: "users" });

    expect(plan).toMatchObject({ type: "focus", navigate: false });
  });

  it("abrir el diálogo no llama a ningún método que cambie datos", () => {
    const api = { setStatus: vi.fn(), remove: vi.fn(), resetPassword: vi.fn(), cancel: vi.fn() };
    const items = [enclosure({ id: 5, is_active: true })];

    expect(enclosureDialogForFocus(items, { id: 5, action: "status" })).toMatchObject({ kind: "status" });
    expect(enclosureDialogForFocus(items, { id: 5, action: "delete" })).toMatchObject({ kind: "delete" });
    expect(pendingActionForFocus([staffAccount({ id: 4 })], { id: 4, action: "reset-password" })).toEqual({ type: "reset-password", id: 4 });
    expect(cancelTargetForFocus([historyRow({ folio: 7 })], { folio: "7", action: "cancel" })).toMatchObject({ folio: 7 });
    Object.values(api).forEach((fn) => expect(fn).not.toHaveBeenCalled());

    // Los hooks de foco solo despachan la apertura del diálogo; nunca la ejecución.
    for (const file of ["viewmodels/useEnclosuresManagement.ts", "viewmodels/useStaffAccounts.ts", "viewmodels/useTicketHistory.ts"]) {
      const source = read(file);
      const effect = source.slice(source.indexOf("Abre"), source.indexOf("Abre") + 700);

      expect(effect, file).toMatch(/dialog-opened|action-opened|cancel-opened/);
      expect(effect, file).not.toMatch(/setEnclosureStatus|deleteEnclosure|confirmStaffAction|cancelTicket\(/);
    }
  });
});

describe("CA-38 enclosure-actions-global-search", () => {
  it("Usuarios abre status, reset-password, reset-two-factor y delete; ignora las demás", () => {
    const items = [staffAccount({ id: 4 })];

    for (const type of ["status", "reset-password", "reset-two-factor", "delete"] as const) {
      expect(pendingActionForFocus(items, { id: 4, action: type })).toEqual({ type, id: 4 });
    }
    expect(pendingActionForFocus(items, { id: 4, action: "cancel" })).toBeNull();
    expect(pendingActionForFocus(items, { id: 99, action: "delete" })).toBeNull();
    expect(pendingActionForFocus(items, { id: 4 })).toBeNull();
  });

  it("Recintos abre estado (solo si está activo) y eliminación", () => {
    const items = [enclosure({ id: 5, is_active: false }), enclosure({ id: 6, is_active: true })];

    expect(enclosureDialogForFocus(items, { id: 5, action: "status" })).toBeNull();
    expect(enclosureDialogForFocus(items, { id: 5, action: "delete" })).toMatchObject({ kind: "delete" });
    expect(enclosureDialogForFocus(items, { id: 6, action: "status" })).toMatchObject({ kind: "status" });
    expect(enclosureDialogForFocus(items, { id: 6, action: "cancel" })).toBeNull();
    expect(enclosureDialogForFocus(items, { id: 99, action: "delete" })).toBeNull();
  });

  it("Historial abre la cancelación solo de la fila cancelable localizada", () => {
    const rows = [historyRow({ folio: 7 }), historyRow({ folio: 8, cancellable: false })];

    expect(cancelTargetForFocus(rows, { folio: "7", action: "cancel" })?.folio).toBe(7);
    expect(cancelTargetForFocus(rows, { folio: "8", action: "cancel" })).toBeNull();
    expect(cancelTargetForFocus(rows, { folio: "7" })).toBeNull();
  });

  it("las cuentas llevan data-search-id=users:<id> y las demás secciones no reciben la acción", () => {
    expect(read("views/UsersView.tsx")).toContain("`users:${account.id}`");
    expect(read("views/TicketHistoryView.tsx")).toContain("ticket-history:");
    for (const file of ["sections/NewsSection.tsx", "sections/MemoriesSection.tsx", "sections/TulanpediaSection.tsx"]) {
      expect(read(file), file).not.toMatch(/focus\??\.action/);
    }
    const app = read("App.tsx");

    expect(app).toContain('<UsersSection focus={focusFor("users")} />');
    expect(app).toContain("action: focusTarget.action");
  });
});
