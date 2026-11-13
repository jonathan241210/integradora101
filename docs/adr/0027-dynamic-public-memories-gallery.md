# 0027 · Galería dinámica de «Momentos para recordar» en el portal: excepción acotada a web-010

- Estado: Aceptado (2026-11-12; aprobado por Jonathan, responsable de backend). Propuesta original del 2026-11-10. Autoriza redactar plan y tasks de `web-010`. Desde la aprobación de su spec (2026-11-12), la implementación de `web-010` empieza cuando existan plan y tasks aprobados.
- Fecha: 2026-11-10
- Spec relacionada: `apps/web/specs/010-dynamic-memories.md` (Aprobada 2026-11-12; plan y tasks pendientes). Consumidor de `apps/api/specs/012-public-memories-read.md` (Aprobada 2026-11-12). Relacionada con `apps/web/specs/009-dynamic-news-events.md` y con `docs/adr/0024-web-static-portal-exception.md`.
- Aprobado por: Jonathan (responsable de backend), 2026-11-12.

## Contexto

- `apps/web/AGENTS.md` define el portal institucional como SPA con React 19, TypeScript, Vite 7 y Tailwind CSS 4, que usa `@arca/api-client` y hooks. La Constitución III exige que la UI llame a `@arca/api-client` mediante hooks, y la IV exige un test automatizado por criterio.
- El ADR 0024 (Aceptado el 2026-11-07) autoriza HTML y JavaScript estático para el portal en las páginas de `web-009`: portada, `noticias.html` y `eventos.html`. Su punto 4 limita la excepción a esas páginas y módulos, y dice que no se extiende a otros módulos sin un ADR nuevo.
- `web-010` añade a la portada un módulo nuevo, `js/memories.js`, que reemplaza la sección «Momentos para recordar» (`#galeria`) por las peticiones aceptadas y vigentes de la API (`api-012`). El módulo es nuevo y, por tanto, queda fuera de lo que autorizó el ADR 0024.
- La galería es de lectura pública, sin sesión, sin formularios y sin escritura, igual que la portada de `web-009`. Las imágenes y las opiniones las revisa el zoológico antes de publicarlas (`api-010`).

## Decisión

Para la galería «Momentos para recordar» de la portada (`web-010`), el portal mantiene HTML y JavaScript estático, con las mismas condiciones que el ADR 0024 y con su alcance propio:

1. **Sin `@arca/api-client`.** La lectura de la API ocurre solo en `src/js/api.js`, que añade una función de lectura de momentos (`web-010` CA-09). No hay hooks en el portal. Es la misma regla de `web-009` RN-06.
2. **Sin build, sin `package.json` y sin dependencias.** Se usan scripts clásicos con `defer`. No se añaden paquetes, fuentes remotas ni scripts de terceros (`web-010` RN-05, CA-14).
3. **Runner `node --test`** con `node:vm`, `node:fs` y un DOM simulado, como en `web-009`. No se usa Vitest (`web-010` CA-13).
4. **Texto seguro.** Todo dato de la API se escribe como texto (`textContent`). No se usan `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write` ni `eval` con datos de la API. Se verifica con una prueba estática (`web-010` CA-06).
5. **URLs de imagen limitadas.** Solo `http:`, `https:` o rutas relativas del mismo origen. Cualquier otro esquema muestra el marcador decorativo (`web-010` RN-04, CA-07).
6. **Sin estado en el navegador.** No hay cookies, `localStorage`, `sessionStorage` ni credenciales (`credentials: 'omit'`). Cada carga pide la galería a la API.
7. **Alcance acotado.** La excepción cubre solo la galería de la portada, con `GET /api/v1/memories?limit=6` (`api-012`), presentada como carrusel de hasta seis momentos, con un botón visible de pausa (`web-010` CA-15 a CA-23; enmienda de alcance del 2026-11-12, confirmada por Jonathan el mismo día). No cubre una página propia de «Momentos», la paginación, los filtros, el visor a pantalla completa, ni ninguna otra página o app. Cualquier extensión requiere un ADR nuevo.

## Justificación

- El contenido es público, de solo lectura y cacheable. Una lista de hasta seis fotos no justifica un build, dependencias y un segundo modelo de trabajo en el portal.
- El portal ya usa este patrón (`web-001`, Implementada; `web-008`, Implementada; `web-009`, Aprobada con implementación en curso). Mantenerlo evita tener dos modelos de trabajo en el mismo sitio.
- Se separa de ADR 0024 para que cada ADR registre lo que autoriza y cuándo. El ADR 0024 sigue siendo válido tal como se aprobó el 2026-11-07. Su alcance no cambia.

## Alternativas consideradas

- **Enmendar el ADR 0024 para incluir la galería.** Descartada: el ADR 0024 está Aceptado por el equipo para `web-009`. Enmendarlo mezclaría dos decisiones en un solo registro y cambiaría un texto ya aprobado, con menos trazabilidad.
- **Migrar la portada ya a React + Vite + `@arca/api-client` con hooks y Vitest.** Cumple `apps/web/AGENTS.md` y las Constituciones III y IV. Descartada para esta galería: obliga a crear `package.json`, dependencias y build para una lista de lectura, y retrasa la entrega. Se reevalúa con la spec de pagos (ADR 0024, «Reevaluación») o si la galería crece.
- **Generar la galería en el build con los datos de la API.** Descartada: el zoológico debe ver la publicación de una foto aceptada sin redespliegue.
- **Widget o iframe de un servicio externo.** Descartada: pasa datos y contenido a un tercero, y no cumple la Constitución I.

## Consecuencias

### Positivas

- Entrega de la galería sin build ni dependencias nuevas.
- Un solo módulo de red (`api.js`) y un solo punto de verificación de seguridad (texto seguro, URLs, sin almacenamiento) para la portada.
- El patrón coincide con `web-001`, `web-008` y `web-009`.
- La trazabilidad queda clara: cada excepción de arquitectura del portal tiene su ADR.

### Riesgos o costos

- **Deuda de arquitectura, ampliada:** el portal no cumple la arquitectura objetivo de `apps/web/AGENTS.md` ni las Constituciones III y IV en la galería. La deuda se registra aquí, en `web-010` y en el ADR 0024. Hay dos excepciones de arquitectura en el portal, cada una con su ADR.
- **Dos formas de consumir la API en el repositorio** (`@arca/api-client` en los clientes y `api.js` en el portal), sin tipos compartidos para el portal.
- **Sin tipado** en la capa de presentación del portal; se compensa con pruebas de forma (`web-010` CA-01 a CA-14).
- **Riesgo de crecimiento de alcance:** la excepción podría usarse para más páginas o más lógica de cliente. Se mitiga con el alcance acotado de este ADR y con la reevaluación.
- **Sin JavaScript no hay galería:** limitación aceptada y documentada, igual que en `web-009`.

## Reevaluación

- **Obligatoria** antes de aprobar la spec de pago con tarjeta en el portal, junto con su ADR y su proveedor (ADR 0009). Si esa spec exige sesión, estado de carrito o formularios con validación compleja, el portal migrará a SPA React con `@arca/api-client` o esta excepción se justificará de nuevo.
- **También** si la galería necesita paginación («Cargar más»), filtros, una página propia de «Momentos», un visor a pantalla completa o más lógica de cliente.
- **También** si el portal crece más allá de las páginas de `web-009` y de la galería, o si se requieren cookies o autenticación del visitante.

## Validación y revisión

- Estado: **Aceptado** (2026-11-12). Aprobado por Jonathan (responsable de backend), 2026-11-12.
- Condiciones: el ADR no exige confirmaciones adicionales del equipo. Sus condiciones 1 a 7 y su alcance acotado siguen vigentes.
- Pendiente para `web-010`: su spec está Aprobada (2026-11-12). La implementación empieza cuando existan plan y tasks aprobados, con sus dependencias (`api-012` y `api-010`, Aprobadas el 2026-11-12; ver `apps/web/specs/010-dynamic-memories.md`).
- Revisión obligatoria: al especificar el pago con tarjeta, al cambiar el alcance del portal o al pedir paginación o filtros para la galería.
- Enmienda de alcance (2026-11-12, pedida por el usuario): el carrusel de hasta seis momentos de la galería entra en la excepción (punto 7), porque el punto 7 lo excluía de forma expresa. Incluye el botón visible de pausa de `web-010` CA-23. No cambia el resto de condiciones. Confirmada por Jonathan (responsable de backend), 2026-11-12. El estado del ADR no cambia por este texto.
- Constitución: no cambia. Esta es una excepción por app, registrada según `AGENTS.md` raíz.
- Enlaces: `apps/web/specs/010-dynamic-memories.md` (RN-03 a RN-06, CA-06, CA-09, CA-13, CA-14), `apps/web/specs/009-dynamic-news-events.md` (RN-05, RN-06, RN-08), `apps/api/specs/012-public-memories-read.md`, `apps/api/specs/010-visitor-memory-requests.md`, `docs/adr/0024-web-static-portal-exception.md`, `docs/adr/0009-pagos-electronicos-futuros.md`.
