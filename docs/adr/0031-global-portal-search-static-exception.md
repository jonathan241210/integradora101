# 0031 · Búsqueda global del portal con HTML y JavaScript estático

- Estado: Aceptado. Autoriza la excepción limitada a `web-012`, sujeta a spec, plan y tasks aprobados.
- Solicitada: 2026-11-18
- Aprobada: 2026-11-18
- Spec relacionada: `apps/web/specs/012-portal-search.md` (Aprobada). Plan: `apps/web/plan/012-portal-search.md` (aprobado, condicionado a este ADR).
- Aprobado por: Responsable de backend.

## Contexto

- `apps/web/AGENTS.md` define el portal como SPA React con TypeScript, Vite y Tailwind, que consume `@arca/api-client` mediante hooks. Las Constituciones III y IV requieren separar lógica de interfaz y automatizar cada criterio con Vitest.
- Los ADR 0024, 0027 y 0028 autorizaron módulos específicos con HTML/JavaScript estático. Ninguno incluye búsqueda global, navegación profunda ni carga transversal de las fuentes públicas.
- `web-012` propone convertir el buscador de la portada en una búsqueda de contenido estático de la portada, especies publicadas, noticias, eventos y momentos publicados. Los datos dinámicos proceden de endpoints públicos existentes; la interfaz presenta resultados enlazados a su sección, tarjeta o página.
- La búsqueda implica lógica de cliente adicional, paginación y peticiones a varios endpoints. Por ello no queda cubierta por las excepciones acotadas vigentes.

## Decisión propuesta

Para la búsqueda global de `web-012`, se propone conservar HTML y JavaScript estático sin build ni nuevas dependencias, bajo estas condiciones:

1. **Alcance limitado a búsqueda pública:** indexa texto visible de las secciones de la portada y datos publicados devueltos por los endpoints existentes de especies, noticias, eventos y momentos. No crea ni modifica datos y no expone información privada.
2. **Un solo módulo de red:** `src/js/api.js` sigue siendo el único archivo que llama `fetch`. La UI y `js/search.js` usan exclusivamente métodos de `ArcaApi`.
3. **Sin servicios externos ni persistencia:** la consulta no se envía al servidor ni a terceros. Los datos recibidos y el índice viven solo en memoria de la página; no se usan cookies, `localStorage`, `sessionStorage` ni `Authorization`.
4. **Contenido como texto:** los resultados se crean con nodos DOM y `textContent`. No se usan `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write` ni `eval` con datos de la API.
5. **Pruebas por criterio:** cada CA de `web-012` tiene al menos un test automatizado con `node --test`, `node:vm` y DOM/API simulados, sin dependencias nuevas.
6. **Accesibilidad y límites:** formulario, estados, resultados, mensajes parciales y enlaces cumplen los criterios de accesibilidad de `web-012`; la carga de detalles de noticias usa concurrencia limitada y los errores se manejan por fuente.
7. **Coexistencia:** la búsqueda reutiliza y extiende los módulos actuales sin alterar las reglas de visibilidad editorial de `api-011`, `api-012` y `api-015`. Si los contratos existentes no permiten completitud, el alcance se revisa en una spec antes de agregar endpoints o filtros.
8. **Reevaluación obligatoria:** antes de añadir autenticación, escritura, almacenamiento persistente, envío de consultas al backend, servicios externos, nuevas dependencias o contenido fuera de `web-012`, se debe revisar esta excepción y crear/actualizar la decisión requerida.

La decisión no cambia la Constitución ni `apps/web/AGENTS.md`; registra una excepción acotada para la búsqueda de `web-012`. Si el equipo no acepta la excepción, el plan se rediseña para cumplir React, `@arca/api-client`, hooks y Vitest antes de crear tareas de implementación.

## Alternativas consideradas

- **Migrar el portal completo a React/Vite/TypeScript con `@arca/api-client` y Vitest.** Cumple la arquitectura objetivo, pero convierte esta mejora en una migración de mayor alcance que requiere coordinar las páginas y módulos estáticos existentes. Se mantiene como alternativa si el equipo no acepta la excepción.
- **Añadir un endpoint de búsqueda global a Laravel.** Se descarta para `web-012`: los endpoints públicos actuales proporcionan las fuentes y la consulta se procesa localmente. Si el volumen de datos o el tiempo de carga hacen inviable la búsqueda cliente, se reevaluará con una spec y un plan de API propios.
- **Usar un buscador de terceros o un índice externo.** Se descarta porque enviaría texto o contenido del portal fuera del entorno municipal, requeriría una dependencia/servicio adicional y no hace falta para el alcance aprobado.
- **Enmendar ADR 0024, 0027 o 0028.** Se descarta: esos ADR registran excepciones acotadas a otras funciones. Un ADR separado mantiene trazabilidad y permite revertir o reevaluar esta decisión sin alterar aprobaciones anteriores.

## Consecuencias

### Positivas

- El buscador puede incluir contenido que vive en varias fuentes públicas sin desplegar un servicio nuevo ni persistir un índice.
- Se mantienen las condiciones de seguridad ya aplicadas por el portal estático: un módulo de red, lectura anónima, texto seguro y sin almacenamiento persistente.
- La excepción y sus límites quedan vinculados a una spec y un plan concretos.

### Riesgos o costos

- **Deuda arquitectónica adicional:** `web-012` no usa React/hooks ni Vitest, y el portal sigue apartándose de `apps/web/AGENTS.md` y de las Constituciones III y IV en esta feature. Se compensa con pruebas por CA y este ADR.
- **Costo de carga:** obtener páginas completas de noticias y momentos, y detalles de noticias, puede requerir varias solicitudes. La caché en memoria evita repetirlas en consultas posteriores de la misma página; se limita la concurrencia y se comunican fallos parciales.
- **Índice temporal:** una publicación o vencimiento ocurrido mientras el portal está abierto puede no reflejarse hasta renovar la búsqueda o recargar la página.
- **Escalabilidad:** la búsqueda cliente y el recorrido de páginas pueden dejar de ser adecuados cuando crezca el volumen. En ese caso se requiere revisar la spec y evaluar búsqueda en servidor.

## Validación y revisión

- Aprobación de la propuesta: aceptada por el responsable de backend.
- Responsable funcional: aprobó la spec `web-012`.
- Aprobador técnico: Responsable de backend.
- Límites: autoriza el código de la función descrita por `web-012` una vez aprobados sus tasks; no autoriza dependencias, API nueva ni cambios a otras aplicaciones.
- Constitución: no cambia. Las excepciones propuestas son solo para las Constituciones III y IV en el alcance de `web-012`.
- Enlaces: `apps/web/specs/012-portal-search.md`, `apps/web/plan/012-portal-search.md`, ADR 0024, ADR 0027 y ADR 0028.
