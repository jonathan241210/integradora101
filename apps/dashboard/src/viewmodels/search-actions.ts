import type { DashboardSection } from "./dashboard-shell";
import type { FocusDialogAction } from "./focus-target";
import {
  compareRelevance,
  containsPhrase,
  matchesActionWord,
  requiredWordCount,
  tokenize,
  wordLevel,
  type Relevance,
} from "./search-tolerance";
import type { TulanpediaTab } from "./tulanpedia-tab";
import { detectSectionIntent, queryWithoutSectionWords } from "./search-intent";
import { STOP_WORDS, foldText } from "./search-tolerance";

/**
 * Catálogo de acciones del buscador (dashboard-012 CA-32 a CA-35, RN-12).
 * Es configuración de presentación: solo lleva a pantallas y diálogos que ya
 * existen y no sustituye la autorización de la API. `opens` indica si la
 * acción puede abrirse desde un resultado (solo Usuarios, Recintos e Historial).
 * `evidence` es el texto de la vista donde existe la acción (se verifica en test).
 */
export type SearchActionEntry = {
  id: string;
  label: string;
  section: DashboardSection;
  /** Nombre de la sección si el perfil no la trae en su navegación. */
  sectionLabel: string;
  permission: string;
  opens: FocusDialogAction | null;
  tab: TulanpediaTab | null;
  synonyms: string[];
  evidence: { file: string; text: string };
};

type Entry = Omit<SearchActionEntry, "opens" | "tab"> & Partial<Pick<SearchActionEntry, "opens" | "tab">>;

const entries: Entry[] = [
  { id: "users.reset-password", label: "Restablecer contraseña", section: "users", sectionLabel: "Usuarios", permission: "users.manage", opens: "reset-password", synonyms: ["contraseña", "clave", "password", "pass"], evidence: { file: "views/UsersView.tsx", text: "Restablecer contraseña" } },
  { id: "users.reset-two-factor", label: "Restablecer 2FA", section: "users", sectionLabel: "Usuarios", permission: "users.manage", opens: "reset-two-factor", synonyms: ["2fa", "dos factores", "doble factor", "verificación", "autenticación", "mfa"], evidence: { file: "views/UsersView.tsx", text: "Restablecer 2FA" } },
  { id: "users.status", label: "Desactivar o activar cuenta", section: "users", sectionLabel: "Usuarios", permission: "users.manage", opens: "status", synonyms: ["desactivar", "activar", "suspender", "estado", "cuenta"], evidence: { file: "views/UsersView.tsx", text: "cuenta de" } },
  { id: "users.delete", label: "Eliminar cuenta", section: "users", sectionLabel: "Usuarios", permission: "users.manage", opens: "delete", synonyms: ["eliminar", "borrar", "quitar"], evidence: { file: "views/UsersView.tsx", text: "Eliminar cuenta" } },
  { id: "users.edit", label: "Editar usuario", section: "users", sectionLabel: "Usuarios", permission: "users.manage", synonyms: ["editar", "modificar", "rol", "área", "correo"], evidence: { file: "views/UsersView.tsx", text: "Editar cuenta" } },
  { id: "users.create", label: "Crear usuario", section: "users", sectionLabel: "Usuarios", permission: "users.manage", synonyms: ["nuevo usuario", "crear", "agregar", "alta"], evidence: { file: "views/UsersView.tsx", text: "Crear usuario" } },
  { id: "enclosures.create", label: "Crear recinto", section: "enclosures", sectionLabel: "Recintos", permission: "enclosures.manage", synonyms: ["nuevo recinto", "crear", "agregar", "alta"], evidence: { file: "views/EnclosuresView.tsx", text: "Crear recinto" } },
  { id: "enclosures.rename", label: "Renombrar recinto", section: "enclosures", sectionLabel: "Recintos", permission: "enclosures.manage", synonyms: ["renombrar", "editar nombre"], evidence: { file: "views/EnclosuresView.tsx", text: "Renombrar recinto" } },
  { id: "enclosures.status", label: "Desactivar o activar recinto", section: "enclosures", sectionLabel: "Recintos", permission: "enclosures.manage", opens: "status", synonyms: ["desactivar", "activar", "mantenimiento", "cerrar", "abrir", "estado"], evidence: { file: "views/EnclosuresView.tsx", text: "Desactivar" } },
  { id: "enclosures.delete", label: "Eliminar recinto", section: "enclosures", sectionLabel: "Recintos", permission: "enclosures.manage", opens: "delete", synonyms: ["eliminar", "borrar", "quitar"], evidence: { file: "views/EnclosuresView.tsx", text: "Eliminar recinto" } },
  { id: "enclosures.qr", label: "QR del recinto", section: "enclosures", sectionLabel: "Recintos", permission: "enclosures.manage", opens: "qr", synonyms: ["qr", "código qr", "qr recinto", "imprimir qr", "regenerar qr", "generar qr"], evidence: { file: "views/EnclosuresView.tsx", text: "QR del recinto" } },
  { id: "news.create", label: "Crear noticia", section: "news", sectionLabel: "Noticias", permission: "news.manage", synonyms: ["nueva noticia", "crear"], evidence: { file: "views/NewsView.tsx", text: "Nueva noticia" } },
  { id: "news.edit", label: "Editar noticia (incluye imagen)", section: "news", sectionLabel: "Noticias", permission: "news.manage", synonyms: ["editar", "imagen", "foto", "título", "contenido", "categoría"], evidence: { file: "views/NewsView.tsx", text: "Editar noticia" } },
  { id: "news.status", label: "Activar o desactivar noticia", section: "news", sectionLabel: "Noticias", permission: "news.manage", synonyms: ["publicar", "despublicar", "mostrar", "ocultar", "activar", "desactivar"], evidence: { file: "components/ContentCardActions.tsx", text: "Desactivar" } },
  { id: "events.create", label: "Crear evento", section: "events", sectionLabel: "Eventos", permission: "events.manage", synonyms: ["nuevo evento", "crear"], evidence: { file: "views/EventsView.tsx", text: "Nuevo evento" } },
  { id: "events.edit", label: "Editar evento (incluye imagen)", section: "events", sectionLabel: "Eventos", permission: "events.manage", synonyms: ["editar", "imagen", "foto", "ubicación"], evidence: { file: "views/EventsView.tsx", text: "Editar evento" } },
  { id: "events.status", label: "Activar o desactivar evento", section: "events", sectionLabel: "Eventos", permission: "events.manage", synonyms: ["publicar", "despublicar", "mostrar", "ocultar", "activar", "desactivar"], evidence: { file: "components/ContentCardActions.tsx", text: "Desactivar" } },
  { id: "ticket-history.cancel", label: "Cancelar boleto", section: "ticket-history", sectionLabel: "Historial", permission: "tickets.cancel", opens: "cancel", synonyms: ["cancelar", "anular", "cancelación"], evidence: { file: "views/TicketHistoryView.tsx", text: "Cancelar boleto" } },
  { id: "ticket-prices.change", label: "Precios de boletos", section: "ticket-prices", sectionLabel: "Precios", permission: "ticket-prices.manage", synonyms: ["precio", "precios", "tarifa", "tarifas", "costo", "adulto", "niño", "entrada en vigor"], evidence: { file: "views/TicketPricesView.tsx", text: "Cambiar precios" } },
  // Decisión de la sesión principal (2026-11-18): «QR» apunta a Nueva venta, donde se imprime el QR del boleto.
  { id: "tickets.sale", label: "Nueva venta", section: "tickets", sectionLabel: "Venta", permission: "tickets.create", synonyms: ["venta", "vender", "cobrar", "efectivo", "imprimir", "qr", "código qr"], evidence: { file: "views/TicketSaleView.tsx", text: "Nueva venta" } },
  { id: "reports.export", label: "Exportar reporte de boletos", section: "reports", sectionLabel: "Reportes", permission: "reports.view", synonyms: ["exportar", "descargar", "reporte", "excel", "csv"], evidence: { file: "components/ReportExportButtons.tsx", text: "Exportar reporte" } },
  { id: "memories.accept", label: "Aceptar momento", section: "memories", sectionLabel: "Momentos", permission: "memories.review", synonyms: ["aceptar", "aprobar"], evidence: { file: "views/MemoryReviewDetailView.tsx", text: "Aceptar" } },
  { id: "memories.reject", label: "Rechazar momento", section: "memories", sectionLabel: "Momentos", permission: "memories.review", synonyms: ["rechazar", "motivo", "denegar"], evidence: { file: "views/MemoryReviewDetailView.tsx", text: "Rechazar" } },
  { id: "species.unpublish", label: "Despublicar especie", section: "tulanpedia", sectionLabel: "Zoopedia", permission: "species.review", tab: "published", synonyms: ["despublicar", "ocultar", "quitar del catálogo"], evidence: { file: "views/PublishedSpeciesDetailView.tsx", text: "Despublicar" } },
  { id: "species.republish", label: "Republicar especie", section: "tulanpedia", sectionLabel: "Zoopedia", permission: "species.review", tab: "published", synonyms: ["republicar", "publicar", "volver a publicar"], evidence: { file: "views/PublishedSpeciesView.tsx", text: "Republicar" } },
  { id: "species.remove", label: "Eliminar publicación", section: "tulanpedia", sectionLabel: "Zoopedia", permission: "species.review", tab: "published", synonyms: ["eliminar publicación", "quitar"], evidence: { file: "views/PublishedSpeciesDetailView.tsx", text: "Eliminar publicación" } },
  { id: "species.accept-publish", label: "Aceptar y publicar solicitud", section: "tulanpedia", sectionLabel: "Zoopedia", permission: "species.review", tab: "requests", synonyms: ["aceptar", "publicar", "aprobar"], evidence: { file: "views/SpeciesRequestDetailView.tsx", text: "Aceptar y publicar" } },
  { id: "species.accept", label: "Aceptar sin publicar", section: "tulanpedia", sectionLabel: "Zoopedia", permission: "species.review", tab: "requests", synonyms: ["aceptar", "aprobar"], evidence: { file: "views/SpeciesRequestDetailView.tsx", text: "Aceptar sin publicar" } },
  { id: "species.reject", label: "Rechazar solicitud", section: "tulanpedia", sectionLabel: "Zoopedia", permission: "species.review", tab: "requests", synonyms: ["rechazar", "motivo"], evidence: { file: "views/SpeciesRequestDetailView.tsx", text: "Rechazar" } },
];

export const searchActionCatalog: SearchActionEntry[] = entries.map((entry) => ({
  opens: null,
  tab: null,
  ...entry,
}));

/**
 * Acciones que el perfil puede ver (CA-33): su permiso figura en
 * `permissions` y su sección está en la navegación. Es solo presentación.
 */
export function visibleSearchActions(
  permissions: readonly string[],
  allowedSections: readonly string[],
  catalog: SearchActionEntry[] = searchActionCatalog,
): SearchActionEntry[] {
  const granted = new Set(permissions);

  return catalog.filter((entry) => granted.has(entry.permission) && allowedSections.includes(entry.section));
}

function actionWords(entry: SearchActionEntry): string[] {
  return [...new Set([entry.label, ...entry.synonyms].flatMap(tokenize))];
}

export type SplitSearchQuery = {
  /** Acciones reconocidas, en el orden del catálogo. */
  actions: SearchActionEntry[];
  /** Palabras de la consulta que no son de acción. */
  rest: string;
  /** Consulta para `api.admin.search`; `null` si no hay que llamar (CA-35). */
  apiQuery: string | null;
  /** ¿Los elementos reciben «Ir a: <acción>»? Solo si hay palabras de acción y resto. */
  pairing: boolean;
};

const API_MIN = 2;

/** Divide la consulta en palabras de acción y resto (CA-35, D-16, D-17). */
export function splitSearchQuery(query: string, visible: SearchActionEntry[]): SplitSearchQuery {
  const trimmed = query.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const catalog = visible.map((entry) => ({ entry, words: actionWords(entry) }));
  const matched = new Set<string>();
  const restWords: string[] = [];

  for (const word of words) {
    // Enmienda (e): las palabras de sección («noticia», «evento»…) y las palabras vacías nunca se
    // consumen como acción; así llegan a la API y cuentan para encontrar el elemento.
    const folded = foldText(word);
    const isSectionWord = detectSectionIntent(word).sections.length > 0;
    const hits = isSectionWord || STOP_WORDS.has(folded)
      ? []
      : catalog.filter((item) => matchesActionWord(word, item.words));

    if (hits.length === 0) {
      restWords.push(word);
      continue;
    }
    hits.forEach((item) => matched.add(item.entry.id));
  }

  const actions = visible.filter((entry) => matched.has(entry.id));

  if (actions.length === 0) return { actions, rest: trimmed, apiQuery: queryWithoutSectionWords(trimmed), pairing: false };

  if (restWords.length === 0) return { actions, rest: "", apiQuery: queryWithoutSectionWords(trimmed), pairing: false };

  const rest = restWords.join(" ");

  const restQuery = queryWithoutSectionWords(rest);

  return { actions, rest, apiQuery: restQuery.length >= API_MIN ? restQuery : null, pairing: true };
}

/** Acción de la sección S que se muestra en «Ir a: …»; gana la primera del catálogo (CA-35, D-18). */
export function pairedAction(
  actions: SearchActionEntry[],
  section: string,
  query?: string,
): SearchActionEntry | null {
  const candidates = actions.filter((entry) => entry.section === section);

  // dashboard-013: con la consulta, gana la acción con más palabras reconocidas (p. ej. «imprimir qr recinto»
  // elige «QR del recinto» y no «Crear recinto»); el empate conserva el orden del catálogo.
  return (query ? rankActions(query, candidates)[0] : undefined) ?? candidates[0] ?? null;
}

/**
 * Relevancia de una acción para la consulta (enmienda (d), CA-43): frase
 * literal en la etiqueta, luego en un sinónimo, más palabras reconocidas y
 * mejor nivel medio. Basta con reconocer una palabra (sin ceil(n/2), enmienda (d));
 * `partial: true` exigiría ceil(n/2) y no se usa en el buscador.
 */
export function actionRelevance(query: string, entry: SearchActionEntry, partial = false): Relevance | null {
  const words = tokenize(query);
  const labelWords = tokenize(entry.label);
  const all = actionWords(entry);
  const levels = words
    .filter((word) => matchesActionWord(word, all))
    .map((word) => Math.max(1, ...all.map((actionWord) => wordLevel(word, actionWord))));

  if (levels.length === 0 || (partial && levels.length < requiredWordCount(words.length))) return null;

  let phrase = 0;

  if (labelWords.join(" ") === words.join(" ")) phrase = 3;
  else if (containsPhrase(words, labelWords)) phrase = 2;
  else if (entry.synonyms.some((synonym) => containsPhrase(words, tokenize(synonym)))) phrase = 1;

  return { phrase, matched: levels.length, level: levels.reduce((sum, level) => sum + level, 0) / levels.length };
}

/** Acciones ordenadas por relevancia (empate: orden del catálogo). */
export function rankActions(query: string, actions: SearchActionEntry[], partial = false): SearchActionEntry[] {
  return actions
    .map((entry, index) => ({ entry, index, relevance: actionRelevance(query, entry, partial) }))
    .filter((item): item is { entry: SearchActionEntry; index: number; relevance: Relevance } => item.relevance !== null)
    .sort((a, b) => compareRelevance(a.relevance, b.relevance) || a.index - b.index)
    .map((item) => item.entry);
}
