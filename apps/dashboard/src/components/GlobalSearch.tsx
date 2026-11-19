import { Fragment, type KeyboardEvent } from "react";
import { Icon } from "@/components/Icon";
import {
  GLOBAL_SEARCH_MAX,
  SEARCH_ERROR,
  SEARCH_HINT,
  SEARCH_LOADING,
  highlightSegments,
  searchEmptyMessage,
  type SearchResult,
} from "@/viewmodels/global-search";
import type { GlobalSearchViewModel } from "@/viewmodels/useGlobalSearch";

const LISTBOX_ID = "global-search-listbox";
const optionId = (index: number) => `global-search-option-${index}`;

function Highlighted({ text, term }: { text: string; term: string }) {
  return (
    <>
      {highlightSegments(text, term).map((segment, index) =>
        segment.match ? <mark key={index}>{segment.text}</mark> : <Fragment key={index}>{segment.text}</Fragment>,
      )}
    </>
  );
}

/** View del buscador universal del encabezado (dashboard-012 CA-12, CA-14, CA-16, CA-17). */
export function GlobalSearch({ query, trimmedQuery, highlightTerm, errorMessage, status, groups, open, activeIndex, actions }: GlobalSearchViewModel) {
  let counter = -1;
  const termFor = (result: SearchResult) =>
    result.isAction || result.isSection ? trimmedQuery : highlightTerm || trimmedQuery;
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (actions.keyDown(event.key)) event.preventDefault();
  };

  return (
    <div className="search-box">
      <Icon name="search" />
      <label className="visually-hidden" htmlFor="global-search-input">
        Buscar en el panel
      </label>
      <input
        id="global-search-input"
        type="search"
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={LISTBOX_ID}
        aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
        placeholder="Buscar..."
        maxLength={GLOBAL_SEARCH_MAX}
        value={query}
        onChange={(event) => actions.change(event.target.value)}
        onFocus={actions.focus}
        onBlur={actions.blur}
        onKeyDown={onKeyDown}
      />
      <div className="global-search__panel" hidden={!open}>
        {status === "idle" && <p className="global-search__message">{SEARCH_HINT}</p>}
        {status === "loading" && (
          <p className="global-search__message" role="status">
            {SEARCH_LOADING}
          </p>
        )}
        {status === "empty" && <p className="global-search__message">{searchEmptyMessage(trimmedQuery)}</p>}
        {status === "error" && (
          <p className="global-search__message" role="alert">
            {errorMessage ?? SEARCH_ERROR}
          </p>
        )}
        <ul id={LISTBOX_ID} role="listbox" aria-label="Resultados de la búsqueda" className="global-search__list" hidden={status !== "ready"}>
          {groups.map((group) => (
            <li role="presentation" key={group.key} className="global-search__group">
              <span className="global-search__heading" id={`global-search-group-${group.key}`}>
                {group.heading}
              </span>
              <ul role="group" aria-labelledby={`global-search-group-${group.key}`}>
                {group.results.map((result) => {
                  counter += 1;
                  const index = counter;

                  return (
                    <li
                      key={result.key}
                      id={optionId(index)}
                      role="option"
                      aria-selected={index === activeIndex}
                      aria-label={`${result.title}, ${result.sectionLabel}`}
                      className={`global-search__option ${index === activeIndex ? "global-search__option--active" : ""}`}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => actions.hover(index)}
                      onClick={() => actions.choose(result)}
                    >
                      <span className="global-search__icon" aria-hidden="true">
                        <Icon name={result.icon} />
                      </span>
                      <span className="global-search__text">
                        <strong>
                          <Highlighted text={result.title} term={termFor(result)} />
                        </strong>
                        <small>{result.subtitle}</small>
                        {result.match && (
                          <small className="global-search__match">
                            {result.match.field}: <Highlighted text={result.match.snippet} term={termFor(result)} />
                          </small>
                        )}
                        {!result.isAction && result.action && (
                          <small className="global-search__action">Ir a: {result.action.label}</small>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
