# Plan técnico · 017 · fixed-roles-account-management

- Spec: `apps/dashboard/specs/017-fixed-roles-account-management.md`
- Estado de spec: Implementada
- Solicitada: 2026-11-20
- Aprobada: 2026-11-20
- Estado del plan: **Aprobado** (aprobación técnica registrada).
- Responsable técnico (frontend): por identificar en la aprobación técnica.
- Plan de la API del que depende: `apps/api/plan/023-fixed-roles-and-console-admins.md` (contrato de `users/options`, `managed_by_console`, avisos de consola).
- DBR relacionada: ninguna (la interfaz no toca esquema).
- ADR relacionados: ADR 0002 (SPA sin React Router; navegación por estado). Sin dependencias nuevas. No se requiere ADR nuevo.
- Orden de implementación en el dashboard: 015 → 019 → 016 → **017** → 018.

## Diseño de solución

La interfaz solo presenta. Toda decisión sobre roles, permisos, cuentas `admin` o avisos llega de la API; el cliente no reimplementa reglas (RN-02 de `dashboard-003`).

Componentes:

1. **Contrato (`packages/api-client`).** Se añaden tipos y métodos; no hay lógica:
   - `StaffRoleOption` (cuenta: `name`, `label`) se mantiene. Para `users/options` aparece `StaffAssignableRole` con `two_factor_required: boolean` y `permissions: { name: string; label: string }[]`.
   - `StaffAccountDto` añade `managed_by_console: boolean`.
   - `ConsoleNoticeDto` (`id`, `action`, `account_email`, `origin`, `reason`, `created_at`).
   - `admin.consoleNotices.list()` → `GET /api/v1/admin/console-notices`; `admin.consoleNotices.read(id)` → `POST /api/v1/admin/console-notices/{id}/read`.
2. **Presentación de permisos y roles (ViewModel puro).** `navigation.ts` exporta `sectionsForPermissions(permissions: string[]): string[]`, que reutiliza el mapa permiso → sección existente (`navigationCandidates`). Sirve para la vista de solo lectura del rol (CA-02). No cambia el mapa ni decide accesos.
3. **Cuentas (`staff-accounts.ts`, `useStaffAccounts.ts`).**
   - `suggestRole` y `staffDepartmentChanges` siguen igual: las opciones ya son asignables.
   - Nuevas funciones puras: `isConsoleManaged(account)` (usa `managed_by_console`), `roleSummary(role, roles)` (secciones y nota de 2FA para el rol elegido).
   - `pendingActionForFocus` devuelve `null` para cuentas gestionadas desde consola (CA-04, y el foco del buscador global no abre acciones sobre `admin`).
   - Los errores 403 de la API se muestran con `describeApiError` en el formulario o en el diálogo (CA-06); la lista no cambia.
4. **Vistas (`views/UsersView.tsx`, `sections/UsersSection.tsx`).**
   - Filas de cuentas `admin`: etiqueta «Gestionada desde la consola del servidor», sin botones de acción.
   - Selector de rol del alta y de la edición: opciones de `options.roles` (sin «Administrador de Presidencia»), bloque de solo lectura con las secciones que abre el rol y, si `two_factor_required`, el texto de 2FA sin bloquear el envío (CA-03).
   - Filtro «Todos los roles»: ofrece los roles asignables (decisión de presentación; las cuentas `admin` aparecen en «Todos los roles» y en la lista sin filtro).
   - Diálogos de acción (`dashboard-015` para la confirmación de contraseña) se conservan para cuentas no admin; no se toca su lógica (CA-05).
5. **Avisos de consola.**
   - `viewmodels/console-notices.ts` (reducer puro: `loading`, `ready`, `error`; `dismiss`, `retry`).
   - `viewmodels/useConsoleNotices.ts` (hook): solo se activa si la sesión tiene `users.manage` (CA-12); carga al entrar; cerrar un aviso llama a `consoleNotices.read(id)` y lo quita de la lista tras la respuesta (CA-11, RN-05: nunca se marca solo al mostrarse).
   - `components/ConsoleNoticesBanner.tsx` (View): `role="status"` para tono informativo, `role="alert"` si hay error; lista de todos los avisos en un contenedor con desplazamiento propio y `tabIndex=0`; texto exacto de CA-10; botón «Cerrar aviso» por cada aviso. Error de carga: mensaje en español y botón «Reintentar»; no bloquea la navegación (CA-13).
   - Montaje en `App.tsx`: solo en la sección `dashboard` (Panel principal), por encima del contenido, según CA-10.
6. **Etiquetas (`App.tsx`).** El perfil `executive` muestra «Consulta directiva» en la cabecera (CA-09) en lugar de «Panel ejecutivo» (líneas 287-288). Navegación de `communications`: sin cambio de código; la primera sección disponible es Noticias (`App.tsx` ya usa `navigation[0]` cuando la sección activa no está disponible), y una prueba lo fija (CA-07, CA-08).

Principios aplicados: componentes sin `fetch` ni `axios` (CA-15); permisos solo en `navigation.ts` para presentación; tokens semánticos y sin hex de marca (CA-17); accesibilidad (CA-14).

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Paquete `api-client` | `packages/api-client/admin-types.ts` (`StaffAssignableRole`, `StaffAccountDto.managed_by_console`, `ConsoleNoticeDto`); `packages/api-client/admin.ts` (`users.options` tipado, `consoleNotices.list`, `consoleNotices.read`); `packages/api-client/index.ts` (exportaciones) | Contrato tipado (CA-15, CA-18) |
| Dashboard / navegación | `src/viewmodels/navigation.ts` (`sectionsForPermissions`); `src/App.tsx` (etiqueta `executive` en líneas 287-288; montaje del banner) | Presentación de roles y etiquetas (CA-02, CA-07, CA-08, CA-09) |
| Dashboard / cuentas | `src/viewmodels/staff-accounts.ts` (`isConsoleManaged`, `roleSummary`, `pendingActionForFocus` con cuentas admin excluidas); `src/viewmodels/useStaffAccounts.ts` | Reglas de presentación de cuentas (CA-01 a CA-06) |
| Dashboard / vistas de cuentas | `src/views/UsersView.tsx`; `src/sections/UsersSection.tsx` | Filas admin sin acciones, selector y bloque de solo lectura, nota de 2FA, errores 403 (CA-01 a CA-06) |
| Dashboard / avisos | `src/viewmodels/console-notices.ts`, `src/viewmodels/useConsoleNotices.ts` (nuevos); `src/components/ConsoleNoticesBanner.tsx` (nuevo) | Avisos al iniciar sesión (CA-10 a CA-13) |
| Dashboard / pruebas | `src/tests/fixed-roles-account-management.test.tsx` (nuevo); `src/tests/console-notices.test.tsx` (nuevo); `src/tests/api-client-admin.test.tsx` (ampliado); `src/tests/administration-navigation.test.tsx` (quitar `operational-staff.manage` de las líneas 52 y 62; añadir `communications`; «Consulta directiva» en la prueba de `executive`); `src/tests/staff-accounts.test.tsx` (líneas 173-186: opciones sin «Administrador»; sin «Ejecutivo» ni `zoo-admin`); `src/tests/admin-fixtures.ts` (roles fijos y `communications`); `src/tests/design-system.test.tsx` (CA-17) | Un test por CA-xx (CA-18) |
| Dashboard / estilo | `src/styles` (clases de aviso y de bloque de solo lectura con tokens semánticos existentes) | Sin hex de marca (CA-17) |
| Documentación | `apps/dashboard/docs/manual-demo.md` (solo si menciona «Panel ejecutivo», «Ejecutivo» o cuentas de administrador en la sección Usuarios; T-12) | Referencia local vigente |

## Contrato consumido

- `GET /api/v1/admin/users/options` → `{ "data": { "departments": [...], "roles": [ { "name", "label", "two_factor_required", "permissions": [ { "name", "label" } ] } ] } }`. No incluye `admin`.
- `GET /api/v1/admin/users` y `GET /api/v1/admin/users/{user}` → cuenta con `managed_by_console` (boolean). `role.label` viene de la API («Consulta directiva», «Comunicación»).
- 403 de la API sobre cuenta admin o rol `admin` (mensajes de `api-023` CA-11 y CA-12) → mensaje mostrado tal cual en el formulario o diálogo.
- `GET /api/v1/admin/console-notices` → `{ "data": [ { "id", "action", "account_email", "origin", "reason", "created_at" } ] }`, solo no leídos.
- `POST /api/v1/admin/console-notices/{id}/read` → 204 (propuesta de `api-023`); 404 si el aviso es ajeno.
- 401 en cualquiera de estas llamadas → el estado de sesión lleva al login con «Tu sesión expiró» (`dashboard-002` CA-08; CA-16).
- Campo de sesión `permissions` (`StaffProfile`) para decidir si se consultan los avisos; sin cambio de tipo.

Mientras la API no esté fusionada, el cliente se prueba con el cliente simulado (`admin-fixtures.ts`), igual que el resto de pruebas del dashboard.

## Seguridad, offline y operación

- **Autorización solo en la API.** Ocultar acciones no protege nada: la regla real está en `api-023` CA-11 y CA-12 (RN-01 de la spec).
- **Datos personales:** correo, nombre, área y rol en pantalla; el correo de la cuenta afectada en los avisos. Se muestran solo a quien tiene `users.manage` y no se guardan fuera de la memoria de la sesión (sin `localStorage`).
- **Contraseñas:** la contraseña capturada para restablecer o crear no se guarda en el estado tras enviarla (RN-08; `staff-accounts.ts` ya la pasa solo como argumento).
- **Sin offline:** la sección es solo en línea; el estado de error ofrece reintento.
- **Accesibilidad (CA-14):** foco visible; diálogos con foco atrapado y cierre con Escape (reutilizando el diálogo existente); tablas con desplazamiento propio; banner con `role` según tono; ancho de 360 a 1366 px sin desbordamiento horizontal de la página. Esta comprobación de anchos no la hace Vitest: se registra como evidencia manual en T-09.
- **Sin dependencias nuevas.** No se añade librería de notificaciones.

## Mapeo de criterios a pruebas

Pruebas Vitest con cliente simulado de `@arca/api-client` (sin llamadas reales). Docblock `/** CA-xx dashboard-017 */` y nombre que cita el CA.

| Criterio | Prueba automatizada | App/ubicación | Tareas |
|---|---|---|---|
| CA-01 | `CA-01: el selector de rol solo muestra los roles de users/options y nunca admin` | `src/tests/fixed-roles-account-management.test.tsx` | T-03 |
| CA-02 | `CA-02: el rol elegido muestra las secciones que abre según sus permisos` | idem | T-02, T-03 |
| CA-03 | `CA-03: un rol con two_factor_required muestra el aviso de 2FA sin bloquear el envío` | idem | T-03 |
| CA-04 | `CA-04: una cuenta admin aparece como gestionada desde consola, sin acciones ni foco de acción` | idem | T-04 |
| CA-05 | `CA-05: las cuentas no admin conservan las acciones y la confirmación de dashboard-003 y dashboard-015` | idem (regresión con `staff-accounts.test.tsx`) | T-04 |
| CA-06 | `CA-06: un 403 de la API sobre cuenta admin se muestra en el formulario sin cerrar la lista` | idem | T-05 |
| CA-07 | `CA-07: communications ve Noticias, Eventos, Momentos y TulanPedia y su primera sección es Noticias` | `src/tests/administration-navigation.test.tsx` (ampliado) | T-02 |
| CA-08 | `CA-08: communications no ve Usuarios, Panel ni Reporte` | idem | T-02 |
| CA-09 | `CA-09: executive se muestra como «Consulta directiva» y no aparece «Ejecutivo» ni «Panel ejecutivo»` | `src/tests/fixed-roles-account-management.test.tsx` | T-02 |
| CA-10 | `CA-10: el aviso de consola lista todos los no leídos con el texto de la spec` | `src/tests/console-notices.test.tsx` | T-06, T-07 |
| CA-11 | `CA-11: cerrar un aviso llama a read y no vuelve a mostrarse` | idem | T-06 |
| CA-12 | `CA-12: sin users.manage no se consultan avisos` | idem | T-06 |
| CA-13 | `CA-13: un fallo al consultar avisos muestra error con reintento y no bloquea el panel` | idem | T-08 |
| CA-14 | `CA-14: vistas nuevas con foco visible, tabla con desplazamiento propio y banner accesible` (markup) + evidencia manual 360–1366 px | idem; evidencia en la tarea T-09 | T-09 |
| CA-15 | `CA-15: ningún componente de views/ o components/ usa fetch ni axios` (análisis estático) | `src/tests/fixed-roles-account-management.test.tsx` | T-10 |
| CA-16 | `CA-16: un 401 en avisos o cuentas lleva al login con «Tu sesión expiró»` | `src/tests/console-notices.test.tsx` y `real-staff-login.test.tsx` (regresión) | T-08 |
| CA-17 | `CA-17: las vistas nuevas no fijan hex de marca` | `src/tests/design-system.test.tsx` (ampliado) | T-09 |
| CA-18 | Verificación de cobertura: cada `CA-01` a `CA-17` aparece en al menos un nombre de prueba | revisión de PR y T-11 | T-11 |

Pruebas existentes que cambian: `administration-navigation.test.tsx` (líneas 52, 62, 91-136), `staff-accounts.test.tsx` (173-186), `admin-fixtures.ts` (roles y etiquetas), `real-staff-login.test.tsx` (perfil `executive` sigue válido; añadir «Consulta directiva»).

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Sin dependencias nuevas; React 19, TS, Vite y `@arca/ui` existentes. Sin servicios de nube. |
| II. La spec manda | Sí | Spec 017 Aprobada; plan y tasks con el mismo `017-fixed-roles-account-management`. Tareas sin marcar. |
| III. Lógica separada de la interfaz | Sí | Permisos y roles solo en la API; `navigation.ts` y los viewmodels solo presentan; las llamadas pasan por `@arca/api-client` desde hooks (CA-15, verificado por T-10). |
| IV. Un test por criterio | Sí | Mapeo completo CA-01 a CA-17 con nombres que los citan. CI en verde: **pendiente de evidencia de la sesión principal**. |
| V. Una sola fuente de verdad para los datos | Sí | El cliente no guarda avisos ni cuentas fuera de la sesión; el estado de «leído» lo guarda la API (`api-023`). |
| VI. Código en inglés, personas en español | Sí | Identificadores en inglés; textos de UI y de avisos en español; «Consulta directiva» y «Comunicación» vienen de la API. |

## Riesgos y decisiones

- **Bloqueo de dependencia:** si `api-023` no entrega `managed_by_console` ni `two_factor_required`, CA-03 y CA-04 no se pueden cumplir. Mitigación: T-01 y T-02 usan el tipo nuevo solo tras la fusión de la API; mientras tanto, los datos de prueba lo declaran.
- **Consumo de `users/options` sin `admin`:** la interfaz cambia en el mismo cambio que la API (cliente y servidor juntos). Si la API se despliega sin el dashboard, el selector sigue funcionando porque lee la lista de la API.
- **Filtro «Todos los roles»:** no incluye `admin` como opción; las cuentas admin siguen en la lista sin filtro. Decisión de presentación, no de seguridad. Aceptado en la aprobación técnica.
- **Solapamiento con `dashboard-015` (diálogo de contraseña)** y con `dashboard-016`/`dashboard-018` (menú y pendientes): se coordinan en `App.tsx` y `navigation.ts`. El banner se monta sin tocar la cabecera ni el menú.
- **Búsqueda global:** el foco del buscador a una cuenta `admin` abre el listado sin acciones (CA-04). Decisión Q5: las cuentas admin aparecen en la búsqueda sin acciones; esta regla aplica.
- **Accesibilidad:** la verificación de anchos 360–1366 px es manual; no hay Playwright en el repositorio. Se registra como evidencia de la sesión principal.
- **Alternativas descartadas:** acciones deshabilitadas para cuentas admin; mostrar la lista completa de permisos en lugar de las secciones; resumir varios avisos en uno.

## Decisiones (aprobación técnica)

- **Q5 (búsqueda global de `api-023`):** las cuentas `admin` aparecen en los resultados sin acciones, con la etiqueta de gestión desde consola. Spec: CA-04 enmendado. Tarea: T-04.
- **Filtro «Todos los roles»:** aceptado (opciones asignables, sin `admin`; las cuentas admin siguen en la lista sin filtro).
- **Q4 y Q6 de `api-023`:** sin efecto en la interfaz. Q4 afecta solo al comando `arca:create-staff`; Q6 afecta al orden de 403 en la API.
- Propuestas del plan aceptadas (secciones que abre el rol, nota de 2FA sin bloquear el envío, banner de avisos con cierre manual, reintento de avisos en error).

## Orden y aprobación

1. Aprobado (Q1 a Q7 de `api-023` cerradas).
2. T-01 (contrato del cliente) tras la fusión del contrato de la API o con datos simulados.
3. T-02 (navegación y etiquetas), T-03 (selector y secciones), T-04 y T-05 (cuentas), T-06 a T-08 (avisos).
4. T-09 a T-10 (accesibilidad, estilo y análisis estático), T-11 (cobertura), T-12 (documentación).
5. T-13 (verificación del dashboard y del paquete) y T-14 (PR).

Dependencias entre cambios del dashboard: `dashboard-015` (diálogo de contraseña, usado en las acciones de cuentas no admin), `dashboard-019` (formato de fechas de los avisos), `dashboard-016` y `dashboard-018` (navegación y pendientes en `App.tsx`).

Aprobación:
- Revisión técnica: aprobada (aprobación técnica del plan).
- Aprobador funcional: responsable funcional (spec aprobada).
- Evidencias: pendientes de la sesión principal (salida de `vitest`, `tsc`, lint y build del dashboard y del paquete; evidencia manual de anchos). Esta redacción no ejecutó nada y no afirma que pasen.

## Divergencias de implementación

- `sectionsForPermissions` devuelve las **etiquetas** de las secciones (presentación), no sus ids.
- La nota de 2FA (CA-03) solo se muestra en el alta; el bloque de secciones del rol (CA-02) se muestra en alta y edición.
- Los avisos se consultan desde `App.tsx` (`useConsoleNotices(profile.id, permissions)`) al autenticarse y el banner se monta solo en el Panel principal. Un 404 al marcar como leído se trata como aviso ya retirado; otros errores mantienen el aviso y muestran el mensaje de la API.
- El texto `{acción}` del aviso se muestra tal cual lo entrega la API (RN-03): se espera que `action` llegue ya en español.
- El cierre del aviso usa un botón «Cerrar aviso: {correo}» por fila. El banner usa `Alert` de `@arca/ui` con `role="status"` (lista) o `role="alert"` (error).
- Las pruebas son de ViewModel y `renderToStaticMarkup` (el repositorio no tiene DOM de pruebas), igual que el resto del dashboard.

## Revisión: avisos de consola como emergentes (CA-19 a CA-26)

- `viewmodels/console-notices.ts`: el estado pasa a `{status, announcement, error}`; funciones puras `planConsoleNotices(notices, now)` (7 días por `created_at`, 3 más recientes y resumen), `consoleNoticesSummaryText` y `markConsoleNoticesRead` (una llamada por aviso, `Promise.allSettled`, sin reintentos). Sin acciones de cierre ni reintento.
- `viewmodels/useConsoleNotices.ts`: consulta solo con `users.manage`, una vez por inicio de sesión (`[enabled, accountId]`, sin depender de la sección); expone `actions.markRead`.
- `components/ConsoleNoticesPublisher.tsx` (nuevo, sustituye a `ConsoleNoticesBanner.tsx`, eliminado junto con el CSS `.console-notices*`): publica con `usePublishNotice()` (tono `info`; `error` si falla la consulta) y llama a `markRead` una vez por `nonce`. Se monta en `App.tsx` dentro de `DashboardNotifications`, junto a `PendingReviewNotices`, por lo que comparten la cola FIFO.
- El cierre automático (5 s) y manual lo da `NotificationAlert`, sin cambios.

| CA | Prueba (`src/tests/console-notices.test.tsx`) |
|---|---|
| CA-19 | `CA-19: cada aviso sale una vez como emergente informativo ... y se marca leído` |
| CA-20 | `CA-20: solo se muestran los avisos de los últimos 7 días ...` |
| CA-21 | `CA-21: con más de 3 avisos se muestran los 3 más recientes y un resumen` |
| CA-22 | `CA-22: un fallo al marcar como leído no reintenta en bucle` |
| CA-23 | `CA-23: el Panel principal ya no muestra el banner ...` |
| CA-24 | `CA-24: los avisos de consola entran en la cola FIFO ...` |
| CA-25 | `CA-25: un fallo al consultar los avisos se publica como aviso de error ...` |
| CA-26 | revisión de PR (cada CA-19 a CA-25 nombrado) |

Pruebas ajustadas sin relajarlas: `feedback-inventory` (M-18, M-19), `feedback-migration` (CA-28 de `dashboard-020`), `feedback-policy`, `design-system` (CA-17), `fixed-roles-account-management` (CA-14, CA-15).
