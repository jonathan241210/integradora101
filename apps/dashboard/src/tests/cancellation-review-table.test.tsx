import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CancellationLegend } from "../components/CancellationLegend";
import { cancellationReport } from "./admin-fixtures";
import { readyReportState, renderReport } from "./cancellation-report-helpers";
import { CancellationTrafficLightTable } from "../components/CancellationTrafficLightTable";
import { initialReviewHistoryState } from "../viewmodels/cancellation-review";
import { arrangeTrafficLightRows } from "../viewmodels/cancellation-traffic-light";
import {
  cashierDays,
  disclaimerText,
  legendItems,
  levelItems,
  renderTraffic,
  reviewDto,
  reviewVm,
} from "./cancellation-review-fixtures";

/** Tabla con el detalle de una fila abierto (la acción y el historial viven ahí). */
function renderExpanded(key: string, canReview = true) {
  return renderToStaticMarkup(
    <CancellationTrafficLightTable
      rows={cashierDays()}
      timezone="America/Mexico_City"
      canReview={canReview}
      history={{ ...initialReviewHistoryState, key, status: "ready", items: [reviewDto()] }}
      onReview={() => undefined}
      onToggleHistory={() => undefined}
      defaultExpandedKey={key}
    />,
  );
}

describe("CA-01 cancellation-review-signals", () => {
  it("test_ca01_traffic_light_table_shows_level_as_text", () => {
    const html = renderTraffic();

    // CA-01 y dashboard-021 (nota de título): el h2 y el caption usan el mismo título.
    expect(html).toContain('<h2 id="cancellation-traffic-light-heading" class="totals-section__heading">Semáforo por cajero y día</h2>');
    expect(html).not.toContain("Semáforo por día y cajero");
    for (const label of ["Normal", "Revisar", "Atención"]) expect(html).toContain(`<span>${label}</span>`);
    for (const name of ["Laura Cruz", "Mario Ruiz", "Sofía Paz", "Sin cajero registrado"]) {
      expect(html).toContain(name);
    }
    // El nivel lleva icono además de texto (el color nunca va solo).
    expect(html).toMatch(/traffic-light-badge traffic-light-badge--level"><svg[^>]*aria-hidden="true"/);
  });

  it("sin cashier_days (API anterior) no hay sección de semáforo", () => {
    expect(cancellationReport().reconciliation.cashier_days).toBeUndefined();
    expect(renderReport(readyReportState())).not.toContain("Semáforo por cajero y día");
  });
});

describe("CA-02 cancellation-review-signals", () => {
  it("test_ca02_reason_and_action_are_shown_as_received", () => {
    const html = renderTraffic();

    expect(html).toContain("3 señales: 16 % cancelado frente a 3 % habitual.");
    expect(html).toContain("1 señal: 3 cancelaciones con motivo «Otro».");
    // El «qué hacer» vive en la fila de detalle («Ver detalle»), tal como llega.
    expect(html).not.toContain("Compara el neto con el dinero entregado.");
    expect(renderExpanded("7:2026-11-18")).toContain("Compara el neto con el dinero entregado.");
    expect(renderExpanded("none:Sin cajero registrado:2026-11-18")).toContain(
      "No aplica: el día no tiene cajero registrado.",
    );
  });
});

describe("CA-03 cancellation-review-signals", () => {
  it("test_ca03_legend_renders_api_items_and_disclaimer", () => {
    const html = renderToStaticMarkup(<CancellationLegend legend={legendItems} disclaimer={disclaimerText} />);

    for (const item of legendItems) {
      expect(html).toContain(item.label);
      expect(html).toContain(item.explanation);
      expect(html).toContain(item.limit);
    }
    expect(html).toContain(`<p class="cancellation-legend__disclaimer" role="note">${disclaimerText}</p>`);
    expect(html).not.toMatch(/\btitle=/);
    expect(renderTraffic()).toContain(disclaimerText);
  });
});

describe("CA-04 cancellation-review-signals", () => {
  it("test_ca04_current_review_or_sin_revisar", () => {
    const html = renderTraffic();

    expect(html).toContain("Requiere aclaración");
    expect(html).toMatch(/cancellation-review-current__date">[^<]*2026[^<]*<\/span>/);
    // La nota y el autor pasan a la fila de detalle.
    expect(html).not.toContain("Falta aclarar el motivo Otro.");
    const detail = renderExpanded("8:2026-11-18");

    expect(detail).toContain("Ana Admin");
    expect(detail).toMatch(/<td>Ana Admin<\/td>/);
    expect(detail).toMatch(/<td>[^<]*2026[^<]*<\/td>/);
    // Laura y Sofía sin revisión; el grupo sin cajero muestra «No aplica».
    expect(html.match(/Sin revisar/g)?.length).toBe(2);
  });
});

describe("CA-05 cancellation-review-signals", () => {
  it("test_ca05_review_button_only_with_reports_cancellations_view", () => {
    const withPermission = renderTraffic({ canReview: true });

    // Atención y Revisar (con revisión) tienen botón; Normal sin revisión y sin cajero, no.
    expect(withPermission.match(/>Registrar revisión<\/button>/g)?.length).toBe(2);
    expect(withPermission.match(/Ver detalle/g)?.length).toBeGreaterThanOrEqual(4);
    expect(withPermission).not.toContain("Ver historial");

    const without = renderTraffic({ canReview: false, review: reviewVm() });

    expect(without).not.toContain(">Registrar revisión</button>");
    expect(without).not.toContain("Historial de revisiones");
    expect(without).not.toContain("Guardar revisión");
  });
});

describe("CA-18 cancellation-review-signals", () => {
  it("test_ca18_traffic_light_table_columns_in_order", () => {
    const html = renderTraffic();
    const headers = [...html.matchAll(/<th scope="col"[^>]*>([^<]+)<\/th>/g)].map((m) => m[1]);
    const start = headers.indexOf("Fecha");

    expect(headers.slice(start, start + 9)).toEqual([
      "Fecha",
      "Cajero",
      "Nivel",
      "Vendidos",
      "Cancelados",
      "% cancelado",
      "Señales",
      "Revisión vigente",
      "Acción",
    ]);
    // Mismo estilo de tabla que el resto de Reportes y encabezado fijo por la tarjeta.
    expect(html).toContain('class="table-scroll data-table-scroll"');
    expect(html).toContain("table-card cancellation-card");
    // Señales: conteo y debajo el porqué al tamaño del texto de la tabla.
    expect(html).toContain(
      '<strong>3</strong><span class="cancellation-signals__reason">3 señales: 16 % cancelado frente a 3 % habitual.</span>',
    );
    expect(html).toContain("16 %");
    // Botón con nombre accesible por cajero y fecha; el nivel sigue siendo texto con icono.
    expect(html).toMatch(/aria-label="Registrar revisión de Laura Cruz del [^"]*2026"/);
    expect(html).toMatch(/aria-label="Ver detalle de Mario Ruiz del [^"]*2026"/);
  });
});

describe("CA-19 cancellation-review-signals", () => {
  it("test_ca19_order_by_level_then_date_descending_without_cashier_last", () => {
    const base = cashierDays();
    const rows = [
      { ...base[2], date: "2026-11-20" },
      { ...base[3], date: "2026-11-21" },
      { ...base[1], date: "2026-11-17" },
      { ...base[0], date: "2026-11-16" },
      { ...base[0], cashier_id: 10, cashier_name: "Ana Díaz", date: "2026-11-19" },
      { ...base[2], date: "2026-11-21", cashier_id: 11, cashier_name: "Luis Soto" },
    ];
    const order = arrangeTrafficLightRows(rows).map((row) => `${row.traffic_light}:${row.date}`);

    expect(order).toEqual([
      "attention:2026-11-19",
      "attention:2026-11-16",
      "review:2026-11-17",
      "normal:2026-11-21",
      "normal:2026-11-20",
      "null:2026-11-21",
    ]);
    // La tabla lo muestra en ese orden y no altera la lista recibida.
    expect(rows[0].date).toBe("2026-11-20");
    const html = renderTraffic();

    expect(html.indexOf("Laura Cruz")).toBeLessThan(html.indexOf("Mario Ruiz"));
    expect(html.indexOf("Mario Ruiz")).toBeLessThan(html.indexOf("Sofía Paz"));
    expect(html.indexOf("Sofía Paz")).toBeLessThan(html.lastIndexOf("Sin cajero registrado"));
  });
});

describe("CA-20 cancellation-review-signals", () => {
  it("test_ca20_detail_row_shows_action_and_history_only_when_expanded", () => {
    const full = renderTraffic();
    // La conciliación puede traer su propia fila de aviso; se mira solo el semáforo.
    const closed = full.slice(full.indexOf("Semáforo por cajero y día"));

    expect(closed).not.toContain("data-table__detail");
    expect(closed).toContain('aria-expanded="false"');

    const open = renderExpanded("8:2026-11-18");

    expect(open).toContain('class="data-table__detail"');
    expect(open).toContain('aria-expanded="true"');
    expect(open).toContain("Revisa las cancelaciones marcadas.");
    expect(open).toContain('aria-label="Historial de revisiones"');
    // Sin permiso de revisión no se muestra el historial.
    expect(renderExpanded("8:2026-11-18", false)).not.toContain("Historial de revisiones");
  });
});

describe("CA-21 cancellation-review-signals", () => {
  it("test_ca21_only_days_to_review_filter_hides_normal", () => {
    // Oculta Normal y también «Sin cajero registrado» (nota de dashboard-021, 2026-11-21).
    expect(arrangeTrafficLightRows(cashierDays(), { onlyToReview: true }).map((row) => row.traffic_light)).toEqual([
      "attention",
      "review",
    ]);
    expect(renderTraffic()).toContain("Mostrar solo días por revisar");

    const filtered = renderToStaticMarkup(
      <CancellationTrafficLightTable
        rows={cashierDays()}
        timezone="America/Mexico_City"
        canReview
        history={initialReviewHistoryState}
        onReview={() => undefined}
        onToggleHistory={() => undefined}
        defaultOnlyToReview
      />,
    );

    expect(filtered).toContain("checked");
    expect(filtered).not.toContain("Sofía Paz");
    expect(filtered).toContain("Laura Cruz");
    expect(filtered).not.toContain("Sin cajero registrado");

    const none = renderToStaticMarkup(
      <CancellationTrafficLightTable
        rows={cashierDays().filter((row) => row.traffic_light === "normal")}
        timezone="America/Mexico_City"
        canReview
        history={initialReviewHistoryState}
        onReview={() => undefined}
        onToggleHistory={() => undefined}
        defaultOnlyToReview
      />,
    );

    expect(none).toContain("No hay días por revisar en el periodo.");

    // Solo quedan Normal y «Sin cajero registrado»: con el filtro no queda nada y se avisa.
    const onlyIgnored = renderToStaticMarkup(
      <CancellationTrafficLightTable
        rows={cashierDays().filter((row) => row.traffic_light === "normal" || row.cashier_id === null)}
        timezone="America/Mexico_City"
        canReview
        history={initialReviewHistoryState}
        onReview={() => undefined}
        onToggleHistory={() => undefined}
        defaultOnlyToReview
      />,
    );

    expect(onlyIgnored).toContain("No hay días por revisar en el periodo.");
    expect(onlyIgnored).not.toContain("Sin cajero registrado</td>");
  });
});

describe("CA-22 cancellation-review-signals", () => {
  it("test_ca22_no_cashier_group_says_no_aplica_and_styles_use_rem", () => {
    const html = renderTraffic({ canReview: true });
    const from = html.indexOf("Sin cajero registrado</td>");
    const row = html.slice(from, html.indexOf("</tr>", from));

    expect(row.match(/No aplica/g)?.length).toBeGreaterThanOrEqual(2);
    expect(row).not.toContain("Registrar revisión");

    const styles = readFileSync(fileURLToPath(new URL("../styles.css", import.meta.url)), "utf8");
    const block = styles.slice(
      styles.indexOf("cancellation-review-signals:start"),
      styles.indexOf("cancellation-review-signals:end"),
    );

    expect(block).not.toMatch(/(?<![-\w])(?:width|min-width|max-width)\s*:\s*\d+px/);
    expect(block).toContain("rem");
  });
});

const stylesSource = () => readFileSync(fileURLToPath(new URL("../styles.css", import.meta.url)), "utf8");

describe("CA-23 cancellation-review-signals", () => {
  it("test_ca23_legend_is_a_table_of_signal_meaning_and_limit_from_the_api", () => {
    const html = renderToStaticMarkup(<CancellationLegend legend={legendItems} disclaimer={disclaimerText} />);
    const signals = html.slice(html.indexOf('aria-label="Señales del semáforo"'));

    expect(signals.indexOf(">Señal</th>")).toBeGreaterThan(-1);
    expect(signals.indexOf(">Señal</th>")).toBeLessThan(signals.indexOf(">Qué significa</th>"));
    expect(signals.indexOf(">Qué significa</th>")).toBeLessThan(signals.indexOf(">Límite</th>"));
    for (const item of legendItems) {
      expect(signals).toContain(`<td>${item.label}</td><td>${item.explanation}</td><td>${item.limit}</td>`);
    }
    expect(html).not.toContain("<dl");
  });
});

describe("CA-24 cancellation-review-signals", () => {
  it("test_ca24_levels_table_shows_normal_review_and_attention_as_badges_with_text", () => {
    const html = renderToStaticMarkup(<CancellationLegend legend={legendItems} levels={levelItems} disclaimer={disclaimerText} />);
    const levels = html.slice(html.indexOf('aria-label="Niveles del semáforo"'), html.indexOf('aria-label="Señales del semáforo"'));

    expect(levels).toContain('arca-badge--success">Normal</span></td><td>0 señales</td>');
    expect(levels).toContain('arca-badge--warning">Revisar</span></td><td>1 señal</td>');
    expect(levels).toContain('arca-badge--danger">Atención</span></td><td>2 o más señales</td>');
    // Antes de la tabla de señales y sin emojis.
    expect(html.indexOf("Niveles del semáforo")).toBeLessThan(html.indexOf("Señales del semáforo"));
    expect(levels).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });

  it("test_ca24_levels_come_from_the_api_and_are_not_invented_when_missing", () => {
    // Umbral configurable (attention_min_signals = 3): se pinta tal como llega.
    const custom = [
      { code: "normal" as const, label: "Normal", condition: "0 señales" },
      { code: "review" as const, label: "Revisar", condition: "1 o 2 señales" },
      { code: "attention" as const, label: "Atención", condition: "3 o más señales" },
    ];

    expect(renderToStaticMarkup(<CancellationLegend legend={legendItems} levels={custom} />)).toContain("<td>3 o más señales</td>");
    for (const levels of [undefined, []]) {
      const html = renderToStaticMarkup(<CancellationLegend legend={legendItems} levels={levels} />);

      expect(html).not.toContain("Niveles del semáforo");
      expect(html).not.toContain("2 o más señales");
      expect(html).toContain("Señales del semáforo");
    }
  });
});

describe("CA-25 cancellation-review-signals", () => {
  it("test_ca25_disclaimer_is_a_visible_note", () => {
    const html = renderToStaticMarkup(<CancellationLegend legend={legendItems} disclaimer="Una alerta no prueba nada; indica qué revisar." />);

    expect(html).toContain('<p class="cancellation-legend__disclaimer" role="note">Una alerta no prueba nada; indica qué revisar.</p>');
    expect(renderToStaticMarkup(<CancellationLegend legend={legendItems} />)).not.toContain("cancellation-legend__disclaimer");
  });
});

describe("CA-26 cancellation-review-signals", () => {
  it("test_ca26_legend_is_collapsible_open_by_default_and_remembers_preference_safely", async () => {
    const html = renderToStaticMarkup(<CancellationLegend legend={legendItems} disclaimer={disclaimerText} />);

    expect(html).toContain("<summary>Cómo funciona el semáforo</summary>");
    expect(html).toMatch(/<details[^>]* open=""/);

    const legend = await import("../viewmodels/cancellation-legend");
    const store = new Map<string, string>();

    // Sin localStorage (entorno node) o con almacenamiento que falla: abierta y sin error.
    expect(legend.readLegendOpen()).toBe(true);
    expect(() => legend.writeLegendOpen(false)).not.toThrow();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    });
    legend.writeLegendOpen(false);
    expect(legend.readLegendOpen()).toBe(false);
    legend.writeLegendOpen(true);
    expect(legend.readLegendOpen()).toBe(true);
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });
    expect(legend.readLegendOpen()).toBe(true);
    expect(() => legend.writeLegendOpen(false)).not.toThrow();
    vi.unstubAllGlobals();
    // La leyenda no se guarda en el servidor.
    expect(readFileSync(fileURLToPath(new URL("../viewmodels/cancellation-legend.ts", import.meta.url)), "utf8")).not.toMatch(/fetch|axios/);
  });
});

describe("CA-27 cancellation-review-signals", () => {
  it("test_ca27_traffic_table_text_is_readable_and_columns_are_laid_out", () => {
    const html = renderTraffic();
    const styles = stylesSource();
    const block = (selector: string) => {
      const start = styles.indexOf(`${selector} {`);

      return styles.slice(start, styles.indexOf("}", start));
    };

    // El porqué usa texto normal con contraste (no muted) y al menos 0.875rem.
    expect(html).toContain('class="cancellation-signals__reason"');
    expect(block(".cancellation-signals__reason")).toMatch(/font-size:\s*0\.9375rem/);
    expect(block(".cancellation-signals__reason")).not.toContain("muted");
    // Columnas numéricas a la derecha con ancho mínimo; señales con más espacio; botón sin partirse.
    expect(html).toContain('<th scope="col" class="traffic-col traffic-col--num">Vendidos</th>');
    expect(styles).toMatch(/\.traffic-col--num \{[^}]*min-width:\s*[\d.]+rem;[^}]*text-align:\s*right/);
    expect(block(".traffic-col--signals")).toMatch(/min-width:\s*18rem/);
    expect(block(".traffic-col .arca-button")).toContain("nowrap");
    // El nivel es un Badge visible con texto.
    expect(html).toMatch(/arca-badge arca-badge--danger"><span class="traffic-light-badge traffic-light-badge--level">/);
  });
});

describe("CA-28 cancellation-review-signals", () => {
  it("test_ca28_detail_has_titled_blocks_and_history_as_a_small_table", () => {
    const open = renderExpanded("8:2026-11-18");

    expect(open).toContain("<h4>Qué hacer</h4>");
    expect(open).toContain("<h4>Historial de revisiones</h4>");
    expect(open).toContain("Revisa las cancelaciones marcadas.");
    const table = open.slice(open.indexOf('<table class="cancellation-review-history"'));

    for (const header of ["Fecha", "Estado", "Nota", "Quién"]) expect(table).toContain(`>${header}</th>`);
    expect(table).toContain("<td>Ana Admin</td>");
    expect(table.match(/<th scope="col">/g)).toHaveLength(4);
    expect(block(".cancellation-review-detail")).toMatch(/font-size:\s*0\.9375rem/);

    function block(selector: string) {
      const styles = stylesSource();
      const start = styles.indexOf(`${selector} {`);

      return styles.slice(start, styles.indexOf("}", start));
    }
  });
});
