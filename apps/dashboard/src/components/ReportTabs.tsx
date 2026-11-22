import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { reportTabAccessibleName, reportTabHasPending, type PendingCounts } from "@/viewmodels/pending-review";
import { tabForKey, type ReportTab, type ReportTabId } from "@/viewmodels/report-tabs";

/**
 * Pestañas de «Reportes» (dashboard-020 CA-31): `tablist`, `tab`, `tabpanel`,
 * `aria-selected`, flechas, Inicio y Fin. No decide permisos: recibe las pestañas ya
 * filtradas del viewmodel.
 */
export function ReportTabs({
  tabs,
  active,
  onSelect,
  counts = {},
  children,
}: {
  tabs: ReportTab[];
  active: ReportTabId;
  onSelect: (tab: ReportTabId) => void;
  counts?: PendingCounts;
  children: ReactNode;
}) {
  const refs = useRef<Partial<Record<ReportTabId, HTMLButtonElement | null>>>({});

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = tabForKey(tabs, active, event.key);

    if (!next) return;
    event.preventDefault();
    onSelect(next);
    refs.current[next]?.focus();
  };

  return (
    <>
      <div className="section-tabs report-tabs" role="tablist" aria-label="Reportes" onKeyDown={onKeyDown}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            ref={(element) => {
              refs.current[tab.id] = element;
            }}
            id={`report-tab-${tab.id}`}
            type="button"
            role="tab"
            className={`section-tab report-tab ${active === tab.id ? "section-tab--active" : ""}`}
            aria-label={reportTabAccessibleName(tab.label, tab.id, counts)}
            aria-selected={active === tab.id}
            aria-controls={`report-panel-${tab.id}`}
            tabIndex={active === tab.id ? 0 : -1}
            onClick={() => onSelect(tab.id)}
          >
            {tab.label}
            {reportTabHasPending(counts, tab.id) && (
              <span className="report-tab__dot" aria-hidden="true" />
            )}
          </button>
        ))}
      </div>
      <div
        id={`report-panel-${active}`}
        role="tabpanel"
        aria-labelledby={`report-tab-${active}`}
        tabIndex={0}
        className="section-tab-panel report-tab-panel"
      >
        {children}
      </div>
    </>
  );
}
