import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ReportTabs } from "../components/ReportTabs";
import { SidebarLink } from "../components/SidebarLink";
import {
  createPendingQueryMemo,
  initialPendingReviewState,
  pendingKeysFor,
  pendingNoticeMessages,
  pendingNoticeText,
  pendingReviewReducer,
  refreshPendingCounts,
  sectionAccessibleName,
  type PendingCounts,
  type PendingReviewState,
} from "../viewmodels/pending-review";
import { availableReportTabs } from "../viewmodels/report-tabs";
import { createHarness } from "./admin-fixtures";

const admin = ["species.review", "memories.review", "reports.cancellations.view", "reports.view"];

function start(permissions: readonly string[], counts: Record<string, number>) {
  const h = createHarness<PendingReviewState, Parameters<typeof pendingReviewReducer>[1]>(
    pendingReviewReducer,
    initialPendingReviewState,
  );
  const api = { pendingCounts: vi.fn(async () => counts) };

  return { h, api, load: () => refreshPendingCounts(api, createPendingQueryMemo(), h.dispatch, { permissions, now: 0 }) };
}

const sidebar = (counts: PendingCounts) =>
  renderToStaticMarkup(
    <SidebarLink id="reports" label="Reportes" icon="trend" active={false} counts={counts} onSelect={vi.fn()} />,
  );

describe("CA-10 cancellation-review-signals", () => {
  it("test_ca10_admin_sees_cancellation_notice_once_per_start", async () => {
    expect(pendingNoticeText("cancellation_days", 1)).toBe("Tienes 1 día de cancelaciones en Atención sin revisar.");
    expect(pendingNoticeText("cancellation_days", 3)).toBe("Tienes 3 días de cancelaciones en Atención sin revisar.");

    const { h, load } = start(admin, { species_requests: 2, memories: 0, cancellation_days: 3 });
    await load();
    // Convive con los avisos de especies y recuerdos, en la misma cola FIFO.
    expect(h.state.announcement?.messages).toEqual([
      "Tienes 2 solicitudes de especies pendientes.",
      "Tienes 3 días de cancelaciones en Atención sin revisar.",
    ]);
    expect(h.state.announced).toBe(true);

    // Un segundo conteo no repite el aviso en el mismo inicio.
    h.dispatch({ type: "loaded", counts: { cancellation_days: 5 } });
    expect(h.state.announcement?.messages).toHaveLength(2);
    expect(pendingNoticeMessages({ cancellation_days: 0 })).toEqual([]);
  });
});

describe("CA-11 cancellation-review-signals", () => {
  it("test_ca11_dot_on_reports_and_tab_with_accessible_name", () => {
    const withDays = sidebar({ cancellation_days: 2 });

    expect(withDays).toContain('aria-label="Reportes, con días de cancelaciones pendientes de revisión"');
    expect(withDays).toContain("sidebar-link__dot");
    expect(sectionAccessibleName("Reportes", "reports", { cancellation_days: 0 })).toBe("Reportes");
    expect(sidebar({ cancellation_days: 0 })).not.toContain("sidebar-link__dot");

    const tabs = availableReportTabs(admin);
    const render = (counts: PendingCounts) =>
      renderToStaticMarkup(
        <ReportTabs tabs={tabs} active="cancellations" counts={counts} onSelect={vi.fn()}>
          <p>contenido</p>
        </ReportTabs>,
      );
    const tabMarkup = render({ cancellation_days: 2 });

    expect(tabMarkup).toContain("report-tab__dot");
    expect(tabMarkup).toContain('aria-label="Cancelaciones, con días pendientes de revisión"');
    // El puntito solo va en la pestaña «Cancelaciones».
    expect(tabMarkup.match(/report-tab__dot/g)).toHaveLength(1);
    expect(render({ cancellation_days: 0 })).not.toContain("report-tab__dot");
  });
});

describe("CA-12 cancellation-review-signals", () => {
  it("test_ca12_no_permission_no_cancellation_notice", async () => {
    expect(pendingKeysFor(["species.review", "reports.view"])).not.toContain("cancellation_days");
    expect(pendingKeysFor(admin)).toContain("cancellation_days");

    // Aun si la API enviara la clave, el cliente no la toma sin el permiso.
    const { h, load } = start(["memories.review", "reports.view"], { memories: 0, cancellation_days: 4 });
    await load();
    expect(h.state.counts.cancellation_days).toBeUndefined();
    expect(h.state.announcement).toBeNull();
    expect(sidebar(h.state.counts)).not.toContain("sidebar-link__dot");

    // Sin ningún permiso de pendientes no se consulta.
    const none = start(["reports.view"], { cancellation_days: 4 });
    await none.load();
    expect(none.api.pendingCounts).not.toHaveBeenCalled();
  });
});
