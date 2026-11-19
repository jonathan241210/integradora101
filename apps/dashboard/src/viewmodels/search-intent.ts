import { foldText, tokenize } from "./search-tolerance";

/**
 * Palabras que nombran una sección («noticia», «evento»…). Si la consulta las
 * incluye, esa sección va primero y la palabra no se exige a los elementos.
 */
const SECTION_WORDS: Record<string, string[]> = {
  news: ["noticia", "noticias", "nota", "notas"],
  events: ["evento", "eventos", "actividad", "actividades"],
  enclosures: ["recinto", "recintos"],
  users: ["usuario", "usuarios", "cuenta", "cuentas", "empleado", "empleados", "personal"],
  memories: ["momento", "momentos", "recuerdo", "recuerdos"],
  tulanpedia: ["especie", "especies", "tulanpedia"],
  "ticket-history": ["boleto", "boletos", "folio", "folios"],
};

export type SectionIntent = {
  /** Secciones nombradas en la consulta, en el orden en que aparecen. */
  sections: string[];
  /** Consulta sin las palabras de sección; vacía si solo había esas palabras. */
  rest: string;
};

export function detectSectionIntent(query: string): SectionIntent {
  const sections: string[] = [];
  const rest: string[] = [];

  for (const raw of query.trim().split(/\s+/).filter(Boolean)) {
    const word = tokenize(raw).join("") || foldText(raw);
    const section = Object.keys(SECTION_WORDS).find((id) => SECTION_WORDS[id].includes(word));

    if (section) {
      if (!sections.includes(section)) sections.push(section);
    } else {
      rest.push(raw);
    }
  }

  return { sections, rest: rest.join(" ") };
}

/** Consulta que se envía a la API: sin palabras de sección si queda texto suficiente. */
export function queryWithoutSectionWords(query: string, minLength = 2): string {
  const { sections, rest } = detectSectionIntent(query);

  return sections.length > 0 && rest.trim().length >= minLength ? rest.trim() : query.trim();
}
