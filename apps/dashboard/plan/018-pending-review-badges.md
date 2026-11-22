# Plan técnico · 018 · pending-review-badges

- Spec: `apps/dashboard/specs/018-pending-review-badges.md`
- Estado de spec: Aprobada (Jonathan, 2026-11-20)
- Estado del plan: **Aprobado — aprobación técnica: Jonathan, 2026-11-20**. Preguntas 1 a 4 cerradas en «Decisiones 2026-11-20».
- Responsable técnico: `<por identificar>`
- Dependencia de contrato: `apps/api/specs/024-pending-review-counts.md` y su plan `apps/api/plan/024-pending-review-counts.md` (endpoint `GET /api/v1/admin/pending-counts`, Borrador). Las pruebas de cliente pueden usar mocks; la integración real exige la ruta de `api-024` mergeada.
- DBR relacionada: ninguna. No toca datos ni esquema.
- ADR: ninguno. Sin dependencias nuevas (la tercera tonalidad de aviso se resuelve dentro de `DashboardNotifications`, RN-12).
- Orden en el panel: 015 → 019 → 016 → 017 → 018. Esta feature es la última; rebase sobre lo mergeado en `App.tsx`, `DashboardNotifications.tsx`, `styles.css` y `packages/api-client`.

## Diseño de solución

Presentación pura de dos conteos que decide la API (RN-01). Tres piezas separadas:

1. **Cliente:** método `admin.pendingCounts()` en `packages/api-client` que llama a `GET /api/v1/admin/pending-counts` y devuelve el cuerpo tal cual (las claves van en la raíz, no en `data`). Sin lógica.
2. **ViewModel (lógica de presentación, sin React):** `viewmodels/pending-review.ts` con funciones puras:
   - qué claves consultar según `profile.permissions` (sin permisos, ninguna consulta: CA-11);
   - mapa de secciones: `memories` → clave `memories`; `tulanpedia` → clave `species_requests`;
   - si el último conteo de cada clave es mayor que 0 (puntito, RN-04);
   - nombre accesible de «Momentos» y «TulanPedia» (CA-09);
   - textos de avisos en singular y plural (CA-01, CA-03, aprobados);
   - intervalo mínimo de 15 s entre consultas (RN-07, CA-16).
3. **Hook (ViewModel de React):** `viewmodels/usePendingReviewCounts.ts`. Usa `adminApi` de `services/arca-api.ts` (como `useDashboardSummary`). Se ejecuta al tener sesión autenticada y al cambiar `activeSection` del shell (CA-07). No hay `setInterval` ni sondeo (CA-08). Ignora respuestas que llegan de un perfil anterior.

Vistas (solo presentan):

- **Menú** (`App.tsx`, bloque `sidebar-nav`): el botón de cada sección con puntito recibe `aria-label` con el nombre accesible y un `<span className="sidebar-link__dot" aria-hidden="true" />`. El puntito se ve con el menú contraído y en móvil (RN-09).
- **Avisos** (`components/PendingReviewNotices.tsx`): componente hijo de `DashboardNotifications` que publica los avisos de pendientes una vez por inicio de sesión (RN-03, CA-04).

### Avisos en cola (decisión de diseño que requiere confirmación)

`DashboardNotifications` hoy tiene una sola ranura visible: `publish` reemplaza el aviso visible (`notificationsReducer`). Para cumplir la spec hay que cambiar eso:

- CA-01 pide un aviso por cada tipo si hay ambos: dos avisos a la vez no caben en una ranura.
- CA-15 pide que el aviso de pendientes espere al anterior (éxito o error).

Propuesta: el reducer pasa a **FIFO**. `publish` añade a una cola; el visible es el primero; al cerrarse (5 s o botón) sale el siguiente. Es un cambio de comportamiento para éxitos y errores existentes (hoy el último reemplaza al anterior). Ver pregunta 1.

### Tono informativo

`NotificationTone` es `"success" | "error"`. RN-12 exige un tono informativo neutro dentro de `DashboardNotifications`, sin usar el de éxito. Propuesta: añadir `"info"` al tipo, a las etiquetas (`Aviso`, ver pregunta 2), al icono (`info` si existe en `Icon`; si no, `check` sin color de éxito) y a la hoja de estilos `.dashboard-notification[data-tone="info"]` con tokens semánticos (`--color-accent` o un token neutro existente; no hex de marca).

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Cliente | `packages/api-client/admin.ts` (método `pendingCounts`), `packages/api-client/admin-types.ts` (`PendingReviewCountsDto`), `packages/api-client/README.md` | Método y tipo, sin lógica (CA-13) |
| Dashboard / ViewModel | `apps/dashboard/src/viewmodels/pending-review.ts` (nuevo) | Reglas de presentación: claves, puntito, nombre accesible, textos, intervalo (CA-01 a CA-03, CA-05, CA-09, CA-11, CA-16) |
| Dashboard / ViewModel | `apps/dashboard/src/viewmodels/usePendingReviewCounts.ts` (nuevo) | Hook: consulta al iniciar y al cambiar de sección; errores silenciosos (CA-06, CA-07, CA-08, CA-10, CA-11, CA-16) |
| Dashboard / vista | `apps/dashboard/src/components/PendingReviewNotices.tsx` (nuevo) | Publica los avisos al iniciar sesión (CA-01, CA-04, CA-15) |
| Dashboard / avisos | `apps/dashboard/src/viewmodels/dashboard-notifications.ts`, `apps/dashboard/src/components/DashboardNotifications.tsx` | Tono `info`, cola FIFO, hook `usePublishNotice()` exportado (RN-03, RN-12, CA-15) |
| Dashboard / menú | `apps/dashboard/src/App.tsx` | Puntito, nombre accesible y llamada al hook con `activeSection` (CA-05, CA-07, CA-09, RN-09) |
| Dashboard / estilos | `apps/dashboard/src/styles.css` | `.sidebar-link__dot` (con menú contraído y móvil) y `data-tone="info"` con tokens semánticos (RN-11) |
| Dashboard / pruebas | `apps/dashboard/src/tests/pending-review-badges.test.tsx`, `apps/dashboard/src/tests/pending-review-api-client.test.tsx`, `apps/dashboard/src/tests/pending-review-badges-coverage.test.tsx` | Un test por CA (CA-14) y cliente con mock (CA-13) |
| Documentación | `packages/api-client/README.md`; `apps/dashboard/docs/` solo si existe referencia de menú o avisos que cambie | Referencia duradera |

No se modifica `navigation.ts` (los permisos de cada sección no cambian) ni las pantallas de revisión (`dashboard-008`, `dashboard-010`).

## Contrato y datos

- **Cliente:**
  - `pendingCounts(): Promise<PendingReviewCountsDto>`, con `PendingReviewCountsDto = { species_requests?: number; memories?: number }`.
  - Llama `http.get` sobre `${base}/pending-counts` y devuelve el cuerpo sin `unwrap` (la API no usa `data` aquí, ver `api-024` pregunta 3).
  - Errores: el cliente deja pasar el `ApiError` existente (`status`, `message`); el hook lo trata sin mostrar nada.
- **Estado del hook:** `{ counts: { species_requests?: number; memories?: number }, status: "idle" | "loading" | "ready" | "error" }` y `lastLoadedAt` solo en éxito (ver pregunta 4).
- **Textos aprobados (CA-01, CA-03):**
  - `species_requests`: «Tienes 1 solicitud de especie pendiente.» / «Tienes N solicitudes de especies pendientes.»
  - `memories`: «Tienes 1 momento pendiente de revisión.» / «Tienes N momentos pendientes de revisión.»
  - Los textos de CA-03 son los de la spec. El plural de especies es «solicitudes de especies» (así está escrito en CA-01).
- **Nombres accesibles (CA-09):** «TulanPedia, con solicitudes pendientes»; «Momentos, con momentos pendientes de revisión». Sin pendientes, solo el nombre de la sección. Hoy `aria-label` es igual a la etiqueta; se sustituye por el nombre calculado.
- **Permisos:** la consulta se hace solo si `profile.permissions` incluye `species.review` o `memories.review` (RN-02). Las claves se piden a la API, que decide (RN-01).
- **Errores:** red o 5xx: no hay puntito ni aviso nuevo, no hay pantalla de error, no hay reintento en bucle (CA-10). 401: lo gestiona el manejo de sesión existente (`dashboard-002`); no añade flujo.

## Seguridad, offline y operación

- **Autorización:** la comprobación real es de la API (`api-024`: permiso de ruta, 2FA y límite). Ocultar el puntito no es autorización (`apps/dashboard/AGENTS.md`).
- **Privacidad:** solo cifras y textos fijos. El dashboard no guarda conteos en `localStorage` ni en memoria persistente; solo el último resultado en el hook durante la sesión (RN-07).
- **Carga:** intervalo mínimo de 15 s entre consultas (RN-07) más el límite de 60/min por usuario de `api-024`. No hay consultas en segundo plano.
- **Offline:** no aplica al panel web. La PWA no consulta conteos.
- **Accesibilidad:** el puntito es `aria-hidden="true"`; el estado va en el nombre accesible; el aviso usa `role="status"` (no `alert`); el icono y el texto no dependen solo del color.
- **Sin tiempo real:** sin websockets, sin `setInterval`, sin notificaciones del sistema (CA-08).
- **Portabilidad:** no aplica (cliente).

## Mapeo de criterios a pruebas

Vitest, archivos en `apps/dashboard/src/tests/`. Nombre de cada caso: `it("CA-xx pending-review-badges: ...")`, como en `published-species-pending-notice.test.tsx`. El cliente de la API se mockea con `vi.mock("@/services/arca-api")` o con el mock de `@arca/api-client` según el patrón existente.

| Criterio | Prueba automatizada | App/ubicación | Tareas |
|---|---|---|---|
| CA-01 | «CA-01 pending-review-badges: aviso al iniciar con pendientes» | `pending-review-badges.test.tsx` | T-05, T-06 |
| CA-02 | «CA-02 pending-review-badges: sin aviso con cero» | `pending-review-badges.test.tsx` | T-05 |
| CA-03 | «CA-03 pending-review-badges: singular y plural» | `pending-review-badges.test.tsx` | T-02, T-05 |
| CA-04 | «CA-04 pending-review-badges: aviso no se repite al cambiar de pantalla» | `pending-review-badges.test.tsx` | T-05, T-07 |
| CA-05 | «CA-05 pending-review-badges: puntito por sección» | `pending-review-badges.test.tsx` | T-06, T-07 |
| CA-06 | «CA-06 pending-review-badges: puntito baja a cero» | `pending-review-badges.test.tsx` | T-07 |
| CA-07 | «CA-07 pending-review-badges: consulta al cambiar de sección» (menú, búsqueda global y enlace interno) | `pending-review-badges.test.tsx` | T-07 |
| CA-08 | «CA-08 pending-review-badges: sin sondeo» (sin `setInterval` ni `WebSocket`; sin consulta sin cambio de pantalla) | `pending-review-badges.test.tsx` | T-07 |
| CA-09 | «CA-09 pending-review-badges: nombre accesible y puntito decorativo» | `pending-review-badges.test.tsx` | T-06 |
| CA-10 | «CA-10 pending-review-badges: fallo no bloquea» | `pending-review-badges.test.tsx` | T-07 |
| CA-11 | «CA-11 pending-review-badges: sin permisos no consulta» | `pending-review-badges.test.tsx` | T-07 |
| CA-12 | «CA-12 pending-review-badges: solo cifras» | `pending-review-badges.test.tsx` | T-05 |
| CA-13 | «CA-13 pending-review-badges: MVVM y api-client» (mock de `@arca/api-client`; sin `fetch` ni `axios` en componentes) | `pending-review-api-client.test.tsx` | T-01, T-03 |
| CA-14 | Verificación de cobertura: cada `CA-01` a `CA-16` aparece en un `it(...)` | `pending-review-badges-coverage.test.tsx` | T-09 |
| CA-15 | «CA-15 pending-review-badges: espera a otro aviso» | `pending-review-badges.test.tsx` | T-04, T-07 |
| CA-16 | «CA-16 pending-review-badges: intervalo mínimo de 15 s» (con `vi.useFakeTimers`) | `pending-review-badges.test.tsx` | T-03, T-07 |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Sin dependencias nuevas; `@arca/api-client`, `@arca/ui` y React ya están. Sin variables de nube. |
| II. La spec manda | Sí | Spec 018 Aprobada (2026-11-20). Plan y tasks con el mismo `018-pending-review-badges`. Borrador hasta aprobación. |
| III. Lógica separada de la interfaz | Sí | Reglas de presentación en `viewmodels/`; la decisión de pendientes la toma la API (`api-024`). Componentes sin `fetch`, sin cálculo de negocio. |
| IV. Un test por criterio | Sí (pendiente de evidencia) | Mapeo CA-01 a CA-16 con casos nombrados. Verde pendiente de evidencia de la sesión principal. |
| V. Una sola fuente de verdad para los datos | Sí | No se guardan conteos fuera de la API. El último resultado solo vive en memoria del hook. |
| VI. Código en inglés, personas en español | Sí | Identificadores en inglés (`pendingCounts`, `species_requests`); textos de UI y avisos en español; tono `info` en inglés en el código. |

Excepciones: ninguna. El tono `info` y la cola de avisos son cambios de `DashboardNotifications` que requieren confirmación (preguntas 1 y 2), no excepciones a la Constitución.

## Riesgos y decisiones

- **ADR requerido/aprobado:** ninguno.
- **Cambio de comportamiento de avisos:** la cola FIFO altera cómo se reemplazan los avisos de éxito y error (pregunta 1). Mitigación: pruebas de `published-species-*` y de los flujos de error existentes en verde antes de mergear.
- **Nombre accesible:** `aria-label` del menú pasa a ser calculado. Riesgo de romper tests de navegación existentes que buscan por el nombre antiguo: revisar `administration-navigation.test.tsx`, `species-navigation.test.tsx` y `memory-navigation.test.tsx` al implementar.
- **Aviso que se cierra en 5 s:** es el comportamiento actual (RN-03). Si se quiere más tiempo, es un cambio de `DashboardNotifications` en otra spec.
- **Pantallas con enlaces directos o búsqueda:** cubiertas por el cambio de `activeSection` en el shell (CA-07). Un clic en la sección ya abierta no vuelve a consultar; ver pregunta 3.
- **Alternativas descartadas:**
  - Un store global para conteos: innecesario; el hook vive en `App`, que ya tiene el perfil y el shell.
  - Sondeo con `setInterval`: prohibido por la spec (CA-08).
  - Mostrar el aviso desde `NoticeBar`: no es un aviso de tono informativo ni acepta cola.

## Decisiones 2026-11-20 (aprobación técnica de Jonathan)

- **Pregunta 1 (cola de avisos):** cola FIFO para todos los tonos. `publish` añade a la cola; sale el siguiente al cerrarse (5 s o botón). Spec: RN-14. Tareas: T-04, T-07. Regresión de los avisos de éxito y error en `published-species-*` (T-08).
- **Pregunta 2 (etiqueta del tono informativo):** «Aviso». Spec: RN-12 (enmendado).
- **Pregunta 3 (clic en la sección ya abierta):** no consulta de nuevo. Spec: RN-13. Test: CA-07 (T-07).
- **Pregunta 4 (fallos y el intervalo de 15 s):** un fallo no cuenta para el intervalo; solo las consultas con éxito actualizan `lastLoadedAt`. Spec: RN-07 (enmendado). Tarea: T-03.
- **Pregunta 5 y 6 (textos de CA-01 y CA-03; puntito tras aceptar o rechazar):** aprobados tal como están; el puntito se actualiza al cambiar de pantalla (RN-10).
- Las propuestas del plan quedan aceptadas (nombres accesibles, puntito `aria-hidden`, componente `PendingReviewNotices`, `usePublishNotice()`, hook sin `setInterval`).

## Preguntas originales (cerradas por las decisiones de arriba)

1. **Cola de avisos:** ¿se aprueba el cambio de `publish` a cola FIFO para todos los tonos (propuesta), o solo para el aviso de pendientes con una cola aparte? La primera cambia cómo se sustituyen los avisos de éxito y error existentes.
2. **Etiqueta del tono informativo:** la spec no fija el texto del encabezado del aviso (hoy «Éxito» y «Error»). Propuesta: «Aviso». ¿Se aprueba?
3. **Clic en la sección ya abierta:** ¿es aceptable no consultar de nuevo? Propuesta: sí (la spec dice «al cambiar de pantalla»).
4. **Fallos y el intervalo de 15 s:** si una consulta falla, ¿la siguiente pantalla debe reintentar aunque haya pasado menos de 15 s? La spec pide reintento en la siguiente pantalla (CA-10) y el intervalo mínimo (RN-07). Propuesta: un fallo no cuenta para el intervalo (solo éxitos actualizan `lastLoadedAt`). Confirmar.

## Orden y aprobación

Dependencias y secuencia:

1. Cliente y tipos (T-01) y ViewModel puro (T-02). Pueden empezar con mocks antes de que `api-024` esté mergeada.
2. Hook con intervalo y errores (T-03).
3. Avisos: tono `info`, cola FIFO, `usePublishNotice` y `PendingReviewNotices` (T-04, T-05).
4. Menú: puntito, nombre accesible y llamada al hook (T-06, T-07).
5. Pruebas de cobertura y nombres (T-08, T-09). Sin paso de accesibilidad automatizado extra: lo cubre CA-09.
6. Documentación, verificación y PR (T-10 a T-12).
7. Integración con `api-024` real (T-13) cuando la ruta esté mergeada. Hasta entonces, el PR no se mergea.

- Revisión técnica: Jonathan, 2026-11-20 (aprobación técnica del plan).
- Aprobador funcional: Jonathan, spec aprobada el 2026-11-20.
- Evidencias: pendientes de la sesión principal (salida de `npm test`/Vitest, `tsc` y lint del dashboard). Esta sesión no tiene shell y no afirma que pasen.

## Divergencias de implementación (2026-11-20)

- Las pruebas del dashboard corren en Vitest con entorno `node` (sin DOM), así que la lógica de consulta (intervalo, fallo silencioso, una consulta en curso, aviso de inicio) vive en `viewmodels/pending-review.ts` como funciones y reducer puros (`refreshPendingCounts`, `pendingReviewReducer`) y el hook `usePendingReviewCounts` solo los conecta con React. Los casos prueban esas funciones y el marcado de `SidebarLink`; los CA-07, CA-08 y CA-13 además revisan el código fuente.
- Se extrajo `components/SidebarLink.tsx` (botón del menú con puntito y nombre accesible) en lugar de editar el `button` en línea de `App.tsx`.
- «Aviso de inicio» = primera consulta con éxito de la sesión: si trae 0 no se anuncia después aunque luego haya pendientes (solo se actualiza el puntito).
- Se añadió el icono `info` a `components/Icon.tsx` para el tono informativo.
- Un fallo conserva el último conteo conocido (no lo borra); sin consulta previa no hay puntito.
- El hook ignora respuestas de otra sesión (memo por cuenta) pero no las de una sección anterior, para no repetir la consulta al cambiar rápido de pantalla; evita consultas simultáneas.
- T-08: solo hizo falta ajustar `dashboard-notifications.test.tsx` (cierre del aviso con la cola FIFO). Los tests de navegación no dependían del `aria-label` antiguo.
- Se añadió `pendingCounts` al mock `createAdminApiMock` (`tests/admin-fixtures.ts`).
