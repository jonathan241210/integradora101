# Tareas · 007 · administration-management

- Spec: `apps/api/specs/007-administration-management.md` (Aprobada, Jonathan, 2026-10-30)
- Plan: `apps/api/plan/007-administration-management.md` (Aprobado, Jonathan, 2026-10-30)
- Estado del checklist: Aprobado

Todas las rutas indicadas son relativas a `apps/api/src` salvo que se diga otra cosa. Los tests usan `DatabaseTransactions` sobre `arca_pruebas`; ninguna tarea crea SQL, migraciones ni usa `RefreshDatabase`. Cada método de test se llama `test_caNN_administration_management_<descripción>`.

## Base de datos (responsable de BD)

- [x] **T-01** (CA-15, RN-09): Víctor Adrián y Jonathan aprueban `docs/database/requests/DBR-005-news-events-soft-deletes.md`; Víctor crea, prueba en MySQL 8.0 y aplica en `arca_pruebas` la migración (`deleted_at` en `news` y `events`; índice por `tickets.purchased_at` si procede) y deja la DBR en `Lista para backend` con evidencia. Además responde: ¿`tickets.purchased_at` se guarda en UTC o en hora local? Resultado en la DBR.
  - **Solo bloquea T-26.** Todo lo demás de esta lista inicia sin esperar.
  - Zona horaria de `tickets.purchased_at`: Confirmado por Jonathan, 2026-10-30; se resuelve con la zona del dispositivo o la local. Nota: el almacenamiento de `purchased_at` se asume en UTC.

## Implementación

### Base común

- [x] **T-02** (CA-05, CA-14, CA-18, CA-21): Crear `lang/es/validation.php` con mensajes y atributos en español (hoy solo existen `auth.php` y `visitor.php`).
- [x] **T-03** (CA-20, CA-21, CA-23): Agregar a `config/arca.php`: `report_export_formats` (`['csv']`), `report_timezone` (`America/Mexico_City`), `report_max_days` (366) y `report_page_size` (50). Sin secretos.
- [x] **T-04** (CA-16, CA-24, CA-25): En `bootstrap/app.php` registrar el alias `permission` (`Spatie\Permission\Middleware\PermissionMiddleware`) y renderizar `UnauthorizedException` como JSON 403 «No tienes permiso para realizar esta acción.».
- [x] **T-05** (CA-26): `app/Actions/Admin/LogAdminActivityAction.php`: único punto que escribe en `activity('admin')` con actor, evento, recurso y propiedades sin contraseñas ni secretos.
- [x] **T-06** (CA-25, RN-10): En `routes/api.php`, grupo `prefix('admin')->name('admin.')` con `auth:sanctum`, `staff.user` y `administrator.two-factor`, con subgrupos por permiso (`users.manage|operational-staff.manage`, `news.manage`, `events.manage`, `enclosures.manage`, `dashboard.view`, `reports.view`). `users/options` se declara antes que `users/{user}`. Las rutas se agregan junto con la tarea que implementa cada controlador.
- [x] **T-07** (CA-25, CA-27): `tests/Concerns/CreatesAdministrators.php`: siembra `RolesAndPermissionsSeeder` dentro de la transacción y crea cuentas por rol con `two_factor_confirmed_at` configurable.

### Usuarios

- [x] **T-08** (CA-02, CA-04, RN-01, RN-07): `ResolveManageableRolesAction` (`users.manage` → los cinco roles; `operational-staff.manage` → `cashier` y `veterinarian`), scope de consulta de cuentas gestionables en `User` y `app/Policies/UserPolicy.php` (`view`, `update`, `delete`, `assignRole`).
- [x] **T-09** (CA-07, CA-08, CA-10, CA-11, RN-04): `RevokeStaffSessionsAction`: borra las filas de `sessions` de la cuenta y rota `remember_token`.
- [x] **T-10** (CA-09, RN-03): `GuardAdministratorContinuityAction`: dentro de transacción con `lockForUpdate()`, impide quedarse sin `admin` activo y rechaza autodesactivación y autoeliminación con 422 en español.
- [x] **T-11** (CA-01, CA-02, CA-12): `ListStaffAccountsAction` (filtros `search`, `role`, `department_id`, `status`; orden por apellidos; paginado), `FindManageableStaffAccountAction` (404 «Usuario no encontrado.» fuera de alcance), `ListStaffOptionsAction`, `StaffAccountResource`, `StaffOptionsResource`, `StaffAccountController@index|show` y la ruta `users/options`. Nunca expone `password`, `remember_token` ni `two_factor_*`.
- [x] **T-12** (CA-03, CA-04, CA-05, CA-06, RN-02, RN-05, RN-06): `CreateManagedStaffAccountAction` (envuelve a `CreateStaffAccountAction`, valida alcance del rol) y `UpdateStaffAccountAction` (nombre, apellidos, área y rol; el correo no cambia; evita degradar al último `admin`), con sus Form Requests, `StaffAccountController@store|update` y registro de `created_by`/`updated_by`.
- [x] **T-13** (CA-07, CA-08, CA-09): `SetStaffAccountStatusAction` y `DeleteStaffAccountAction` (SoftDeletes) con `StaffAccountStatusController` y `StaffAccountController@destroy`; ambas revocan sesiones y registran auditoría.
- [x] **T-14** (CA-05, CA-10, CA-11): `ResetStaffPasswordAction` (política `Password::defaults()`, bcrypt, revoca sesiones) y `ResetStaffTwoFactorAction` (reutiliza `Laravel\Fortify\Actions\DisableTwoFactorAuthentication` y revoca sesiones), con `StaffAccountPasswordController` y `StaffAccountTwoFactorController`.

### Recintos

- [x] **T-15** (CA-17, CA-18): `ListEnclosuresAction` (`withCount('animals')`), `SaveEnclosureAction` (nombre único comparando `LOWER(name)`, máximo 100), Form Requests, `EnclosureResource`, `EnclosureController` y rutas `index|store|update` sin ruta de eliminación.

### Panel y reporte

- [x] **T-16** (CA-20, CA-21, RN-08): Modelo `Ticket` de solo lectura (sin `qr_code` en ningún Resource) y `ResolveReportPeriodAction` (semana lunes–domingo, mes calendario y rango personalizado en `America/Mexico_City`; devuelve `previous_date` y `next_date`; 422 por rango mayor de 366 días, fin anterior al inicio o extremo faltante). Convierte los límites a UTC solo para consultar.
- [x] **T-17** (CA-19, CA-24, RN-08, RN-13): `SummarizeTicketSalesAction` (totales y serie diaria con ceros, agrupando por día en PHP sobre `cursor()`, importes como cadena con dos decimales), `BuildDashboardSummaryAction`, `DashboardSummaryResource`, `DashboardController` y ruta `admin.dashboard.show` con `dashboard.view`.
- [x] **T-18** (CA-20, CA-21, CA-24, RN-13): `BuildTicketReportAction` (periodo, totales, desglose diario y listado paginado de 50 con folio, fecha local, adultos, niños y total), `TicketReportResource`, `TicketReportController` y ruta `admin.reports.tickets.show` con `reports.view`.
- [x] **T-19** (CA-22, CA-23, RN-12): `TicketReportCsvWriter` y `ExportTicketReportAction` (streaming UTF-8 con BOM, separador coma, prefijo de apóstrofo ante `=`, `+`, `-`, `@`, `Cache-Control: no-store`, nombre `reporte-boletos-<desde>_<hasta>.csv`), `TicketReportExportController` y ruta `admin.reports.tickets.export`. `xlsx` y `pdf` pasan la validación pero responden 422 «Formato de exportación no disponible.» mientras `report_export_formats` solo tenga `csv`. Registra `report-exported` en la bitácora. [Historial: hoy `xlsx` y `pdf` están habilitados; ver T-39.]

### Noticias y eventos

- [x] **T-20** (CA-13, CA-14, CA-16): Modelo `News` (`$timestamps = false`, casts de fechas y `is_active`), `ListNewsAction`, `SaveNewsAction`, `NewsResource`, Form Requests (`image_path` no aceptado; `author_id` solo al crear), `NewsController` y rutas `index|store|update` con `news.manage`.
- [x] **T-21** (CA-13, CA-14, CA-16): Lo mismo para eventos: `ListEventsAdminAction`, `SaveEventAction`, `EventAdminResource`, Form Requests (`end_date ≥ start_date`; `end_time` posterior a `start_time` el mismo día), `Admin\EventController` y rutas con `events.manage`. No se modifican `ListEventsAction` ni `GetEventAction`.
- [x] **T-22** (CA-15): `SetNewsStatusAction`, `SetEventStatusAction` y rutas `PATCH …/status`.
- [x] **T-26** (CA-15, RN-09) — **bloqueada por T-01**: agregar `SoftDeletes` a `News` y a `Event` (solo cuando la columna exista en `arca_pruebas`), `DeleteNewsAction`, `DeleteEventAction` y las rutas `DELETE`. Comprobar que `GET /api/v1/events` ya no devuelve eventos eliminados sin tocar `ListEventsAction`.

## Pruebas (un test por CA)

- [x] **T-23** (CA-01, CA-02, CA-12): `tests/Feature/Admin/StaffAccountsListTest.php`, `StaffAccountsScopeTest.php`, `StaffAccountOptionsTest.php`. Cubre lista con filtros y orden, sin campos sensibles, 404 fuera de alcance para `zoo-admin`, `admin` con todo y opciones por actor.
- [x] **T-24** (CA-03, CA-04, CA-05, CA-06, CA-07, CA-08, CA-09, CA-10, CA-11): `StaffAccountsStoreTest.php`, `StaffAccountsUpdateTest.php`, `StaffAccountStatusTest.php`, `StaffAccountDeleteTest.php`, `StaffAccountGuardsTest.php`, `StaffAccountPasswordTest.php`, `StaffAccountTwoFactorTest.php`. Incluye 403 por rol no asignable, correo repetido incluso eliminado, contraseña débil, sesiones revocadas, baja lógica con fila presente, último `admin`, autodesactivación y `two_factor_setup_required` tras restablecer 2FA.
- [x] **T-25** (CA-17, CA-18): `EnclosuresAdminTest.php`: conteo sin N+1, nombre repetido sin distinguir mayúsculas y ausencia de ruta DELETE.
- [x] **T-27** (CA-19): `DashboardSummaryTest.php`: totales del día y de 7 días, serie diaria y ceros sin ventas.
- [x] **T-28** (CA-20, CA-21, CA-24): `TicketReportTest.php` y `ReportAccessTest.php`: semana, mes y rango en `America/Mexico_City` (incluye un boleto cerca de medianoche), totales, desglose, `previous_date`/`next_date`, rangos inválidos y 403 sin permiso; `executive`, `admin` y `zoo-admin` ven lo mismo.
- [x] **T-29** (CA-22, CA-23): `TicketReportExportTest.php`: BOM, separador, encabezados de descarga, totales idénticos al JSON y 422 para `xlsx`/`pdf`. [Nota de historial, 2026-10-30: el 422 de `xlsx`/`pdf` de esta tarea ya no es el comportamiento vigente. Desde T-39 ambos formatos están habilitados, y el 422 solo aplica a un formato fuera de la lista o a PDF sobre el tope de 2000 boletos; CA-23 se verifica con los métodos `test_ca23_…` de `TicketReportExportTest.php`.]
- [x] **T-30** (CA-13, CA-14, CA-16): `NewsAdminTest.php` y `EventsAdminTest.php` (parte sin eliminar): listados con inactivos y orden, altas y ediciones válidas con `author_id`, fechas incoherentes → 422, 403 sin permiso.
- [x] **T-31** (CA-15) — **bloqueada por T-26**: casos de activar/desactivar y de eliminar en `NewsAdminTest.php` y `EventsAdminTest.php`, y que el evento eliminado no aparece en `GET /api/v1/events`. La parte de activar/desactivar puede escribirse antes con T-22.
- [x] **T-32** (CA-25): `AdminAccessTest.php`: recorre las rutas `admin.*` por nombre y comprueba 401 sin sesión y 403 `two_factor_setup_required` con administrador sin 2FA.
- [x] **T-33** (CA-26): `AdminAuditTest.php`: Activitylog con actor, evento y recurso para alta, edición, estado, baja, restablecimiento de contraseña y 2FA, contenido y exportación, sin contraseñas ni secretos.
- [x] **T-34** (CA-27): `AdminCoverageTest.php`: verifica `DB_DATABASE=arca_pruebas` y que cada `CA-01` a `CA-28` aparece nombrado en los tests de `tests/Feature/Admin/` (patrón de `Visitor/CoverageTest`). Ampliada el 2026-10-30 a CA-28; su verificación de CA-28 depende de T-41. La casilla se mantiene como historial y debe revisarse al cerrar T-41.

## Cambio de 2026-10-30: zona horaria del dispositivo (RN-14, CA-28)

Decisión de Jonathan (responsable funcional), 2026-10-30: zona del dispositivo con respaldo en `America/Mexico_City`. Jonathan confirmó la decisión y aprobó proceder con la implementación. La redacción literal de CA-28, RN-14 y de las aclaraciones de CA-19, CA-20 y CA-22 la proveyó el documentador y fue confirmada por Jonathan, 2026-10-30. Confirmado por Jonathan, 2026-10-30: aceptación de alias de zona, listado sin desfase y zona no visible en la interfaz (propuestas técnicas originales de Claude).

- [x] **T-40** (CA-19, CA-20, CA-22, CA-28, RN-08, RN-14): crear `app/Actions/Admin/Reports/ResolveRequestedTimezoneAction.php`: lee `timezone` de la petición, acepta solo `UTC` o un nombre con «/» presente en `DateTimeZone::listIdentifiers(DateTimeZone::ALL_WITH_BC)` (incluye alias como `US/Pacific`) [confirmado por Jonathan, 2026-10-30]; abreviaturas (`EST`) y offsets (`+05:00`) se ignoran. Si falta, está vacío o no es válido, devuelve `config('arca.report_timezone')`; no lanza 422. Pasar la zona resuelta a `ResolveReportPeriodAction` (periodos, `previous_date`/`next_date` y rango personalizado), `SummarizeTicketSalesAction` (agrupado por día), `BuildDashboardSummaryAction` (día actual y serie), `BuildTicketReportAction`, `ExportTicketReportAction`, `TicketReportCsvWriter` (encabezado de zona) y `PresentTicketRow` (hora de `purchased_at`). Los Form Requests de reporte y exportación leen `timezone` sin regla de validación; el panel no tiene Form Request propio y su controlador lee `timezone` desde el `Request`. Respuestas: `data.timezone` en el panel (`DashboardSummaryResource`) y `data.period.timezone` en el reporte (`TicketReportResource`). Reabre el alcance de T-16 a T-19, que fijaban la zona; esas tareas siguen `[x]` como historial. Sin cambios de esquema, de rutas ni de `config/arca.php` (`report_timezone` queda como valor por defecto). Actualizar `apps/api/docs/administracion.md` (zona horaria, panel, reporte y exportación).
- [x] **T-41** (CA-28): `tests/Feature/Admin/ReportTimezoneTest.php` con métodos `test_ca28_administration_management_<descripción>`. Cubre: (a) una zona válida distinta de la por defecto, en las tres rutas, cambia día actual, límites de periodo, agrupado, `purchased_at` del listado y CSV, con un boleto cercano a medianoche; (b) `timezone` ausente, vacía, `Mars/Olympus`, `EST` o `+05:00` responde 200 o descarga con `America/Mexico_City`, sin 422 por zona, e indica la zona usada; (c) los totales del JSON y del CSV coinciden con una zona no por defecto. Usa `DatabaseTransactions` sobre `arca_pruebas`, sin migraciones. Depende de T-40. **Pendiente real (no cerrado):** no existe caso de prueba para el alias `US/Pacific`, aceptado por la regla de T-40 y confirmado por Jonathan, 2026-10-30. La búsqueda de `US/Pacific` en `apps/api/src/tests` no devuelve resultados. Ampliar T-41 o abrir una tarea nueva antes de cerrar CA-28.

## Calidad y entrega

- [x] **T-35**: Desde `apps/api/src` ejecutar `php artisan test --filter=Admin`, la suite completa (para confirmar que `api-003`, `api-004`, `api-005` y `api-006` siguen en verde) y `./vendor/bin/pint --test`; correr `/verify` y registrar resultados.
- [x] **T-36**: Crear `apps/api/docs/administracion.md` (todavía no existe; lo crea esta tarea) con endpoints, permisos, alcance por rol, reglas del último `admin`, formatos de exportación disponibles y dependencia de DBR-005, sin secretos. Actualizar `docs/03-roles-y-permisos.md` para quitar la nota de que la gestión de cuentas «llega con la feature» si corresponde.
- [x] **T-37**: Actualizar `.env.example` solo si se añadió alguna variable (hoy no se prevé); confirmar que no se versionan secretos.
- [x] **T-38**: Completar el Constitution Check del PR (`/constitution-check`), enlazar spec, plan y tasks, citar `api-007` en los commits y pasar la spec a `Implementada` cuando CA-01 a CA-28 estén verificados.

## Exportación Excel y PDF (completada)

- [x] **T-39** (CA-23, RN-12): Completada tras aceptar el ADR 0017 (aprobación del equipo, 2026-10-30; el ADR 0018, PHP mínimo 8.4, se aceptó el mismo día). Se instalaron `openspout/openspout` v5.12.2 y `dompdf/dompdf` v3.1.6 con `composer require --no-scripts` desde `apps/api/src` (enmienda del ADR 0017); se agregaron los exportadores `TicketReportXlsxWriter` y `TicketReportPdfWriter` y el directorio temporal `ReportTempDirectory`; `report_export_formats` = `['csv', 'xlsx', 'pdf']` y `report_pdf_max_tickets` = 2000; y se extendió `tests/Feature/Admin/TicketReportExportTest.php` (CA-23). Evidencia: enmienda del ADR 0017 y reporte de la sesión principal. La ejecución de las pruebas y de `/verify` queda registrada en el PR, no en esta tarea. Historial: antes de esta tarea, CA-23 se verificaba con el 422 de T-29.

## Trazabilidad

- CA-01..CA-12 → T-08 a T-14 (implementación) y T-23, T-24 (pruebas).
- CA-13..CA-16 → T-20 a T-22, T-26 (implementación) y T-30, T-31 (pruebas).
- CA-17, CA-18 → T-15 (implementación) y T-25 (pruebas).
- CA-19..CA-24 → T-16 a T-19 (implementación) y T-27 a T-29 (pruebas). CA-19, CA-20 y CA-22 se amplían con T-40 (implementación) y T-41 (pruebas).
- CA-23 → T-19 y T-39 (implementación: CSV, Excel y PDF) y T-29 (prueba; el formato fuera de la lista y el tope de PDF se prueban en `TicketReportExportTest`).
- El límite `throttle:20,1` de la ruta de exportación está implementado y tiene una prueba (`test_ca22_…` en `TicketReportExportTest`), pero la spec no lo describe en ningún CA-xx. Pendiente de decisión: añadirlo a la spec (ver preguntas del plan) antes de dar CA-22 por verificado con ese alcance.
- CA-25 → T-04, T-06 (implementación) y T-32 (prueba).
- CA-26 → T-05 (implementación) y T-33 (prueba).
- CA-27 → T-07 (infraestructura) y T-34 (prueba).
- CA-28 → T-40 (implementación) y T-41 (prueba).
- RN-01..RN-14 aparecen en la tarea que las implementa (RN-14 en T-40). Ninguna tarea crea migraciones.

Orden por dependencias: T-02 a T-07 → T-08 a T-14 → T-15 → T-16 a T-19 → T-40 → T-41 → T-20 a T-22 → T-23 a T-25, T-27 a T-30, T-32 a T-34 → T-35 a T-38. T-01 corre en paralelo con todo; T-26 espera a T-01 y T-31 espera a T-26.
