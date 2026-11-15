import type { ReactNode } from "react";
import { tulanpediaTabs, type TulanpediaTab } from "@/viewmodels/tulanpedia-tab";

/** Pestañas «Solicitudes» y «Publicadas» (CA-63): solo presentación. */
export function TulanpediaTabs({
  active,
  onSelect,
  children,
}: {
  active: TulanpediaTab;
  onSelect: (tab: TulanpediaTab) => void;
  children: ReactNode;
}) {
  return (
    <div className="tulanpedia-tabs">
      <div className="tulanpedia-tabs__list" role="tablist" aria-label="TulanPedia">
        {tulanpediaTabs.map((item) => (
          <button
            key={item.id}
            id={`tulanpedia-tab-${item.id}`}
            type="button"
            role="tab"
            className={`tulanpedia-tabs__tab ${active === item.id ? "tulanpedia-tabs__tab--active" : ""}`}
            aria-selected={active === item.id}
            aria-controls="tulanpedia-panel"
            tabIndex={active === item.id ? 0 : -1}
            onClick={() => onSelect(item.id)}
            onKeyDown={(event) => {
              if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
              const other = tulanpediaTabs.find((tab) => tab.id !== item.id);

              if (!other) return;
              event.preventDefault();
              onSelect(other.id);
              document.getElementById(`tulanpedia-tab-${other.id}`)?.focus();
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        id="tulanpedia-panel"
        role="tabpanel"
        aria-labelledby={`tulanpedia-tab-${active}`}
      >
        {children}
      </div>
    </div>
  );
}
