import type { KeyboardEvent, ReactNode } from "react";
import { useRef } from "react";
import { tabForKey } from "@/viewmodels/report-tabs";
import { tulanpediaTabs, type TulanpediaTab } from "@/viewmodels/tulanpedia-tab";

/**
 * Pestañas «Solicitudes» y «Publicadas» (CA-63, CA-67): solo presentación. Teclado igual
 * que «Reportes»: flechas, Inicio y Fin; el panel entra en el orden de tabulación.
 */
export function TulanpediaTabs({
  active,
  onSelect,
  children,
}: {
  active: TulanpediaTab;
  onSelect: (tab: TulanpediaTab) => void;
  children: ReactNode;
}) {
  const refs = useRef<Partial<Record<TulanpediaTab, HTMLButtonElement | null>>>({});

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = tabForKey(tulanpediaTabs, active, event.key);

    if (!next) return;
    event.preventDefault();
    onSelect(next);
    refs.current[next]?.focus();
  };

  return (
    <>
      <div className="section-tabs" role="tablist" aria-label="TulanPedia" onKeyDown={onKeyDown}>
        {tulanpediaTabs.map((item) => (
          <button
            key={item.id}
            ref={(element) => {
              refs.current[item.id] = element;
            }}
            id={`tulanpedia-tab-${item.id}`}
            type="button"
            role="tab"
            className={`section-tab ${active === item.id ? "section-tab--active" : ""}`}
            aria-selected={active === item.id}
            aria-controls="tulanpedia-panel"
            tabIndex={active === item.id ? 0 : -1}
            onClick={() => onSelect(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        id="tulanpedia-panel"
        role="tabpanel"
        aria-labelledby={`tulanpedia-tab-${active}`}
        tabIndex={0}
        className="section-tab-panel"
      >
        {children}
      </div>
    </>
  );
}
