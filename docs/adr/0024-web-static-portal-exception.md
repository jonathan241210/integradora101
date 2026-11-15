# 0024 · Excepción de arquitectura para el portal público: HTML y JavaScript estático en `apps/web`

- Estado: Aceptado (2026-11-07; aprobado por el equipo de desarrollo; autoriza la implementación de web-009)
- Fecha: 2026-11-07
- Spec relacionada: `apps/web/specs/009-dynamic-news-events.md` (plan `apps/web/plan/009-dynamic-news-events.md`, tasks `apps/web/tasks/009-dynamic-news-events.md`). Consumidor de `apps/api/specs/011-public-news-read.md`.

## Contexto

- `apps/web/AGENTS.md` define el portal institucional como SPA con React 19, TypeScript, Vite 7 y Tailwind CSS 4, que usa `@arca/api-client` y hooks. La Constitución III exige que la UI llame a `@arca/api-client` mediante hooks, y la IV exige un test automatizado por criterio (Vitest en front).
- Hoy el portal es un sitio estático en `apps/web/src/` (`web-001`, Implementada), con JavaScript clásico probado con `node --test` (`web-008`, Implementada). No tiene `package.json` ni build.
- `web-009` conecta la portada y dos páginas de listado a la API pública (`api-011` y `api-006`). El contenido es público, de solo lectura, sin sesión, sin formularios y cacheable por el navegador. El detalle de una noticia se pide al expandir su tarjeta.
- Los pagos con tarjeta están previstos como spec futura con su propio ADR (ADR 0009, Aceptado).

## Decisión

Para las páginas de contenido público de `apps/web` que define `web-009` (portada, `noticias.html` y `eventos.html`), el portal mantiene HTML y JavaScript estático, con estas condiciones:

1. **Sin `@arca/api-client`.** Un único módulo, `src/js/api.js`, llama a `fetch` (RN-06 de `web-009`). No hay hooks.
2. **Sin build, sin `package.json`, sin dependencias.** Se usan scripts clásicos `defer`, como `accessibility.js` (RN-05 de `web-009`).
3. **Runner `node --test`** con `node:vm`, `node:fs` y un DOM simulado, en lugar de Vitest, solo para la suite de `web-009`.
4. **Alcance acotado.** La excepción aplica a las páginas y módulos de `web-009`. No se extiende a otras páginas del portal ni a otras apps sin un ADR nuevo. `web-001` y `web-008` mantienen su propio régimen, ya aprobado.
5. **Compensaciones obligatorias:** todo dato de la API se escribe como texto (`textContent`), sin `innerHTML` ni `eval` (verificado por prueba estática); las URLs de imagen se limitan a `http`, `https` o rutas relativas; no hay cookies, `localStorage` ni credenciales; y cada criterio tiene prueba automatizada.

## Justificación

- El contenido es público, de solo lectura y cacheable. No hay sesión, datos del visitante ni formularios. Una SPA aporta poco aquí frente a su coste de build, dependencias y mantenimiento.
- El portal ya usa este patrón (`web-001`, Implementada) y su suite con `node --test` existe en el repositorio (`web-008`, Implementada). Mantener el mismo patrón evita un segundo modelo de trabajo en el mismo sitio.
- Una migración ahora supondría reescribir la portada y las páginas sin beneficio funcional para el visitante.

## Alternativas consideradas

- **Migrar ya a React + Vite + `@arca/api-client` con hooks y Vitest.** Cumple `apps/web/AGENTS.md` y las Constituciones III y IV. Descartada para `web-009`: obliga a crear `package.json`, dependencias y build para tres páginas de lectura, y retrasa la entrega del contenido real. Se reevalúa con la spec de pagos (ver «Reevaluación»).
- **Generar el HTML en build time con los datos de la API.** Descartada: el contenido debe reflejar las publicaciones sin redespliegue.
- **Vitest con HTML estático.** Descartada: requiere `package.json` y dependencias, lo que contradice RN-05 de `web-009`.
- **Mantener la excepción sin ADR.** Descartada: `apps/web/AGENTS.md` y el `AGENTS.md` raíz exigen ADR para toda excepción.

## Consecuencias

### Positivas

- Entrega de contenido real sin build ni dependencias nuevas.
- Un solo módulo de red (`api.js`) y un solo punto de verificación de seguridad (texto seguro, URLs, sin almacenamiento).
- El patrón coincide con `web-001` y `web-008`.

### Riesgos o costos

- **Deuda de arquitectura:** el portal no cumple la arquitectura objetivo de `apps/web/AGENTS.md` ni las Constituciones III y IV en estas páginas. Queda registrada aquí y en `web-009`.
- **Dos formas de consumir la API en el repositorio** (`@arca/api-client` en los clientes y `api.js` en el portal), sin tipos compartidos para el portal.
- **Sin tipado** en la capa de presentación del portal; se compensa con pruebas de forma (`CA-01` a `CA-16` de `web-009`).
- **Sin JavaScript no hay contenido**: limitación aceptada y documentada.

## Reevaluación

- **Obligatoria** antes de aprobar la spec de pago con tarjeta en el portal, junto con su ADR y su proveedor (ADR 0009). Si esa spec exige sesión, estado de carrito o formularios con validación compleja, el portal migrará a SPA React con `@arca/api-client` o esta excepción se justificará de nuevo.
- **También** si el portal crece más allá de las páginas de `web-009` (más páginas con estado o más lógica de cliente), o si se requieren cookies o autenticación del visitante.

## Nota de alcance (2026-11-10)

- La galería «Momentos para recordar» de la portada (`apps/web/specs/010-dynamic-memories.md`, Aprobada 2026-11-12) **no está cubierta por esta decisión**. Es un módulo nuevo y esta decisión se limita a `web-009`.
- Su excepción de arquitectura se registra en `docs/adr/0027-dynamic-public-memories-gallery.md` (Aceptado 2026-11-12), que hereda las condiciones 1 a 6 de este ADR. Este ADR no se enmienda y su estado no cambia.

## Validación y revisión

- Aprobación del equipo: **Aprobado el 2026-11-07 por el equipo de desarrollo (Víctor Adrián y Jonathan)**. Queda formalmente autorizada la implementación de web-009 conforme a los límites de este ADR.
- Revisión obligatoria: al especificar el pago con tarjeta o al cambiar el alcance del portal.
- Constitución: no cambia. Esta es una excepción por app, registrada según `AGENTS.md` raíz.
- Enlaces: `apps/web/specs/009-dynamic-news-events.md` (RN-05, RN-06, RN-08), `apps/web/plan/009-dynamic-news-events.md` (Constitution Check, excepciones), `apps/web/tasks/009-dynamic-news-events.md` (P-01), `apps/web/specs/001-relocate-static-portal.md`, `apps/web/specs/008-cognitive-accessibility-assistant.md`, `docs/adr/0009-pagos-electronicos-futuros.md`.
