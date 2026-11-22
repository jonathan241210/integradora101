import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ActionError, DashboardNotifications } from "../components/DashboardNotifications";
import { FieldErrors } from "../components/FieldErrors";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { ListStatusMessage } from "../components/ListStatusMessage";
import {
  actionErrorPresentation,
  feedbackCategory,
  isFieldError,
  type FeedbackSource,
} from "../viewmodels/feedback-policy";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const noop = () => undefined;
const copy = { label: "Eliminar", message: "¿Eliminar?", confirmLabel: "Eliminar", danger: true };

describe("CA-19 unified-reports-and-feedback", () => {
  it("todo error general de acción fuera de diálogo se publica como aviso", () => {
    const toasts: FeedbackSource[] = ["action-success", "action-error", "export-network-error"];

    for (const item of toasts) expect(feedbackCategory(item)).toBe("toast");
    expect(actionErrorPresentation({ inDialog: false, hasProvider: true })).toEqual({
      publishToast: true,
      renderInline: false,
    });
    // Mismo mecanismo para las acciones de cada sección (ActionError o NoticeBar).
    for (const file of [
      "views/UsersView.tsx",
      "views/EventsView.tsx",
      "views/NewsView.tsx",
      "views/TicketPricesView.tsx",
      "views/TicketSaleView.tsx",
      "views/EnclosuresView.tsx",
      "views/CancellationReportView.tsx",
      "views/TicketReportView.tsx",
      "components/SpeciesFichaForm.tsx",
    ]) {
      expect(source(file), file).toMatch(/<ActionError|<NoticeBar/);
    }
  });
});

describe("CA-20 unified-reports-and-feedback", () => {
  it("ActionError no repite el texto en línea fuera de diálogos", () => {
    const withProvider = renderToStaticMarkup(
      <DashboardNotifications>
        <ActionError message="No se pudo guardar." />
      </DashboardNotifications>,
    );
    const withoutProvider = renderToStaticMarkup(<ActionError message="No se pudo guardar." />);

    expect(withProvider).not.toContain("No se pudo guardar.");
    expect(withProvider).not.toContain("action-error");
    // Sin proveedor (componente aislado) el texto no se pierde.
    expect(withoutProvider).toContain("No se pudo guardar.");
    expect(actionErrorPresentation({ inDialog: false, hasProvider: false }).renderInline).toBe(true);
    expect(source("components/DashboardNotifications.tsx")).not.toContain('role={hasNotifications && !inDialog ? "none" : "alert"}');
  });
});

describe("CA-21 unified-reports-and-feedback", () => {
  it("los errores de campo siguen junto a su campo", () => {
    const markup = renderToStaticMarkup(
      <DashboardNotifications>
        <FieldErrors id="staff-email" errors={{ email: ["El correo ya existe."] }} name="email" />
      </DashboardNotifications>,
    );

    expect(markup).toContain("El correo ya existe.");
    expect(markup).toContain('id="staff-email-error"');
    expect(isFieldError("field-validation")).toBe(true);
    expect(feedbackCategory("field-validation")).toBe("field");
    expect(source("components/FieldErrors.tsx")).not.toMatch(/usePublish|ActionError/);
    // Con errores de campo, Precios no repite el general como aviso.
    expect(source("views/TicketPricesView.tsx")).toContain("Object.keys(fieldErrors).length === 0 ? state.actionError");
  });
});

describe("CA-22 unified-reports-and-feedback", () => {
  it("los diálogos y confirmaciones mantienen su error", () => {
    const markup = renderToStaticMarkup(
      <DashboardNotifications>
        <ConfirmDialog copy={{ ...copy, title: copy.label }} idleTitle="Acción" busy={false} error="No se pudo eliminar." onConfirm={noop} onCancel={noop} />
      </DashboardNotifications>,
    );

    expect(markup).toContain("No se pudo eliminar.");
    expect(markup).toContain("dialog-alert");
    expect(actionErrorPresentation({ inDialog: true, hasProvider: true })).toEqual({
      publishToast: false,
      renderInline: true,
    });
    for (const source_ of ["dialog-action-error", "form-in-dialog-error"] as const) {
      expect(feedbackCategory(source_)).toBe("dialog");
    }
    expect(source("components/ConfirmDialog.tsx")).toContain("inDialog");
    expect(source("components/CancelTicketDialog.tsx")).toContain("inDialog");
    expect(source("components/FormActions.tsx")).toContain("dialog-alert");
  });
});

describe("CA-23 unified-reports-and-feedback", () => {
  it("los errores de carga y el 403 quedan como estado de la vista", () => {
    const markup = renderToStaticMarkup(
      <DashboardNotifications>
        <ListStatusMessage status="error" error="No se pudo cargar." loadingText="" emptyText="" onRetry={noop} />
      </DashboardNotifications>,
    );

    expect(markup).toContain("No se pudo cargar.");
    expect(markup).toContain("Reintentar");
    for (const item of ["load-error", "page-forbidden", "loading", "empty", "setup-step"] as const) {
      expect(feedbackCategory(item)).toBe("view-state");
    }
    expect(source("components/ListStatusMessage.tsx")).not.toMatch(/usePublish|ActionError/);
  });
});
