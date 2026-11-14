/**
 * Pestaña activa de TulanPedia y su reflejo en la URL (dashboard-010 CA-63,
 * RN-17). Funciones puras: sin router y sin almacenamiento del navegador.
 * La URL solo lleva la sección y la pestaña; nunca identificadores ni permisos.
 */
export type TulanpediaTab = "requests" | "published";

export const tulanpediaTabs: { id: TulanpediaTab; label: string }[] = [
  { id: "requests", label: "Solicitudes" },
  { id: "published", label: "Publicadas" },
];

/** `tab` ausente o no válido abre «Solicitudes». */
export function readTulanpediaTab(search: string): TulanpediaTab {
  const tab = new URLSearchParams(search).get("tab");

  return tab === "published" ? "published" : "requests";
}

/** ¿La URL pide abrir TulanPedia? */
export function isTulanpediaSearch(search: string): boolean {
  return new URLSearchParams(search).get("section") === "tulanpedia";
}

export function buildTulanpediaSearch(tab: TulanpediaTab): string {
  return `?section=tulanpedia&tab=${tab}`;
}

/** Quita `section` y `tab`, conservando cualquier otro parámetro. */
export function clearTulanpediaSearch(search: string): string {
  const params = new URLSearchParams(search);

  params.delete("section");
  params.delete("tab");

  const rest = params.toString();

  return rest ? `?${rest}` : "";
}

/** Lo mínimo de `window` que usa la sincronización de la URL (inyectable en pruebas). */
export type UrlWindow = {
  location: { pathname: string; search: string; hash: string };
  history: { state: unknown; replaceState: (state: unknown, title: string, url: string) => void };
};

/** Refleja la pestaña con `replaceState`: sin recarga ni entradas nuevas en el historial. */
export function syncTulanpediaUrl(win: UrlWindow, tab: TulanpediaTab): void {
  win.history.replaceState(
    win.history.state,
    "",
    `${win.location.pathname}${buildTulanpediaSearch(tab)}${win.location.hash}`,
  );
}

/** Al salir de TulanPedia la URL no conserva `section` ni `tab`. */
export function leaveTulanpediaUrl(win: UrlWindow): void {
  win.history.replaceState(
    win.history.state,
    "",
    `${win.location.pathname}${clearTulanpediaSearch(win.location.search)}${win.location.hash}`,
  );
}
