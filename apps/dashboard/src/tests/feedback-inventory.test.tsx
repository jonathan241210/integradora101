import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const plan = readFileSync(
  new URL("../../plan/020-unified-reports-and-feedback.md", import.meta.url),
  "utf8",
);

type Category = "AV" | "CE" | "DI" | "EV" | "OK" | "NO";

/** Filas de la tabla «Inventario de mensajes»: id y categoría prevista (columna 6). */
function inventory(): { id: string; category: string }[] {
  const section = plan.slice(plan.indexOf("## Inventario de mensajes"), plan.indexOf("## Mapeo de criterios"));

  return section
    .split("\n")
    .filter((line) => /^\| M-\d+ /.test(line))
    .map((line) => {
      const cells = line.split("|").map((cell) => cell.trim());

      return { id: cells[1], category: cells[5] };
    });
}

const has = (file: string, ...needles: (string | RegExp)[]) => {
  const text = source(file);

  for (const needle of needles) {
    if (typeof needle === "string") expect(text, `${file}: ${needle}`).toContain(needle);
    else expect(text, `${file}: ${needle}`).toMatch(needle);
  }
};
const lacks = (file: string, needle: string | RegExp) => {
  const text = source(file);

  if (typeof needle === "string") expect(text, `${file}: ${needle}`).not.toContain(needle);
  else expect(text, `${file}: ${needle}`).not.toMatch(needle);
};

/** Comprobación en el código de la categoría de cada entrada tras la migración. */
const checks: Record<string, () => void> = {
  "M-01": () => has("components/DashboardNotifications.tsx", "actionErrorPresentation", "inDialog"),
  "M-02": () => has("components/InlineFormFooter.tsx", "<ActionError message={error} />"),
  "M-03": () => has("components/ConfirmDialog.tsx", "<ActionError message={error} inDialog />"),
  "M-04": () => has("components/ConfirmDialog.tsx", "<ActionError message={error} inDialog />"),
  "M-05": () => has("views/UsersView.tsx", "<ActionError message={pendingAction === null ? state.actionError"),
  "M-06": () => {
    has("views/UsersView.tsx", "actions.reloadOptions");
    lacks("views/UsersView.tsx", 'className="inline-alert"');
  },
  "M-07": () => {
    // Revisión 2026-11-21 (b): el error general vive en el diálogo de la acción.
    has("components/StaffActionDialog.tsx", "<ConfirmDialog", "error={error}");
    lacks("components/StaffActionDialog.tsx", 'className="inline-alert"');
  },
  "M-08": () => {
    has("views/EventsView.tsx", "<ActionError message={missingPending");
    lacks("views/EventsView.tsx", 'className="inline-alert"');
  },
  "M-09": () => has("views/TicketPricesView.tsx", "<ActionError message={!state.twoFactorRequired"),
  "M-10": () => has("views/TicketPricesView.tsx", "state.twoFactorRequired && (", 'className="inline-alert"'),
  // Divergencia de implementación: la línea 195 es la carga de precios (EV con reintento); el error de venta ya es ActionError.
  "M-11": () => has("views/TicketSaleView.tsx", "<ActionError message={state.error} />", "Reintentar precios"),
  "M-12": () => has("views/TicketSaleView.tsx", "ticket-sale-success-popup"),
  "M-13": () => has("views/TicketSaleView.tsx", "sale-quote-status"),
  "M-14": () => has("views/CancellationReportView.tsx", "periodFieldErrors(fieldErrors)"),
  "M-15": () => has("views/CancellationReportView.tsx", 'state.status === "forbidden"'),
  "M-16": () => has("views/CancellationReportView.tsx", "<ActionError message={state.exportError} />"),
  "M-17": () => has("components/ReportExportButtons.tsx", "<FieldErrors"),
  // dashboard-017 (rev. 2026-11-21): el banner desapareció; el aviso de consola es emergente.
  "M-18": () => has("components/ConsoleNoticesPublisher.tsx", 'publish(message, "info")', "actions.markRead"),
  "M-19": () => has("components/ConsoleNoticesPublisher.tsx", 'publish(state.error, "error")'),
  "M-20": () => has("components/SpeciesFichaForm.tsx", "<ActionError message={error ?? \"\"} />"),
  "M-21": () => {
    has("components/SpeciesFichaForm.tsx", "<FieldErrors");
    has("components/ImageUploadBox.tsx", "field-error");
  },
  "M-22": () => has("components/CancelTicketDialog.tsx", "inDialog"),
  "M-23": () => has("components/FormActions.tsx", "dialog-alert"),
  "M-24": () => has("components/EnclosureQrDialog.tsx", 'role="alert"'),
  "M-25": () => has("components/StepUpConfirmationDialog.tsx", 'role="alert"'),
  "M-26": () => {
    for (const file of ["MemoriesView", "PublishedSpeciesView", "MemoryReviewDetailView", "PublishedSpeciesDetailView", "SpeciesRequestDetailView", "SpeciesRequestsView"]) {
      has(`views/${file}.tsx`, 'role="alert"');
    }
  },
  "M-27": () => has("components/PendingRequestNotice.tsx", "export function PendingRequestNotice"),
  "M-28": () => {
    for (const file of ["NewsView", "EnclosuresView", "TicketHistoryView", "TicketPricesView", "EventsView", "UsersView"]) {
      has(`views/${file}.tsx`, "<NoticeBar");
    }
  },
  // Divergencia: el respaldo en línea de NoticeBar solo actúa sin proveedor (pruebas aisladas); la app siempre lo tiene.
  "M-29": () => has("components/NoticeBar.tsx", "usePublishNotification", "if (hasNotifications)"),
  "M-30": () => has("App.tsx", "<NoticeBar message={shell.state.notice}"),
  "M-31": () => has("App.tsx", "Tu cuenta no tiene permisos para mostrar secciones del panel."),
  "M-32": () => has("components/GlobalSearch.tsx", 'role="alert"'),
  "M-33": () => has("views/LoginView.tsx", "export function LoginView"),
};

const categories: Category[] = ["AV", "CE", "DI", "EV", "OK", "NO"];

describe("CA-24 unified-reports-and-feedback", () => {
  it("cada entrada del inventario está en su categoría", () => {
    const rows = inventory();

    expect(rows).toHaveLength(33);
    for (const row of rows) {
      // Cada entrada del plan tiene categoría válida y una comprobación en el código.
      expect(categories.some((category) => row.category.startsWith(category)), row.id).toBe(true);
      expect(checks[row.id], `sin comprobación para ${row.id}`).toBeTypeOf("function");
      checks[row.id]();
    }
    expect(Object.keys(checks).sort()).toEqual(rows.map((row) => row.id).sort());
  });
});
