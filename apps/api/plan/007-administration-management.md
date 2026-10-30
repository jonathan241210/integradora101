# Plan técnico · 007 · administration-management

- Spec: `apps/api/specs/007-administration-management.md`
- Estado de spec: Aprobada (Jonathan, 2026-10-30)
- Responsable técnico: Jonathan (backend) / Víctor Adrián (BD)
- Consumidores: dashboard (`dashboard-003`), mediante `@arca/api-client`
- Estado del plan: Aprobado

## Diseño de solución

Se agrega un grupo de rutas privadas `/api/v1/admin/*` con tres capas de acceso, todas aplicadas en el servidor:

1. `auth:sanctum` + `staff.user` (sesión de personal, ya existentes desde `api-003`).
2. `administrator.two-factor` (ya existente): un `admin` o `zoo-admin` sin 2FA confirmado recibe 403 `two_factor_setup_required` (CA-25).
3. Permiso Spatie por grupo de rutas (`permission:` middleware) más una **Policy por registro** para el alcance sobre cuentas (RN-01, RN-07).

El flujo en cada endpoint es el mismo que en `api-003`/`api-006`: **Form Request → Action → API Resource**, con controladores delgados. Toda la lógica (alcance, reglas del último `admin`, invalidación de sesiones, cálculo de totales y periodos) vive en Actions (Constitución III). La auditoría se escribe con Activitylog desde la Action, nunca desde el controlador.

Hay cinco bloques independientes entre sí, que comparten únicamente el grupo de rutas y la auditoría:

| Bloque | Permiso de ruta | Alcance adicional |
|---|---|---|
| Usuarios | `users.manage` o `operational-staff.manage` | `UserPolicy` + consulta acotada por roles gestionables |
| Noticias | `news.manage` | — |
| Eventos | `events.manage` | — |
| Recintos | `enclosures.manage` | — |
| Panel y Reporte (lectura y exportación) | `dashboard.view` / `reports.view` | — |

### Decisiones de diseño

- **Alcance de cuentas (CA-02, CA-04).** Una Action `ResolveManageableRolesAction` devuelve los roles que el actor puede gestionar: con `users.manage` los cinco roles; con `operational-staff.manage` solo `cashier` y `veterinarian`. Las consultas de lista, detalle y cualquier operación se filtran por usuarios que **tengan uno de esos roles**; fuera de alcance responde 404 «Usuario no encontrado.» (el `zoo-admin` no debe poder inferir que la cuenta existe). La asignación de un rol no gestionable se rechaza con 403 «No tienes permiso para asignar ese rol.» mediante `UserPolicy::assignRole`.
- **Cuenta fuera de alcance vs. inexistente.** Se resuelven con la misma respuesta 404; el parámetro de ruta se recibe como texto y se valida con `ctype_digit` como en `EventController` (404 sin consultar la base).
- **Sesiones (RN-04).** El driver de sesión es `database` y `sessions.user_id` está indexada. `RevokeStaffSessionsAction` borra las filas de `sessions` de la cuenta y rota `remember_token`. No depende de nada específico de Aiven: es SQL estándar de MySQL 8.0.
- **Último `admin` (RN-03, CA-09).** `GuardAdministratorContinuityAction` cuenta cuentas con rol `admin`, `is_active = 1` y `deleted_at IS NULL` **dentro de la transacción y con `lockForUpdate()`**, para que dos peticiones simultáneas no dejen al sistema sin `admin`. Se invoca en desactivar, eliminar y cambio de rol. Autodesactivación y autoeliminación se rechazan antes, con 422.
- **Restablecer 2FA (CA-11).** Se reutiliza `Laravel\Fortify\Actions\DisableTwoFactorAuthentication` (borra secreto, códigos y confirmación); el resto es revocar sesiones. No se agrega código criptográfico propio.
- **Contraseña (CA-05, CA-10).** Se valida con `Password::defaults()` y se guarda con el cast `hashed` de `User`. Nunca se devuelve ni se registra; el log de actividad no recibe `password` en sus propiedades.
- **Correo único (RN-05).** `unique:users,email` sin ignorar eliminadas, como ya hace `CreateStaffAccountAction`. El correo no se edita (el Form Request de actualización no lo acepta; si llega se ignora).
- **Reporte y panel (RN-08, RN-13).** Una sola Action, `SummarizeTicketSalesAction`, calcula totales y serie diaria; `BuildTicketReportAction`, `BuildDashboardSummaryAction` y la exportación la reutilizan. Así pantalla y archivo coinciden por construcción.
- **Zona horaria.** La app corre en `UTC` (`config/app.php`). `ResolveReportPeriodAction` construye los límites del periodo en `America/Mexico_City` (semana de lunes a domingo, mes calendario, rango personalizado) y los convierte a UTC para consultar `tickets.purchased_at`. Los totales por día se agrupan **en PHP** con `CarbonImmutable` sobre filas leídas por cursor, en vez de `CONVERT_TZ` (requiere tablas de zonas horarias cargadas y no es portable entre Aiven y local). Supuesto a confirmar con Víctor: `purchased_at` se guarda en UTC (ver Riesgos).
- **Dinero.** Los importes salen como **cadena con dos decimales** (`"1234.50"`), nunca como float, para no perder precisión entre PHP y JSON.
- **Exportación (CA-22, CA-23, RN-12).** `GET /api/v1/admin/reports/tickets/export?format=csv|xlsx|pdf`. Solo `csv` está implementado: se escribe en streaming con `fputcsv` (UTF-8 con BOM, separador coma), sin dependencias. `xlsx` y `pdf` están en la lista permitida del Form Request pero responden 422 «Formato de exportación no disponible.» mientras `config('arca.report_export_formats')` solo contenga `csv`. Habilitarlos más adelante será agregar un exportador y su valor en esa lista, sin tocar contrato ni clientes. La dependencia requiere el ADR 0017 (propuesto en este mismo cambio).
- **Datos que el reporte NO expone.** El listado de boletos incluye folio, fecha y hora local, adultos, niños e importe. **Excluye `qr_code`** (token de validación de torniquete) y no incluye la identidad del cajero (mínimo privilegio; se puede agregar con otra spec).
- **Listado del reporte.** El JSON pagina el listado de boletos (50 por página, `meta` estándar de Laravel); totales y desglose diario se calculan sobre **todo** el periodo, no sobre la página. La exportación recorre todo el periodo con `cursor()` y no carga el conjunto en memoria.
- **Borrado lógico de noticias y eventos (CA-15, RN-09).** Depende de DBR-005. Cuando `deleted_at` exista, `Event` y el nuevo modelo `News` usan `SoftDeletes`; el trait excluye automáticamente los eventos eliminados de `ListEventsAction` y `GetEventAction` (catálogo público de `api-006`) sin cambiar esas Actions. **El trait solo se agrega a `Event` cuando DBR-005 está aplicada en `arca_pruebas`**, o `GET /events` fallaría por columna inexistente.
- **Modelos sin timestamps.** `news`, `events` y `enclosures` no tienen `created_at`/`updated_at`; se mantienen así (`$timestamps = false`, como `Event` y `Enclosure` hoy). La trazabilidad de cambios la da Activitylog, no columnas nuevas.
- **`BaseModel`.** `AGENTS.md` y la Constitución V lo mencionan, pero **no existe en el repositorio** y ningún modelo actual lo extiende (`User`, `Event`, `Enclosure` extienden `Authenticatable`/`Model`). Esta feature mantiene el patrón vigente y deja la brecha registrada en el Constitution Check para que el equipo la resuelva aparte (ver Riesgos).

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Arranque | `bootstrap/app.php` | Alias `permission` (`Spatie\Permission\Middleware\PermissionMiddleware`); render JSON en español de `Spatie\Permission\Exceptions\UnauthorizedException` (403) |
| Rutas | `routes/api.php` | Grupo `Route::prefix('admin')->name('admin.')` con los cinco bloques |
| Configuración | `config/arca.php` | `report_export_formats` (`['csv']`), `report_timezone` (`America/Mexico_City`), `report_max_days` (366), `report_page_size` (50) |
| Idioma | `lang/es/validation.php` | Mensajes y atributos de validación en español (hoy solo existen `auth.php` y `visitor.php`) |
| Modelos | `app/Models/News.php` (nuevo), `Ticket.php` (nuevo, solo lectura), `Event.php` y `User.php` (ajustes), `Enclosure.php` (sin cambios) | Acceso a `news`/`tickets` y `SoftDeletes` en `Event` tras DBR-005 |
| Policies | `app/Policies/UserPolicy.php` | `view`, `update`, `delete`, `assignRole` con alcance por rol |
| Actions de cuentas | `app/Actions/Admin/Users/`: `ListStaffAccountsAction`, `FindManageableStaffAccountAction`, `ListStaffOptionsAction`, `CreateManagedStaffAccountAction` (envuelve a `CreateStaffAccountAction`), `UpdateStaffAccountAction`, `SetStaffAccountStatusAction`, `DeleteStaffAccountAction`, `ResetStaffPasswordAction`, `ResetStaffTwoFactorAction`, `RevokeStaffSessionsAction`, `ResolveManageableRolesAction`, `GuardAdministratorContinuityAction` | Lógica de cuentas |
| Actions de contenido | `app/Actions/Admin/Content/`: `ListNewsAction`, `SaveNewsAction`, `SetNewsStatusAction`, `DeleteNewsAction` y sus equivalentes `…Event…`; `app/Actions/Admin/Enclosures/`: `ListEnclosuresAction`, `SaveEnclosureAction` | Noticias, eventos y recintos |
| Actions de métricas | `app/Actions/Admin/Reports/`: `ResolveReportPeriodAction`, `SummarizeTicketSalesAction`, `BuildDashboardSummaryAction`, `BuildTicketReportAction`, `ExportTicketReportAction`, `TicketReportCsvWriter` | Panel, reporte y exportación |
| Auditoría | `app/Actions/Admin/LogAdminActivityAction.php` | Un único punto que escribe en `activity('admin')` (actor, evento, recurso, propiedades sin secretos) |
| HTTP | `app/Http/Controllers/Admin/`: `StaffAccountController`, `StaffAccountStatusController`, `StaffAccountPasswordController`, `StaffAccountTwoFactorController`, `NewsController`, `EventController`, `EnclosureController`, `DashboardController`, `TicketReportController`, `TicketReportExportController` | Controladores delgados |
| Form Requests | `app/Http/Requests/Admin/…` (uno por operación) con una base que devuelve 422 `{message, errors}` como `VisitorFormRequest` | Validación en español |
| Resources | `app/Http/Resources/Admin/…`: `StaffAccountResource`, `StaffOptionsResource`, `NewsResource`, `EventAdminResource`, `EnclosureResource`, `DashboardSummaryResource`, `TicketReportResource` | Contrato JSON sin datos sensibles |
| Pruebas | `tests/Feature/Admin/*`, `tests/Concerns/CreatesAdministrators.php` | Un test por CA |
| Documentación | `apps/api/docs/administracion.md` (todavía no existe; se crea en la implementación) | Referencia vigente de endpoints y reglas |
| Paquetes | `packages/api-client` (ver `dashboard-003`) | Tipos y cliente del contrato |
| Datos | `docs/database/requests/DBR-005-news-events-soft-deletes.md` (nuevo, Borrador) | Cambio de esquema que ejecuta el responsable de BD |
| ADR | `docs/adr/0017-report-export-excel-pdf.md` (nuevo, Propuesto) | Dependencias para Excel y PDF |

## Contrato y datos

### Endpoints (todos bajo `/api/v1/admin`, JSON, mensajes en español)

Middleware común: `auth:sanctum`, `staff.user`, `administrator.two-factor`.

**Usuarios** — `permission:users.manage|operational-staff.manage`

| Método y ruta | Nombre | CA | Respuesta |
|---|---|---|---|
| `GET /users` | `admin.users.index` | 01, 02 | 200 paginado. Query: `search`, `role`, `department_id`, `status` (`active`/`inactive`), `page`, `per_page` (≤ 100, 25 por defecto) |
| `GET /users/options` | `admin.users.options` | 12 | 200 `{data:{departments:[{id,code,name,suggested_role}], roles:[{name,label}]}}` |
| `POST /users` | `admin.users.store` | 03, 04, 05 | 201 con la cuenta |
| `GET /users/{user}` | `admin.users.show` | 02 | 200 o 404 |
| `PATCH /users/{user}` | `admin.users.update` | 06, 04, 09 | 200 |
| `PATCH /users/{user}/status` | `admin.users.status` | 07, 09 | 200 con `is_active` |
| `DELETE /users/{user}` | `admin.users.destroy` | 08, 09 | 204 |
| `PUT /users/{user}/password` | `admin.users.password.update` | 10, 05 | 204 |
| `DELETE /users/{user}/two-factor` | `admin.users.two-factor.destroy` | 11 | 204 |

La ruta `users/options` se declara **antes** de `users/{user}`. El 404 y el 403 usan los mensajes de la spec.

Recurso `StaffAccountResource`: `id`, `first_name`, `last_name`, `second_last_name`, `full_name`, `email`, `department {id, code, name}`, `role` (`name`, `label`), `is_active`, `last_login_at`, `two_factor_confirmed` (booleano). **Nunca** `password`, `remember_token` ni `two_factor_*`.

**Noticias** — `permission:news.manage`; **Eventos** — `permission:events.manage`

| Método y ruta | Nombre | CA |
|---|---|---|
| `GET /news`, `GET /events` | `admin.news.index`, `admin.events.index` | 13 |
| `POST /news`, `POST /events` | `admin.news.store`, `admin.events.store` | 14 |
| `PATCH /news/{news}`, `PATCH /events/{event}` | `admin.news.update`, `admin.events.update` | 14 |
| `PATCH /news/{news}/status`, `PATCH /events/{event}/status` | `admin.news.status`, `admin.events.status` | 15 |
| `DELETE /news/{news}`, `DELETE /events/{event}` | `admin.news.destroy`, `admin.events.destroy` | 15 (requiere DBR-005) |

Reglas de validación: noticia — `title` (≤ 200), `content`, `category` (≤ 100), `published_date` obligatorios, `description`, `start_date`, `end_date` opcionales con `end_date ≥ start_date`; evento — `name` (≤ 200), `start_date` obligatorios, `end_date ≥ start_date`, `end_time` posterior a `start_time` cuando ambos vienen el mismo día. `image_path` **no** es aceptado (queda fuera de alcance). `author_id` se fija con el usuario autenticado solo al crear. `is_active` solo cambia por el endpoint de estado y en el alta.

**Recintos** — `permission:enclosures.manage`

| Método y ruta | Nombre | CA |
|---|---|---|
| `GET /enclosures` | `admin.enclosures.index` | 17 (`withCount('animals')`, sin N+1) |
| `POST /enclosures` | `admin.enclosures.store` | 18 |
| `PATCH /enclosures/{enclosure}` | `admin.enclosures.update` | 18 |

No existe ruta de eliminación. La unicidad de nombre compara `LOWER(name)` en PHP/SQL estándar, para no depender de la collation del servidor (hoy `utf8mb4_0900_ai_ci`).

**Panel y reporte**

| Método y ruta | Nombre | Permiso | CA |
|---|---|---|---|
| `GET /dashboard` | `admin.dashboard.show` | `dashboard.view` | 19, 24 |
| `GET /reports/tickets` | `admin.reports.tickets.show` | `reports.view` | 20, 21, 24 |
| `GET /reports/tickets/export` | `admin.reports.tickets.export` | `reports.view` | 22, 23 |

Parámetros del reporte: `period` (`week`, `month` o `custom`), `date` (referencia, `Y-m-d`, hoy por defecto), `from` y `to` (solo con `custom`), `page`. Respuesta: `period {type, from, to, label, previous_date, next_date}` (`previous_date`/`next_date` son las fechas de referencia del periodo anterior y siguiente para que el cliente no calcule periodos; `null` en `custom` y cuando el siguiente quedaría completamente en el futuro), `totals {tickets, adults, children, revenue}`, `daily [{date, tickets, adults, children, revenue}]` (todos los días del periodo, con ceros), `tickets` paginado `[{folio, purchased_at, adults, children, total}]`.

Respuesta del panel: `today {…totales}`, `last_7_days {…totales}`, `series [{date, revenue}]` (7 días, el actual incluido).

### Validación, Actions, Resources y Policies

- Form Requests por operación; base común con `failedValidation` que responde `{message, errors}` en 422.
- `authorize()` de los Requests de cuentas invoca `UserPolicy`; los fallos de `assignRole` devuelven el mensaje de CA-04.
- `ResolveReportPeriodAction` lanza `ValidationException` (422) para rango mayor de 366 días, fin anterior al inicio o extremo faltante (CA-21).
- Los controladores no contienen reglas: solo inyectan Request y Action y devuelven el Resource.

### Datos y DBR relacionada

- **DBR-005** (`docs/database/requests/DBR-005-news-events-soft-deletes.md`, Borrador, responsable de BD: Víctor Adrián): agrega `deleted_at TIMESTAMP NULL` a `news` y `events`, y solicita **evaluar** un índice por `tickets.purchased_at` para el reporte. Las migraciones las crea, prueba y aplica el responsable de BD; ningún agente escribe SQL ni migraciones.
- Sin cambios para cuentas, recintos, panel ni reporte: `users` ya tiene SoftDeletes, `created_by`/`updated_by`, `is_active`, `two_factor_*`; `sessions`, `activity_log` y los permisos ya existen (DBR-001/DBR-002).
- Secuencia con DBR: todo lo que no es eliminar noticias/eventos se implementa sin esperar; las rutas `DELETE` de noticias/eventos, el trait `SoftDeletes` en `Event`/`News` y los CA-15 relacionados inician con DBR-005 en `Lista para backend`.

### Errores y compatibilidad

- 401 sin sesión; 403 sin permiso, sin 2FA (`two_factor_setup_required`) o rol no asignable; 404 inexistente o fuera de alcance; 422 validación o regla de negocio.
- Contrato nuevo, sin cambios en rutas existentes. Único efecto sobre `api-006`: los eventos eliminados dejan de aparecer (esperado por la spec).
- `Retry-After` y 429 no aplican (sin limitador nuevo). Se evalúa `throttle:60,1` para la exportación en Riesgos.

## Seguridad, offline y operación

- **Mínimo privilegio y servidor como autoridad.** Permiso por grupo de rutas + Policy por registro; la interfaz solo presenta.
- **Datos personales.** Se exponen nombre, correo y área del personal únicamente a quien administra cuentas. Contraseñas con bcrypt; secretos 2FA cifrados por Fortify y nunca serializados.
- **Auditoría (CA-26).** `LogAdminActivityAction` registra en `activity('admin')`: actor (`causedBy`), evento (`created`, `updated`, `status-changed`, `deleted`, `password-reset`, `two-factor-reset`), recurso (`performedOn`) y propiedades **sin** contraseña, secretos ni cuerpo de noticias. Se llama después de confirmar la transacción.
- **Transacciones.** Alta, cambio de rol, baja y revocación de sesiones corren en `DB::transaction`; la continuidad de `admin` usa `lockForUpdate()`.
- **Exportación.** Descarga por streaming con `Content-Disposition: attachment; filename="reporte-boletos-<desde>_<hasta>.csv"` y `Cache-Control: no-store` (datos financieros). Sin archivos temporales en disco.
- **Inyección en CSV.** Los valores de texto que empiecen con `=`, `+`, `-` o `@` se prefijan con apóstrofo; en el reporte actual solo hay números y fechas, pero el escritor lo aplica por defecto para cuando se agreguen textos.
- **Portabilidad MySQL 8.0.x / Aiven / local.** Solo SQL estándar: sin `CONVERT_TZ`, sin funciones propietarias, sin vistas ni triggers. Configuración únicamente por `.env`; las claves nuevas de `config/arca.php` tienen valor por defecto y no son secretos.
- **Offline.** No aplica: es una API en línea.
- **Entorno de pruebas.** `arca_pruebas`, `DatabaseTransactions`, sin migraciones ni `RefreshDatabase` desde los tests; `arca_zoo` nunca se usa.

## Mapeo de criterios a pruebas

Convención de nombre: `test_caNN_administration_management_<descripción>()`, como en `api-003`. Todos en PHPUnit, `apps/api/src/tests/Feature/Admin/`. Se usa una nueva trait `CreatesAdministrators` (siembra `RolesAndPermissionsSeeder` dentro de la transacción y crea cuentas con rol y 2FA confirmado).

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | Lista paginada con filtros, orden por apellidos y sin campos sensibles | `StaffAccountsListTest` |
| CA-02 | `zoo-admin` no ve ni opera cuentas `admin`/`zoo-admin`/`executive` (404); `admin` ve todas | `StaffAccountsScopeTest` |
| CA-03 | Alta con rol aplicado, `created_by` y respuesta 201 sin contraseña | `StaffAccountsStoreTest` |
| CA-04 | `zoo-admin` asignando rol no gestionable en alta y edición → 403 sin cambios | `StaffAccountsScopeTest` |
| CA-05 | Correo repetido (también eliminado) y contraseña débil → 422 en español | `StaffAccountsStoreTest`, `StaffAccountPasswordTest` |
| CA-06 | Edición de datos y rol; el correo no cambia | `StaffAccountsUpdateTest` |
| CA-07 | Desactivar/activar; sesiones revocadas; login rechazado | `StaffAccountStatusTest` |
| CA-08 | Baja lógica; fila presente con `deleted_at`; sesiones revocadas; sin login | `StaffAccountDeleteTest` |
| CA-09 | Autodesactivación, autoeliminación y último `admin` activo → 422 | `StaffAccountGuardsTest` |
| CA-10 | Restablecer contraseña; hash bcrypt; sesiones revocadas | `StaffAccountPasswordTest` |
| CA-11 | Restablecer 2FA; `me` devuelve `two_factor_setup_required` | `StaffAccountTwoFactorTest` |
| CA-12 | Opciones de áreas y roles por actor, con rol sugerido | `StaffAccountOptionsTest` |
| CA-13 | Listados de noticias y eventos con inactivos y sin eliminados, en orden | `NewsAdminTest`, `EventsAdminTest` |
| CA-14 | Alta/edición válidas con `author_id`; fechas incoherentes y vacíos → 422 | `NewsAdminTest`, `EventsAdminTest` |
| CA-15 | Activar/desactivar y eliminar; el evento eliminado desaparece de `GET /api/v1/events` (requiere DBR-005) | `NewsAdminTest`, `EventsAdminTest` |
| CA-16 | Sin `news.manage`/`events.manage` → 403 en todas las operaciones | `NewsAdminTest`, `EventsAdminTest` |
| CA-17 | Lista de recintos con conteo de animales y sin N+1 | `EnclosuresAdminTest` |
| CA-18 | Crear y renombrar; nombre repetido sin distinguir mayúsculas → 422; no hay ruta DELETE | `EnclosuresAdminTest` |
| CA-19 | Totales de hoy y de 7 días, serie diaria y ceros sin ventas | `DashboardSummaryTest` |
| CA-20 | Semana (lunes–domingo), mes calendario, totales, desglose y listado en `America/Mexico_City` | `TicketReportTest` |
| CA-21 | Rango personalizado inválido → 422 | `TicketReportTest` |
| CA-22 | CSV: BOM, separador, encabezado de descarga y totales idénticos al JSON | `TicketReportExportTest` |
| CA-23 | `xlsx`/`pdf` → 422 «Formato de exportación no disponible.» mientras no estén habilitados; contrato del parámetro | `TicketReportExportTest` |
| CA-24 | `executive`, `admin` y `zoo-admin` leen lo mismo; sin permiso → 403 | `ReportAccessTest` |
| CA-25 | Todas las rutas `admin.*`: 401 sin sesión y 403 `two_factor_setup_required` sin 2FA | `AdminAccessTest` (recorre `Route::getRoutes()` por nombre) |
| CA-26 | Activitylog con actor, evento y recurso, sin contraseñas ni secretos, para cada tipo de acción | `AdminAuditTest` |
| CA-27 | Cobertura: busca `CA-01` a `CA-26` en los tests y verifica `DB_DATABASE=arca_pruebas` | `AdminCoverageTest` (patrón de `Visitor/CoverageTest`) |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí, con una dependencia pendiente | Todo lo implementable usa Laravel 12, Sanctum, Fortify, Spatie y MySQL 8.0.x ya aprobados (ADR 0001). SQL estándar, sin funciones propietarias, configuración solo por `.env`. **Excel y PDF** necesitan dependencias PHP nuevas: ADR 0017 (Propuesto) y no se instala nada hasta aprobarlo; hasta entonces solo CSV (RN-12). |
| II. La spec manda | Sí | Spec `007` Aprobada; este plan, las tasks (siguiente paso) y el PR enlazan los tres archivos. Cada ruta y regla remite a su CA/RN. |
| III. Lógica separada de la interfaz | Sí | Alcance, continuidad de `admin`, invalidación de sesiones, periodos y totales viven en Actions; los controladores solo delegan; el cliente no calcula (ver `dashboard-003`). |
| IV. Un test por criterio | Sí | La tabla anterior cubre CA-01 a CA-27; `AdminCoverageTest` lo verifica automáticamente. |
| V. Una sola fuente de verdad para los datos | **Con brecha a resolver** | El cambio de esquema (`deleted_at` en `news` y `events`) va por DBR-005 y migración del responsable de BD. Lo clínico y financiero no se borra: `tickets` es de solo lectura y `users` usa SoftDeletes. **Brecha:** la Constitución y `AGENTS.md` piden que los modelos de negocio extiendan `BaseModel`, pero esa clase no existe y ningún modelo vigente lo hace; esta feature sigue el patrón actual y no la introduce. El equipo debe decidir si se crea `BaseModel` (cambio transversal fuera de esta spec) o se corrige la redacción. No bloquea esta feature porque no agrega auditoría por modelo: la bitácora es Activitylog explícito. |
| VI. Código en inglés, personas en español | Sí | Rutas, tablas, permisos, clases y commits en inglés (`admin.users.store`); mensajes, etiquetas y `lang/es/validation.php` en español. |

## Riesgos y decisiones

- **ADR requerido:** 0015 `report-export-excel-pdf` (Propuesto) para las librerías de Excel y PDF. Opciones documentadas en el ADR: OpenSpout o PhpSpreadsheet para `.xlsx`; Dompdf para PDF. Sin aprobación no se instala nada.
- **Zona horaria de `purchased_at`.** Se asume UTC (valor por defecto de la app). Si las ventas reales o los datos de prueba se guardan en hora local, los límites de día se desplazarían 6 horas. Mitigación: Víctor confirma cómo se guardan las ventas antes de cerrar CA-19/CA-20; la conversión está aislada en `ResolveReportPeriodAction`.
- **Rendimiento del reporte.** `tickets` crecerá con la venta real. Mitigación: la consulta filtra por rango de `purchased_at` (índice propuesto en DBR-005), recorre con `cursor()` y pagina el listado. Si un periodo de 366 días resultara pesado, se agrega agregación por día en SQL en una iteración posterior.
- **Carrera por el último `admin`.** Cubierta con transacción y `lockForUpdate()`.
- **Sesiones en la tabla `sessions`.** Si el driver de sesión cambiara de `database`, `RevokeStaffSessionsAction` debe adaptarse; se deja una prueba que falla si `SESSION_DRIVER` no es `database` en el entorno de pruebas.
- **Mensajes de validación.** Hoy no hay `lang/es/validation.php`; sin él los 422 saldrían en inglés. Se agrega como primera tarea de configuración.
- **Exportar financiero.** Se deja `Cache-Control: no-store` y registro de la exportación en Activitylog (`report-exported`) para trazabilidad; se evalúa un limitador de ritmo en la revisión técnica.
- **Alternativas descartadas.** (1) Un endpoint por rol (`/admin/...` y `/zoo-admin/...`): duplica contrato; el alcance se resuelve con la Policy. (2) `CONVERT_TZ` en SQL: no portable. (3) Generar PDF/Excel en el cliente: viola el principio de lógica en servidor y la spec de dashboard.

## Orden y aprobación

**Secuencia de implementación (por dependencias):**

1. Configuración: `lang/es/validation.php`, `config/arca.php`, alias `permission` y render de 403 en español, trait de pruebas `CreatesAdministrators`.
2. Auditoría: `LogAdminActivityAction`.
3. Usuarios (CA-01 a CA-12): modelo/relaciones, `UserPolicy`, Actions, Requests, Resources, controladores, rutas y pruebas.
4. Recintos (CA-17, CA-18).
5. Panel y reporte (CA-19 a CA-24) y exportación CSV; `Ticket` solo lectura.
6. Noticias y eventos sin eliminar (CA-13, CA-14, CA-16 y parte de CA-15: activar/desactivar).
7. **Bloqueado por DBR-005 `Lista para backend`:** `SoftDeletes` en `News`/`Event`, rutas `DELETE` y el resto de CA-15.
8. Transversales (CA-25 a CA-27) y documentación `apps/api/docs/administracion.md`.
9. Excel/PDF: **diferido** hasta aprobar el ADR 0017; se agrega como spec/tarea posterior sin cambiar el contrato.

**Dependencias:** `api-003` (implementada), `api-006` (el catálogo público de eventos se beneficia del trait), DBR-005, ADR 0017, `dashboard-003` como consumidor. `dashboard-003` puede desarrollarse en paralelo con el cliente simulado de `@arca/api-client` (su RN-08).

**Aprobaciones requeridas:**

| Rol | Aprueba | Estado |
|---|---|---|
| Responsable funcional | Spec (ya aprobada) | Jonathan, 2026-10-30 |
| Equipo | Solución técnica y Constitution Check de este plan | Pendiente |
| Responsable de BD | DBR-005 (contenido, índice y zona horaria de `purchased_at`) | Pendiente (Víctor Adrián) |
| Equipo | ADR 0017 (solo para habilitar Excel/PDF) | Pendiente; no bloquea el resto |

Evidencias: `docs/03-roles-y-permisos.md`, `apps/api/specs/003-staff-authentication.md`, `apps/api/specs/006-public-catalog-read.md`, `apps/api/plan/003-staff-authentication.md`.

