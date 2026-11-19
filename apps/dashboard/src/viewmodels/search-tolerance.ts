/**
 * Regla de tolerancia del buscador (dashboard-012 CA-30, CA-31, CA-41 a CA-44, RN-11).
 * Replica en el cliente `api-019` CA-36 a CA-40 solo para presentación
 * (resaltado, «Secciones» y «Acciones»): qué elementos existen lo decide la API.
 * Funciones puras sin dependencias.
 */

/** Niveles de coincidencia de `api-019` CA-41. */
export const LEVEL_EXACT = 4;
export const LEVEL_PREFIX = 3;
export const LEVEL_CONTAINS = 2;
export const LEVEL_APPROX = 1;

/** Una palabra de menos de 4 letras no admite «contiene» ni errores (CA-39, CA-40). */
const MIN_FUZZY_LENGTH = 4;
/** Desde 7 letras se admiten 2 errores; de 4 a 6, uno (CA-39). */
const LONG_WORD_LENGTH = 7;
/** Una palabra reconoce una acción con errores solo desde 7 letras (CA-41). */
const ACTION_FUZZY_LENGTH = 7;
const ACTION_MIN_LENGTH = 3;

/** Minúsculas sin acentos. */
export function foldText(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

const TOKEN = /[\p{L}\p{N}\p{M}]+/gu;

/** Palabras normalizadas de un texto (letras y dígitos). */
export function tokenize(value: string): string[] {
  return (value.match(TOKEN) ?? []).map(foldText).filter((token) => token !== "");
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];

    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }

  return previous[b.length];
}

function allowedDistance(length: number): number {
  if (length >= LONG_WORD_LENGTH) return 2;
  if (length >= MIN_FUZZY_LENGTH) return 1;

  return 0;
}

/** Nivel de una palabra ya normalizada contra una palabra completa del campo (0 = sin coincidencia). */
export function wordLevel(word: string, fieldWord: string): number {
  if (word === "" || fieldWord === "") return 0;
  if (word === fieldWord) return LEVEL_EXACT;
  if (fieldWord.startsWith(word)) return LEVEL_PREFIX;
  if (word.length >= MIN_FUZZY_LENGTH && fieldWord.includes(word)) return LEVEL_CONTAINS;
  if (word.length >= MIN_FUZZY_LENGTH && levenshtein(word, fieldWord) <= allowedDistance(word.length)) {
    return LEVEL_APPROX;
  }

  return 0;
}

/** Mejor nivel de una palabra en cualquiera de las palabras del texto. */
export function bestWordLevel(word: string, fieldWords: string[]): number {
  return fieldWords.reduce((best, fieldWord) => Math.max(best, wordLevel(word, fieldWord)), 0);
}

/**
 * Palabras que deben coincidir (enmienda (d), paridad con `api-019` CA-36 a
 * CA-44): con 1 o 2 palabras, todas; con más, al menos ceil(n/2).
 */
export function requiredWordCount(total: number): number {
  return total <= 3 ? total : Math.max(3, Math.ceil(total * 0.75));
}

/** Palabras vacías: no se exigen ni cuentan como coincidencia (paridad con la API). */
export const STOP_WORDS = new Set([
  "a", "al", "con", "de", "del", "el", "en", "es", "la", "las", "lo", "los", "o", "para", "por",
  "que", "se", "su", "sus", "un", "una", "unas", "unos", "y",
]);

/** Palabras con contenido de un término; si todas son vacías, se usan todas. */
export function contentWords(words: string[]): string[] {
  const content = words.filter((word) => !STOP_WORDS.has(word));

  return content.length > 0 ? content : words;
}

/** ¿Las palabras del término aparecen seguidas y en orden dentro de las palabras del texto? */
export function containsPhrase(words: string[], fieldWords: string[]): boolean {
  if (words.length === 0) return false;

  return ` ${fieldWords.join(" ")} `.includes(` ${words.join(" ")} `);
}

/**
 * Relevancia de un término (enmienda (d)): frase literal (3 = título idéntico,
 * 2 = título que la contiene, 1 = otro campo que la contiene), luego más
 * palabras coincidentes y mejor nivel medio.
 */
export type Relevance = { phrase: number; matched: number; level: number };

/** Orden: negativo si `a` es más relevante que `b`. */
export function compareRelevance(a: Relevance, b: Relevance): number {
  return b.phrase - a.phrase || b.matched - a.matched || b.level - a.level;
}

/**
 * Relevancia del término contra un título y otros campos, o `null` si no
 * alcanza las palabras requeridas. Las palabras se buscan entre todos los campos.
 */
export function relevanceOf(term: string, primary: string, others: string[] = []): Relevance | null {
  const words = tokenize(term);

  if (words.length === 0) return null;

  const primaryWords = tokenize(primary);
  const fieldWords = [primary, ...others].flatMap(tokenize);
  const content = contentWords(words);
  const levels = content.map((word) => bestWordLevel(word, fieldWords)).filter((level) => level > 0);

  if (levels.length < requiredWordCount(content.length)) return null;

  let phrase = 0;

  if (primaryWords.join(" ") === words.join(" ")) phrase = 3;
  else if (containsPhrase(words, primaryWords)) phrase = 2;
  else if (others.some((field) => containsPhrase(words, tokenize(field)))) phrase = 1;

  return { phrase, matched: levels.length, level: levels.reduce((sum, level) => sum + level, 0) / levels.length };
}

/**
 * Nivel medio de las palabras que coinciden contra uno o varios textos; debe
 * coincidir al menos ceil(n/2) palabras (todas con 1 o 2). Devuelve 0 si no.
 */
export function matchLevel(term: string, fields: string | string[]): number {
  const list = Array.isArray(fields) ? fields : [fields];

  return relevanceOf(term, list[0] ?? "", list.slice(1))?.level ?? 0;
}

export function matchesTerm(term: string, fields: string | string[]): boolean {
  return matchLevel(term, fields) > 0;
}

/**
 * ¿La palabra reconoce una palabra de acción? Exacta o prefijo; con errores
 * solo desde 7 letras y distancia 2 o menos (CA-41: «clara» no activa «clave»).
 */
export function matchesActionWord(word: string, actionWords: string[]): boolean {
  const folded = foldText(word);

  // dashboard-013 CA-20: «qr» (2 letras) reconoce una acción solo por coincidencia exacta.
  if (folded.length < ACTION_MIN_LENGTH) return folded.length === 2 && actionWords.includes(folded);

  return actionWords.some((actionWord) => {
    if (actionWord.length < ACTION_MIN_LENGTH) return false;
    if (actionWord.startsWith(folded)) return true;

    return folded.length >= ACTION_FUZZY_LENGTH && levenshtein(folded, actionWord) <= 2;
  });
}

export type HighlightSegment = { text: string; match: boolean };

/**
 * Partes del texto con las coincidencias marcadas según la regla de arriba.
 * Exacta y aproximada marcan la palabra entera; prefijo y «contiene» solo la
 * parte coincidente. Se pintan con nodos de React, nunca con `innerHTML`.
 */
export function highlightTolerant(text: string, term: string): HighlightSegment[] {
  // Enmienda (e): las palabras vacías («de», «la», «para»…) no se resaltan, igual que no cuentan.
  const words = contentWords(tokenize(term));

  if (words.length === 0) return [{ text, match: false }];

  const ranges: Array<[number, number]> = [];

  for (const found of text.matchAll(TOKEN)) {
    const raw = found[0];
    const start = found.index ?? 0;
    const chars = Array.from(raw);
    const folded = foldText(raw);
    const aligned = chars.every((char) => foldText(char).length === 1) && folded.length === chars.length;
    let best: { level: number; from: number; to: number } | null = null;

    for (const word of words) {
      const level = wordLevel(word, folded);

      if (level === 0) continue;

      let from = 0;
      let to = chars.length;

      if (aligned && level === LEVEL_PREFIX) to = word.length;
      if (aligned && level === LEVEL_CONTAINS) {
        from = folded.indexOf(word);
        to = from + word.length;
      }

      if (best === null || level > best.level) best = { level, from, to };
    }

    if (best) {
      const before = chars.slice(0, best.from).join("").length;
      const length = chars.slice(best.from, best.to).join("").length;

      ranges.push([start + before, start + before + length]);
    }
  }

  if (ranges.length === 0) return [{ text, match: false }];

  const segments: HighlightSegment[] = [];
  let cursor = 0;

  for (const [from, to] of ranges) {
    if (from > cursor) segments.push({ text: text.slice(cursor, from), match: false });
    segments.push({ text: text.slice(from, to), match: true });
    cursor = to;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), match: false });

  return segments;
}
