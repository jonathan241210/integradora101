# Plan técnico · 003 · administration-sections

- Spec: `apps/dashboard/specs/003-administration-sections.md`
- Estado de spec: Aprobada (Jonathan, 2026-10-30)
- Responsable técnico: Jonathan (frontend)
- Contrato que consume: `apps/api/specs/007-administration-management.md` y su plan `apps/api/plan/007-administration-management.md`
- Estado del plan: Aprobado

## Diseño de solución

El dashboard deja de usar datos ficticios en seis secciones (Panel, Noticias, Eventos, Reporte, Recintos y Usuarios) y las conecta a `api-007` sin cambiar el aspecto visual (RN-09). Se conservan Venta e Historial de taquilla como demostración.

La arquitectura sigue el patrón ya probado en `dashboard-002` (`auth-session.ts` + `useAuthSession.ts`), explícitamente MVVM:

```
View (props, sin lógica)  ←  Section (contenedor delgado)  ←  hook ViewModel  →  funciones puras + reducer  →  @arca/api-client  →  API
```

- **View** (`src/views/*View.tsx`): solo recibe estado y manejadores por props y pinta con `@arca/ui`. No importa `services/` ni `@arca/api-client`.
- **Section** (`src/sections/*Section.tsx`): contenedor mínimo que llama al hook y entrega el resultado a la View. Existe para que cada sección cargue sus datos **solo cuando se abre** (si `App` llamara los seis hooks, se pedirían todas las listas al entrar) y para poder probar las Views con `renderToStaticMarkup`, que no ejecuta efectos.
- **ViewModel** (`src/viewmodels/<tema>.ts`): tipos de estado, reducer y funciones asíncronas que reciben el cliente de API como parámetro (`loadStaffAccounts(api, dispatch, query)`), igual que `checkSession(authApi, dispatch, …)`. Se prueban con un cliente simulado.
- **Hook** (`src/viewmodels/use<Tema>.ts`): une el reducer con el cliente real de `services/arca-api.ts`.

Los permisos solo cambian qué se muestra (RN-01). Los roles asignables, el alcance de cuentas y las validaciones vienen de la API (RN-02). Totales, periodos y la navegación entre periodos también: la API devuelve `previous_date` y `next_date` y el cliente solo los reenvía como `date`; nunca calcula fechas de negocio (Constitución III, RN-04).

### Decisiones de diseño

- **Sin nueva dependencia ni componente compartido nuevo.** `@arca/ui` ya trae `Button`, `Card`, `Field`, `SelectField`, `TextAreaField`, `Badge`, `Alert` y `Dialog` (basado en `<dialog>` con `showModal()`, que entrega foco atrapado y cierre con Escape de forma nativa, CA-16). La tabla, la barra de paginación y el diálogo de confirmación son componentes locales de `src/components/` con las clases y tokens del `styles.css` actual. Si más adelante otra app los necesita, se promueven a `@arca/ui` con su propia spec.
- **Descargas.** `@arca/api-client` hoy solo ofrece `get`, `post` y `delete` y no maneja binarios. Se agregan `patch`, `put` y `download` (ver más abajo). El archivo lo guarda un helper `services/save-file.ts` (crea un `Blob` URL y un `<a download>`), inyectado en el ViewModel para poder simularlo en pruebas.
- **Errores unificados.** Un helper `viewmodels/api-errors.ts` convierte `ApiError` en `{ message, fieldErrors, unauthorized, forbidden, notFound }`. 401 lo maneja el manejador global ya existente (`setUnauthorizedHandler` → «Tu sesión expiró»), por lo que los hooks nuevos **no** lo duplican (CA-15).
- **Refresco tras escribir.** Cada operación exitosa recarga la lista actual y emite un aviso accesible (`role="status"`) en la propia sección; el aviso global de la shell queda para las demos.
- **Navegación sin router (RN-06).** Se mantiene `DashboardSection` en el reducer de `dashboard-demo.ts`; solo cambia el identificador `ticket-users` por `users` y desaparece el estado ficticio de recintos y usuarios.
- **Aviso de demostración (CA-02).** `DemoBanner` se muestra únicamente cuando la sección activa es `tickets` o `ticket-history`.
- **Exportación (CA-12, RN-10).** Los tres botones están siempre visibles y habilitados; si la API responde 422 «Formato de exportación no disponible.» (Excel/PDF hasta el ADR 0017), se muestra ese mensaje en `role="alert"` y el reporte en pantalla se conserva.
- **Contraseñas (RN-07).** Los campos de contraseña viven en estado local del formulario; el ViewModel recibe el valor, lo envía y no lo guarda en ningún estado ni lo muestra.
- **Qué NO se toca.** El buscador y las notificaciones de la barra superior siguen siendo controles de demostración (fuera del alcance de la spec); se anota como pendiente en Riesgos.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| `packages/api-client` | `http.ts` (agrega `patch`, `put`, `download`), `admin.ts` (nuevo: `createAdminApi`), `admin-types.ts` (nuevo), `index.ts` (exporta), `README.md` | Contrato tipado de `api-007`; sin lógica de negocio |
| Servicios | `src/services/arca-api.ts` (exporta `adminApi`), `src/services/save-file.ts` (nuevo) | Instancia compartida del cliente y descarga de archivos |
| ViewModels | `src/viewmodels/api-errors.ts`, `staff-accounts.ts` + `useStaffAccounts.ts`, `news-management.ts` + `useNewsManagement.ts`, `events-management.ts` + `useEventsManagement.ts`, `enclosures-management.ts` + `useEnclosuresManagement.ts`, `dashboard-summary.ts` + `useDashboardSummary.ts`, `ticket-report.ts` + `useTicketReport.ts` | Estado, reducers, llamadas y errores de cada sección |
| ViewModels existentes | `navigation.ts` (id `users`, etiqueta «Usuarios»), `dashboard-demo.ts` (quita estado/acciones ficticios de recintos y usuarios; renombra sección), `useDashboardDemo.ts` | Alineación con CA-01 |
| Secciones | `src/sections/UsersSection.tsx`, `NewsSection.tsx`, `EventsSection.tsx`, `EnclosuresSection.tsx`, `DashboardSection.tsx`, `TicketReportSection.tsx` | Contenedores que llaman al hook |
| Views | `UsersView.tsx` (reemplaza `TicketUsersView.tsx`), `NewsView.tsx`, `EventsView.tsx`, `EnclosuresView.tsx`, `DashboardView.tsx`, `TicketReportView.tsx` | Presentación con los patrones actuales |
| Componentes | `src/components/DataTable.tsx`, `PaginationBar.tsx`, `ConfirmDialog.tsx`, `FieldErrors.tsx` | Piezas locales reutilizables |
| Shell | `src/App.tsx` (rutea secciones, banner solo en demos, títulos), `src/styles.css` (clases nuevas con tokens) | CA-01, CA-02, CA-16, CA-17 |
| Datos de muestra | `src/data/demo-data.ts` | Se eliminan `demoNews`, `demoEvents`, recintos, usuarios y reporte; quedan los de venta e historial |
| Pruebas | `src/tests/*` (ver mapeo) | Un test por CA |
| Documentación | `apps/dashboard/docs/arquitectura.md`, `apps/dashboard/docs/manual-demo.md`, nota de vigencia en `specs/001-admin-dashboard-prototype.md` | Referencia vigente |

## Contrato y datos

### Cliente (`@arca/api-client`)

- `http.ts`:
  - `patch<T>(path, body)` y `put<T>(path, body)`, con el mismo manejo de XSRF, 419 y 401 que `post`.
  - `download(path): Promise<{ blob: Blob; filename: string }>`: `GET` con `credentials: "include"`; si la respuesta no es 2xx, lanza `ApiError` leyendo el JSON de error (así 422/403/401 se comportan como el resto); el nombre sale de `Content-Disposition` con respaldo seguro.
- `admin.ts` expone `createAdminApi(http)` con:
  - `users`: `list(query)`, `options()`, `create(input)`, `get(id)`, `update(id, input)`, `setStatus(id, isActive)`, `remove(id)`, `resetPassword(id, password)`, `resetTwoFactor(id)`.
  - `news` y `events`: `list()`, `create()`, `update()`, `setStatus()`, `remove()`.
  - `enclosures`: `list()`, `create()`, `rename()`.
  - `dashboard`: `summary()`.
  - `reports`: `tickets(query)` y `exportTickets(query, format)`.
- `admin-types.ts`: DTO en `snake_case` tal como los entrega la API (`StaffAccountDto`, `StaffOptionsDto`, `NewsDto`, `EventDto`, `EnclosureDto`, `DashboardSummaryDto`, `TicketReportDto`, `Paginated<T>`). Los importes llegan como **cadena** con dos decimales y se muestran con `Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" })`; nunca se suman ni se promedian en el cliente.
- Compatibilidad: solo se agregan exports; `createAuthApi`, `createVisitorApi` y `createHttpClient` no cambian su firma, por lo que `apps/pwa` y `apps/mobile` no se ven afectados.

### ViewModels por sección

| Hook | Estados | Operaciones |
|---|---|---|
| `useStaffAccounts` | `loading`/`ready`/`empty`/`error`, filtros, página, diálogo activo, aviso | cargar con filtros, cargar opciones, crear, editar, activar/desactivar, eliminar, restablecer contraseña, restablecer 2FA |
| `useNewsManagement`, `useEventsManagement` | ídem | cargar, crear, editar, activar/desactivar, eliminar |
| `useEnclosuresManagement` | ídem | cargar, crear, renombrar |
| `useDashboardSummary` | `loading`/`ready`/`empty`/`error` | cargar |
| `useTicketReport` | además periodo, página, `exporting` | cargar por periodo, navegar con `previous_date`/`next_date`, rango personalizado, paginar, exportar |

Reglas comunes: 403/404/422 se muestran junto al formulario o como `role="alert"` en la sección; el formulario conserva lo escrito ante un 422 y pinta cada mensaje junto a su campo (CA-04, CA-07, CA-08); el fallo de red muestra el error con «Reintentar».

### Vistas y reglas de interfaz

- **Usuarios** (CA-03 a CA-07): tabla paginada (nombre, correo, área, rol, estado, último acceso) con búsqueda por texto y filtros de rol, área y estado; botón «Crear usuario»; menú de acciones por fila. Alta y edición en `Dialog`; el área elegida preselecciona el rol sugerido que entrega `options`, editable, y solo se listan los roles asignables que devuelve la API. El correo se muestra pero no se edita. Desactivar/activar, eliminar, restablecer contraseña y restablecer 2FA abren `ConfirmDialog` que nombra la cuenta y el efecto; restablecer contraseña pide la nueva contraseña con botón mostrar/ocultar (mismo patrón del login).
- **Noticias y Eventos** (CA-08): lista con estado, formularios con validación 422 por campo, activar/desactivar y eliminar con confirmación; sin campo de imagen.
- **Recintos** (CA-09): lista con nombre y número de animales; crear y renombrar; sin eliminar.
- **Panel** (CA-10): tarjetas «Hoy» y «Últimos 7 días» (boletos, adultos, niños, ingresos) y la serie diaria de la API, con estado vacío cuando todo es cero.
- **Reporte** (CA-11 a CA-13): selector Semanal/Mensual y «Rango personalizado» secundario (fechas desde/hasta que se envían tal cual); botones «Periodo anterior/siguiente» deshabilitados cuando la API devuelve `null`; totales, desglose diario y listado paginado; botones «Exportar CSV/Excel/PDF». El `executive` ve las mismas vistas sin ninguna acción de edición.
- **Accesibilidad y adaptabilidad** (CA-16): foco al `h1` al cambiar de sección (ya existente), `aria-live` en avisos, tablas dentro de un contenedor con desplazamiento propio y diseño apilado bajo ~640 px, controles con etiqueta y foco visible. Estilos con tokens semánticos de `@arca/tokens`; ningún hex nuevo (CA-17).

### Datos, DBR y compatibilidad

- Sin DBR propia ni cambios de esquema. La DBR-005 acompaña a `api-007`.
- Dependencias externas: `api-007` en la API real. Mientras no exista, todo se desarrolla y prueba con el cliente simulado (RN-08).

## Seguridad, offline y operación

- Autenticación por cookie Sanctum con XSRF ya resuelta en `createHttpClient`; las operaciones nuevas la reutilizan. No hay tokens en `localStorage`.
- Datos personales del personal (nombre, correo, área, rol) solo viven en el estado de React de la sección abierta; no se persisten en el navegador.
- Las contraseñas nunca pasan por un reducer ni por `console`; los códigos de error no incluyen el cuerpo enviado.
- Confirmaciones obligatorias para acciones destructivas o sensibles (RN-03).
- `download` valida que la respuesta sea 2xx antes de crear el `Blob`; el nombre de archivo se sanea (sin separadores de ruta).
- Sin modo offline: son pantallas de administración en línea; ante fallo de red se muestra el error con reintento.
- Proxy de Vite sin cambios (`/api` y `/sanctum`); en producción se requiere dominio raíz compartido con la API, como en `dashboard-002`.

## Mapeo de criterios a pruebas

Convención: bloque `describe("CA-NN administration-sections", …)` como en `dashboard-001/002`. Vitest en `apps/dashboard/src/tests/`; las funciones de ViewModel se prueban con un `AdminApi` simulado (`vi.fn`) y las Views con `renderToStaticMarkup`.

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | Navegación por permisos (`users.manage` y `operational-staff.manage` muestran «Usuarios»; ya no existe «Usuarios de taquilla») | `administration-navigation.test.tsx` (nuevo; absorbe `getNavigationForProfile`) |
| CA-02 | `App` no renderiza `DemoBanner` en las seis secciones conectadas y sí en Venta e Historial | `global-demo-banner.test.tsx` (se actualiza) |
| CA-03 | Tabla con columnas, filtros y paginación; estados cargando, vacío y error con `role="alert"` | `staff-accounts.test.tsx` (reemplaza `ticket-users.test.tsx`) |
| CA-04 | Alta: rol sugerido por área, solo roles asignables, errores 422 por campo | `staff-accounts.test.tsx` |
| CA-05 | Edición: campos editables y correo de solo lectura | `staff-accounts.test.tsx` |
| CA-06 | Cada acción sensible abre `ConfirmDialog` con nombre y efecto; la API solo se llama al confirmar; contraseña con mostrar/ocultar accesible | `staff-accounts.test.tsx` |
| CA-07 | 403/404/422 → mensaje sin alterar la lista; éxito → recarga y aviso | `staff-accounts.test.tsx` |
| CA-08 | Noticias y eventos: listas con estado, crear/editar/estado/eliminar con confirmación, 422 por campo, sin campo de imagen | `content-management.test.tsx` (se reescribe) |
| CA-09 | Recintos: lista con conteo, crear/renombrar, sin eliminar, nombre repetido | `enclosures.test.tsx` (se reescribe) |
| CA-10 | Panel con datos de la API, sin cálculos y con estado vacío | `dashboard.test.tsx` (se actualiza) |
| CA-11 | Reporte: selector Semanal/Mensual/Personalizado, anterior/siguiente por `previous_date`/`next_date`, totales, desglose y listado | `ticket-report.test.tsx` (se reescribe) |
| CA-12 | Exportación: descarga con el periodo visible; error 422 de formato no disponible y fallo de red conservan el reporte | `ticket-report.test.tsx` |
| CA-13 | `executive`: Panel y Reporte reales con exportación y sin acciones de edición | `ticket-report.test.tsx`, `administration-navigation.test.tsx` |
| CA-14 | Revisión estática: ningún archivo de `views/`, `components/` ni `sections/` importa `fetch`/`axios`/`services/`/`@arca/api-client` ni calcula totales o permisos | `administration-quality.test.tsx` (nuevo) |
| CA-15 | Un 401 en una sección nueva dispara el manejador global y vuelve al login con «Tu sesión expiró» | `administration-quality.test.tsx` (reutiliza `authSessionReducer`) |
| CA-16 | Marcado de Views: `aria-labelledby` en diálogos, `role="alert"`/`status`, tablas con contenedor desplazable y etiquetas en controles; el comportamiento del teclado de `<dialog>` se verifica manualmente (ver Verificación) | `administration-quality.test.tsx` + revisión manual |
| CA-17 | Revisión estática de `styles.css` y Views nuevas: sin hex de marca | `administration-quality.test.tsx` (patrón de `design-system.test.tsx`) |
| CA-18 | Cobertura: busca `CA-01` a `CA-17 administration-sections` en los tests | `administration-coverage.test.tsx` (nuevo; patrón de `acceptance-coverage.test.tsx`) |

Además se actualizan las pruebas de `dashboard-001` que verifican el comportamiento ficticio ya reemplazado (`enclosures`, `content-management`, `ticket-users`, `ticket-report`, `dashboard`, `acceptance-coverage`): se ajustan o se retiran con una nota en `specs/001-admin-dashboard-prototype.md` que marca los CA sustituidos por `dashboard-003`, en el mismo cambio (paso 7 del flujo SDD).

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | React 19 + TS + Vite 7 + Tailwind 4 vigentes; **cero dependencias nuevas** (ni en `package.json` ni en `@arca/ui`). El cliente solo agrega métodos a `@arca/api-client`. |
| II. La spec manda | Sí | Spec `003` Aprobada; este plan, las tasks y el PR enlazan los tres artefactos; cada sección remite a sus CA/RN. |
| III. Lógica separada de la interfaz | Sí | Totales, periodos, alcance, roles asignables y validaciones vienen de la API; el cliente solo reenvía `previous_date`/`next_date`. Views sin imports de API (verificado por CA-14); llamadas solo desde hooks sobre `@arca/api-client`. |
| IV. Un test por criterio | Sí | Tabla anterior CA-01 a CA-18; `administration-coverage.test.tsx` lo verifica. CA-16 combina prueba de marcado y revisión manual documentada, porque el entorno de Vitest es `node` sin navegador. |
| V. Una sola fuente de verdad para los datos | Sí | Sin persistencia local: todo viene de la API; se eliminan los datos ficticios de las seis secciones. No toca esquema. |
| VI. Código en inglés, personas en español | Sí | Archivos, hooks, tipos y claves de DTO en inglés; etiquetas, avisos y errores en español. El id de sección pasa de `ticket-users` a `users`. |

## Riesgos y decisiones

- **ADR requerido:** ninguno para esta app. La exportación a Excel/PDF queda sujeta al ADR 0017 de la API; la interfaz ya está lista y recibe el error mientras no se habilite.
- **Dependencia fuerte de `api-007`.** La interfaz no se puede validar de punta a punta hasta que existan los endpoints. Mitigación: desarrollar contra el cliente simulado y hacer una pasada manual contra `arca_pruebas` cuando la API lo permita. Un cambio de contrato en la API obliga a actualizar `admin-types.ts` y este plan en el mismo cambio.
- **`previous_date`/`next_date` no están en la spec de la API.** Se agregan como detalle de contrato en `apps/api/plan/007` para que el cliente no calcule periodos (Constitución III); no cambia ningún CA.
- **Alcance amplio entregado junto (RN-10).** Se ordena internamente por sección y se integra al final; si una sección se atrasa, el plan permite desactivar su entrada de navegación sin afectar las demás.
- **Controles de demostración que permanecen:** buscador y campana de la barra superior. Fuera de alcance de esta spec; conviene una spec pequeña posterior.
- **Pruebas de teclado y ancho.** No hay automatización de navegador en el repo; CA-16 se completa con una revisión manual documentada en el PR (tabla, diálogos y los anchos 360, 768 y 1366 px).
- **Alternativas descartadas:** (1) llamar todos los hooks desde `App.tsx`: carga datos que nadie abrió; (2) generar Excel/PDF en el navegador: viola Constitución III; (3) promover tabla y diálogo de confirmación a `@arca/ui` ya: ampliaría el alcance a otro paquete sin segunda app que lo use; (4) instalar una librería de tablas: requeriría ADR sin necesidad.

## Orden y aprobación

**Secuencia de implementación:**

1. `@arca/api-client`: `patch`, `put`, `download`, `admin.ts`, `admin-types.ts` y sus pruebas con `fetch` simulado.
2. Base común: `api-errors.ts`, `save-file.ts`, componentes `DataTable`, `PaginationBar`, `ConfirmDialog`, `FieldErrors` y clases en `styles.css`.
3. Shell: `navigation.ts`, `dashboard-demo.ts`, `App.tsx` y banner solo en demos (CA-01, CA-02).
4. Usuarios (CA-03 a CA-07).
5. Recintos (CA-09), luego Panel y Reporte con exportación (CA-10 a CA-13).
6. Noticias y Eventos (CA-08).
7. Limpieza de datos ficticios y de pruebas de `dashboard-001` sustituidas; pruebas de calidad (CA-14 a CA-17) y cobertura (CA-18).
8. Documentación local y nota de vigencia en la spec 001.

**Dependencias:** `api-007` (contrato y endpoints), `dashboard-002` (sesión y manejo de 401), `@arca/ui` y `@arca/tokens` sin cambios, ADR 0002.

**Aprobaciones requeridas:**

| Rol | Aprueba | Estado |
|---|---|---|
| Responsable funcional | Spec (ya aprobada) | Jonathan, 2026-10-30 |
| Equipo | Solución técnica y Constitution Check de este plan | Pendiente |

**Verificación antes de cerrar:** `npm run types`, `npm test` y `npm run build` en `apps/dashboard`; pruebas de `packages/api-client` si existe runner (si no, se prueban desde `apps/dashboard`); `/verify`; revisión manual con teclado y a 360, 768 y 1366 px; y recorrido de punta a punta contra la API real en `arca_pruebas` con cuentas demo `presidencia@arca.local`, `direccion_zoo@arca.local` y `ejecutivo@arca.local`.

Evidencias: `apps/dashboard/specs/002-real-staff-login.md`, `apps/dashboard/plan/002-real-staff-login.md`, `docs/03-roles-y-permisos.md`, `apps/dashboard/AGENTS.md`.

