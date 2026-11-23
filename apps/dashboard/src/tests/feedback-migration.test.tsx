import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DashboardNotifications } from "../components/DashboardNotifications";
import { StaffActionDialog } from "../components/StaffActionDialog";
import { staffAccount } from "./admin-fixtures";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const inlineAlert = /className="inline-alert"/;

describe("CA-25 unified-reports-and-feedback", () => {
  it("migra los mensajes de Usuarios", () => {
    const users = source("views/UsersView.tsx");

    // Errores generales: aviso; roles disponibles: estado de la vista con reintento.
    expect(users).toContain("<ActionError message={pendingAction === null ? state.actionError : \"\"} />");
    expect(users).toContain("actions.reloadOptions");
    expect(users).toMatch(/<ListStatusMessage[^>]*status="error"[^>]*error=\{state\.optionsError\}/s);
    expect(users).not.toMatch(inlineAlert);
    expect(source("viewmodels/useStaffAccounts.ts")).toContain("reloadOptions");

    // dashboard-020 revisión 2026-11-21 (b): el error de la acción va dentro del diálogo (D-3).
    const reset = source("components/StaffActionDialog.tsx");

    expect(reset).toContain("<ConfirmDialog");
    expect(reset).not.toMatch(inlineAlert);
    // El error de campo de la contraseña sigue junto al campo.
    expect(reset).toContain('<FieldErrors id={fieldId} errors={fieldErrors} name="password" />');

    const withProvider = renderToStaticMarkup(
      <DashboardNotifications>
        <StaffActionDialog
          pending={{ type: "reset-password", id: 7 }}
          account={staffAccount()}
          busy={false}
          error="No se pudo restablecer."
          fieldErrors={{ password: ["La contraseña es débil."] }}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      </DashboardNotifications>,
    );

    expect(withProvider).toContain("No se pudo restablecer.");
    expect(withProvider).toContain("dialog-alert");
    expect(withProvider).toContain("La contraseña es débil.");
  });
});

describe("CA-26 unified-reports-and-feedback", () => {
  it("migra los errores generales de Eventos, Noticias, Precios y Venta", () => {
    const events = source("views/EventsView.tsx");
    const prices = source("views/TicketPricesView.tsx");
    const sale = source("views/TicketSaleView.tsx");

    expect(events).toContain("<ActionError message={missingPending ? missingPendingMessage");
    expect(events).not.toMatch(inlineAlert);
    expect(source("views/NewsView.tsx")).toContain("<ActionError");
    expect(prices).toContain("<ActionError message={!state.twoFactorRequired");
    // El mensaje de 2FA (dashboard-005 CA-16) se mantiene en la sección (D-4).
    expect(prices).toContain("state.twoFactorRequired && (");
    expect(prices).toContain("Configura el segundo factor de autenticación para cambiar los precios.");
    expect(sale).toContain("<ActionError message={state.error} />");
  });
});

describe("CA-27 unified-reports-and-feedback", () => {
  it("ubica los errores de exportación y periodo de Cancelaciones", () => {
    const view = source("views/CancellationReportView.tsx");

    // Red o 5xx: aviso; 403: estado de la pestaña; 422: junto a su control.
    expect(view).toContain("<ActionError message={state.exportError} />");
    expect(view).toContain('state.status === "forbidden"');
    expect(view).toContain("periodFieldErrors(fieldErrors)");
    expect(view).toContain("fieldErrors={state.exportFieldErrors}");
    expect(view).not.toContain("generalFieldMessage");
    expect(view).not.toMatch(/<Alert role="alert">\{state\.exportError/);
    expect(source("viewmodels/cancellation-report.ts")).toContain('exportError: Object.keys(action.fieldErrors).length > 0 ? "" : action.message');
  });
});

describe("CA-28 unified-reports-and-feedback", () => {
  it("migra el aviso de consola y los errores generales de ficha", () => {
    // dashboard-017 (rev. 2026-11-21): el aviso de consola ya es emergente, sin banner ni error en línea.
    expect(source("components/ConsoleNoticesPublisher.tsx")).toContain('publish(message, "info")');
    expect(source("components/ConsoleNoticesPublisher.tsx")).toContain('publish(state.error, "error")');

    const ficha = source("components/SpeciesFichaForm.tsx");

    expect(ficha).toContain("<ActionError message={error ?? \"\"} />");
    expect(ficha).not.toMatch(inlineAlert);
    expect(source("components/ImageUploadBox.tsx")).toContain('className="field-error"'); // error de foto (dashboard-010 CA-81)
    expect(ficha).toContain("<FieldErrors");
  });
});
