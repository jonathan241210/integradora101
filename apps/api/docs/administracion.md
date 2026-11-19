# Administración de la API

Referencia de `/api/v1/admin/*`, contrato de `api-007`. Spec: `apps/api/specs/007-administration-management.md`. Plan: `apps/api/plan/007-administration-management.md`. Consumidor: `dashboard-003`, vía `@arca/api-client`.

Este documento describe el código revisado. No certifica que las pruebas pasen: la suite (T-35) se verifica aparte. No contiene secretos ni credenciales.

> Nota de vigencia (2026-11-05, revisión aprobada de `api-007`): solo `admin` (con `users.manage`) gestiona cuentas del personal. `zoo-admin` responde 403 en todas las rutas de cuentas. El permiso `operational-staff.manage` se retiró del catálogo y del código, y el seeder ya se aplicó en `arca_pruebas` (`api-007` T-42 a T-44).

> Nota de vigencia (2026-11-01): `image_path` deja de ser solo de lectura. La subida, el reemplazo, el borrado del archivo y `image_url` se especifican en `apps/api/specs/008-event-news-images.md` (Aprobada, implementada en el backend). Ver la sección «Imágenes».

> Nota de vigencia (2026-11-02, `api-009`): el panel (`/dashboard`), el reporte (`/reports/tickets`, totales, desglose diario y listado) y las exportaciones CSV, Excel y PDF excluyen los boletos con `status` `cancelled` (CA-34 de `api-009`, RN-18). El filtro `completed` vive en `SummarizeTicketSalesAction`, `BuildTicketReportAction` y `ExportTicketReportAction` (scope `Ticket::completed()`). Al desplegar, las cifras históricas pueden bajar si ya existen boletos cancelados; despliega junto con `dashboard-003`. `Ticket` ya no es de solo lectura: lo escriben las Actions de `api-009` (ver `apps/api/docs/tickets.md`).

El parámetro `timezone` (RN-14, CA-28; decisión de Jonathan del 2026-10-30) está implementado (T-40) y probado (T-41).

## Acceso común

Todo el grupo aplica, en este orden:

1. `auth:sanctum`: sin sesión, 401.
2. `staff.user`: cuenta inactiva, 401 «Tu cuenta está desactivada.». Aplica también a sesiones ya abiertas.
3. `administrator.two-factor`: para `admin` y `zoo-admin` (`config('arca.two_factor_roles')`) sin 2FA confirmado, 403 con `code: two_factor_setup_required`.
4. `permission:<permiso>` por subgrupo: sin permiso, 403 «No tienes permiso para realizar esta acción.».

Formato de errores:

- 404: `{ "message": "…" }`.
- 422: `{ "message": "…", "errors": { "campo": ["…"] } }`. `message` es el primer error.
- 403 de asignación de rol: «No tienes permiso para asignar ese rol.».

Los recursos individuales van envueltos en `data`, como es estándar en los Resources de Laravel. Los listados de cuentas usan paginación de Laravel (`data`, `links`, `meta`). Noticias, eventos y recintos se devuelven sin paginar.

## Roles y alcance

| Rol | Permisos de ruta | Cuentas que ve y opera | 2FA obligatorio |
|---|---|---|---|
| `admin` | `users.manage`, `news.manage`, `events.manage`, `enclosures.manage`, `dashboard.view`, `reports.view` | Todas | Sí |
| `zoo-admin` | `news.manage`, `events.manage`, `enclosures.manage`, `dashboard.view`, `reports.view`; además, según la matriz de `docs/03-roles-y-permisos.md`, `tickets.view` y `cash-closings.view` (fuera de estas rutas) | Ninguna desde 2026-11-05: sin `users.manage`, 403 en todas las rutas de cuentas | Sí |
| `executive` | `dashboard.view`, `reports.view` (solo lectura) | Ninguna | No |
| `cashier`, `veterinarian` | Ninguno | Ninguna (403) | No |

Roles asignables (`ResolveManageableRolesAction`):

- `admin`: los cinco roles.
- `zoo-admin`: ninguno desde el 2026-11-05 (no gestiona cuentas).

Con `admin` como único gestor, todos los roles son asignables. El 403 de asignación de rol «No tienes permiso para asignar ese rol.» queda sin caso de uso y su retirada es la pregunta 8 de `api-007`. Un rol que no existe en el catálogo responde 422.

Sin `users.manage`, cualquier ruta de cuentas responde 403 por permiso. Una cuenta inexistente responde 404 «Usuario no encontrado.» en el detalle, la edición, el estado, la eliminación, la contraseña y el 2FA.

Decisión de 2026-10-30 (Jonathan): la cuenta se resuelve antes de validar el cuerpo, así que el 404 prevalece sobre cualquier 422 o 403 causado por el contenido del cuerpo. Implementado con `ManagedStaffAccountRequest`.

## Cuentas del personal

Permiso de todas las rutas: `users.manage` (desde el 2026-11-05; antes, `users.manage` u `operational-staff.manage`).

| Método y ruta | Nombre | Respuesta |
|---|---|---|
| `GET /api/v1/admin/users` | `admin.users.index` | 200 paginado (25 por defecto, máximo 100). Filtros: `search` (nombre, apellidos o correo), `role`, `department_id`, `status` (`active`/`inactive`). Orden por apellidos y nombre. |
| `GET /api/v1/admin/users/options` | `admin.users.options` | 200 `{ "data": { "departments": [{id, code, name, suggested_role}], "roles": [{name, label}] } }`. `suggested_role` es `null` si el rol sugerido no es asignable para el actor. |
| `POST /api/v1/admin/users` | `admin.users.store` | 201. Ver alta. |
| `GET /api/v1/admin/users/{user}` | `admin.users.show` | 200 o 404. |
| `PATCH /api/v1/admin/users/{user}` | `admin.users.update` | 200. Campos opcionales: `first_name`, `last_name`, `second_last_name`, `department_id`, `role`. El correo se ignora. Sobre la propia cuenta, cambiar `role` responde 422 «No puedes cambiar tu propio rol.». |
| `PATCH /api/v1/admin/users/{user}/status` | `admin.users.status` | 200. Body: `is_active` (booleano, obligatorio). |
| `DELETE /api/v1/admin/users/{user}` | `admin.users.destroy` | 204. Borrado lógico. |
| `PUT /api/v1/admin/users/{user}/password` | `admin.users.password.update` | 204. Body: `password`. Sobre la propia cuenta: 422 «No puedes restablecer tu propia contraseña desde la administración.». |
| `DELETE /api/v1/admin/users/{user}/two-factor` | `admin.users.two-factor.destroy` | 204. Sobre la propia cuenta: 422 «No puedes restablecer tu propio segundo factor desde la administración.». |

Alta (`POST`): `email` (único entre todas las cuentas, incluidas las eliminadas; se guarda en minúsculas), `first_name`, `last_name`, `second_last_name` (opcional), `department_id` (área activa), `role` y `password` (`Password::defaults()`). La cuenta nace activa y registra `created_by`. El rol sugerido por el área lo propone `options`; el cliente puede cambiarlo.

Recurso `StaffAccountResource`: `id`, `first_name`, `last_name`, `second_last_name`, `full_name`, `email`, `department {id, code, name}`, `role {name, label}`, `is_active`, `last_login_at` (ISO 8601) y `two_factor_confirmed` (booleano). Nunca devuelve `password`, `remember_token` ni `two_factor_*`.

La contraseña se guarda con bcrypt mediante el cast `hashed` del modelo. No se devuelve ni se registra en la bitácora.

Restablecer 2FA borra el secreto, los códigos de recuperación y la confirmación (`Fortify DisableTwoFactorAuthentication`), y revoca las sesiones. En el siguiente ingreso, si el rol lo exige, el middleware `administrator.two-factor` obliga a configurarlo.

## Reglas del último administrador

Aplican cuando la cuenta objetivo es `admin` y está activa, y la operación la deja sin ese estado:

- Desactivar la cuenta.
- Eliminarla.
- Cambiarle el rol a otro distinto de `admin`.

Si no existe otro `admin` activo, responde 422 con `errors.user`: «Debe existir al menos un administrador de Presidencia activo.». La comprobación cuenta los otros administradores activos dentro de una transacción con `lockForUpdate()`, así que dos peticiones simultáneas no dejan el sistema sin `admin`.

Autodesactivación y autoeliminación responden 422: «No puedes desactivar tu propia cuenta.» y «No puedes eliminar tu propia cuenta.».

### Autorrestricciones sobre la propia cuenta (decisión de 2026-10-30)

Un administrador no puede, sobre su propia cuenta, desde `/api/v1/admin/users/{user}`:

- Restablecer su contraseña (`PUT …/password`): 422 «No puedes restablecer tu propia contraseña desde la administración.».
- Restablecer su segundo factor (`DELETE …/two-factor`): 422 «No puedes restablecer tu propio segundo factor desde la administración.».
- Cambiar su propio rol (`PATCH …`, campo `role`): 422 «No puedes cambiar tu propio rol.». Aplica aunque exista otro `admin` activo.

El cambio de contraseña propio queda para otra feature. Implementado; el 422 usa la clave `errors.user`.

Un `zoo-admin` no accede a las rutas de cuentas desde el 2026-11-05: responde 403 por permiso en todas ellas.

## Revocación de sesiones

Desactivar, eliminar, restablecer contraseña y restablecer 2FA revocan las sesiones de la cuenta afectada (`RevokeStaffSessionsAction`):

- Borran las filas de la tabla `sessions` (`config('session.table')`) de esa cuenta.
- Rotan `remember_token`.

Dependencias y límites:

- La revocación depende de `SESSION_DRIVER=database`, que es el valor por defecto de `config/session.php`. Con otro driver, el borrado no alcanza las sesiones guardadas fuera de esa tabla. El plan prevé una prueba que lo verifique; confirmar que existe antes de cerrar T-35.
- Las cuentas inactivas se rechazan además en `staff.user`, así que la desactivación no depende solo de la revocación.
- Este código no revoca `personal_access_tokens` de Sanctum. El personal entra por cookie (`api-003`). Pendiente de confirmar que el personal no usa tokens.
- Restablecer la propia contraseña o 2FA queda prohibido desde la administración (decisión de 2026-10-30), por lo que la sesión del propio administrador no debe cerrarse por esta vía. Implementado.

## Noticias y eventos

Permisos: `news.manage` para noticias y `events.manage` para eventos.

| Método y ruta | Nombre | Respuesta |
|---|---|---|
| `GET /api/v1/admin/news` | `admin.news.index` | 200, sin paginar. Activas e inactivas, sin eliminadas. Orden: `published_date` descendente, luego `id`. |
| `POST /api/v1/admin/news` | `admin.news.store` | 201. `author_id` = usuario actual. `is_active` opcional (por defecto `true`). |
| `PATCH /api/v1/admin/news/{news}` | `admin.news.update` | 200. Payload completo (mismos obligatorios que el alta). `is_active` y `author_id` no cambian aquí. |
| `PATCH /api/v1/admin/news/{news}/status` | `admin.news.status` | 200. Body: `is_active` (obligatorio). |
| `DELETE /api/v1/admin/news/{news}` | `admin.news.destroy` | 204. Borrado lógico (`deleted_at`). |
| `GET /api/v1/admin/events` | `admin.events.index` | 200, sin paginar. Orden: `start_date` descendente, luego `id`. |
| `POST /api/v1/admin/events` | `admin.events.store` | 201. |
| `PATCH /api/v1/admin/events/{event}` | `admin.events.update` | 200. Payload completo. |
| `PATCH /api/v1/admin/events/{event}/status` | `admin.events.status` | 200. |
| `DELETE /api/v1/admin/events/{event}` | `admin.events.destroy` | 204. Borrado lógico. |

Campos de noticia: `title` (≤ 200, obligatorio), `description` (≤ 5000), `content` (≤ 20000, obligatorio), `category` (≤ 100, obligatorio), `published_date` (`Y-m-d`, obligatorio), `start_date` y `end_date` (`Y-m-d`, opcionales; `end_date ≥ start_date` cuando hay `start_date`).

Campos de evento: `name` (≤ 200, obligatorio), `description`, `start_date` (obligatorio), `end_date` (≥ `start_date`), `start_time` y `end_time` (`HH:MM` o `HH:MM:SS`), `location` (≤ 255). Si ambos horarios caen el mismo día, `end_time` debe ser posterior a `start_time`.

`image_path` no se acepta como texto (se ignora); solo cambia mediante la subida `image` o `remove_image` (ver «Imágenes»). Se devuelve tal como está guardado, junto con `image_url`.

Recurso de noticia: `id`, `title`, `description`, `content`, `image_path`, `image_url`, `published_date`, `start_date`, `end_date`, `category`, `is_active`, `author_id`. Recurso de evento: `id`, `name`, `description`, `image_path`, `image_url`, `start_date`, `end_date`, `start_time`, `end_time`, `location`, `is_active`, `author_id`.

Errores de recurso: 404 «Noticia no encontrada.» y 404 «Evento no encontrado.».

### Borrado lógico (DBR-005)

- `DELETE` marca `deleted_at`. No borra físicamente.
- Lo eliminado deja de aparecer en las listas de administración y, en eventos, en `GET /api/v1/events` (catálogo público de `api-006`). `ListEventsAction` no cambió.
- No hay endpoint de restauración. Restaurar requiere intervención de BD.
- DBR-005 está en `Lista para backend`. La migración `2026_10_30_000005_news_events_soft_deletes_and_tickets_index` se aplicó en `arca_pruebas`. Staging y producción siguen pendientes (ver la DBR).
- Si un ambiente tiene el código con `SoftDeletes` y no tiene la columna `deleted_at`, `GET /api/v1/events` falla. Por eso el despliegue debe aplicar la migración antes.

## Recintos

Permiso: `enclosures.manage`.

| Método y ruta | Nombre | Respuesta |
|---|---|---|
| `GET /api/v1/admin/enclosures` | `admin.enclosures.index` | 200, sin paginar, ordenado por nombre. |
| `POST /api/v1/admin/enclosures` | `admin.enclosures.store` | 201. |
| `PATCH /api/v1/admin/enclosures/{enclosure}` | `admin.enclosures.update` | 200. |
| `PATCH /api/v1/admin/enclosures/{enclosure}/status` | `admin.enclosures.status` | 200 con el recurso. Cuerpo `{"is_active": true\|false}` con booleano JSON estricto; otro valor responde 422. Sin cambio de estado no escribe ni registra (api-019). |
| `DELETE /api/v1/admin/enclosures/{enclosure}` | `admin.enclosures.destroy` | 200 `{"message": "Recinto eliminado."}`. Borrado lógico; los animales conservan su recinto (api-019). También marca `deleted_at` en todos sus códigos QR en la misma transacción (api-020). |
| `GET /api/v1/admin/enclosures/{enclosure}/qr` | `admin.enclosures.qr.show` | 200 `{"enclosure": {id, name, is_active}, "qr": {"code", "svg"} \| null}`. Solo lectura; con varios activos muestra el de `id` mayor (api-020). |
| `POST /api/v1/admin/enclosures/{enclosure}/qr` | `admin.enclosures.qr.generate` | 201 si crea el código; 200 con el mismo cuerpo si ya había uno activo. Registra «Código QR generado» sin el valor. |
| `POST /api/v1/admin/enclosures/{enclosure}/qr/regenerate` | `admin.enclosures.qr.regenerate` | 200 con el mismo cuerpo y `deactivated` (N). Desactiva los activos (no los elimina) y crea uno nuevo; registra «Código QR regenerado». |

Recurso: `id`, `name`, `gps_lat`, `gps_lon`, `map_x`, `map_y`, `is_active`, `animals_count`. El listado incluye activos e inactivos y excluye eliminados.

Nombre: obligatorio, máximo 100, sin espacios sobrantes, único sin distinguir mayúsculas. Un nombre repetido responde 422 «Ya existe un recinto con ese nombre.» en `errors.name`. Al renombrar, el propio recinto no cuenta como duplicado.

Los recintos eliminados no cuentan para la unicidad; los inactivos sí. Un recinto inactivo o eliminado no aparece en el catálogo público ni en el escaneo QR, y no recibe animales nuevos (api-019). Error de recurso: 404 «Recinto no encontrado.».

## Búsqueda global

`GET /api/v1/admin/search?q=` (`admin.search`), solo lectura, en el grupo admin sin permiso propio. `q` de 2 a 100 caracteres tras recortar espacios (422 en `q` si no). Límite de 30 peticiones por minuto y usuario (limitador `admin-search`); la 31 responde 429 «Demasiadas búsquedas. Espera un minuto e inténtalo de nuevo.». Devuelve `{"groups": [{"section", "label", "items": [{"id", "title", "subtitle", "kind"?, "match"?: {"field", "snippet"}}]}]}` con los grupos que el rol puede ver, en el orden `users`, `news`, `events`, `enclosures`, `memories`, `tulanpedia`, `ticket-history`; máximo 5 por grupo. `kind` solo aparece en `tulanpedia`; `match` solo cuando la coincidencia está en un campo distinto del título (fragmento de hasta 120 caracteres). Sin permisos de grupo: `{"groups": []}` (api-019).

Coincidencia (enmienda (b), `app/Actions/Admin/Search/Matching/`): sin mayúsculas ni acentos (tabla fija, sin `ext-intl`); la consulta se divide por espacios y cada palabra debe coincidir con algún campo del elemento, en cualquier orden. Niveles: exacta (4), prefijo (3), contiene (2, solo palabras de 4 o más letras) y aproximada (1, Levenshtein: una edición con 4 a 6 letras, dos con 7 o más). La puntuación del elemento es el peor nivel de sus palabras; orden por puntuación, título normalizado, `kind` e `id`. `%` y `_` son literales. Se comparan en PHP, sin `LIKE`, como máximo 2000 candidatos por grupo (`SearchGroup::CANDIDATE_LIMIT`), los más recientes por `id` descendente; los registros más antiguos no aparecen (revisar si una tabla supera 2000 filas). `memories` y `ticket-history` además aceptan el identificador exacto cuando `q` es solo un número (consulta directa, fuera del tope). Campos buscables por grupo: usuarios (nombre, apellidos, correo, área, rol en español e identificador interno), noticias (título, descripción, contenido, categoría), eventos (nombre, descripción, ubicación), recintos (nombre), momentos (opinión, motivo de rechazo, estado), TulanPedia (nombre común, científico, categoría, hábitat, distribución, estado de conservación) y boletos (estado, forma de pago, motivo de cancelación, fecha dd/mm/aaaa). Nunca se consultan contraseñas, secretos de 2FA, tokens, `qr_code`, rutas de imagen ni datos de visitantes o de compradores, y el término no se registra en logs ni en Activitylog.

## Panel y reporte

Lectura para `dashboard.view` y `reports.view`. `executive`, `admin` y `zoo-admin` reciben los mismos datos.

Todos los totales, periodos y series se calculan en el servidor, en Actions. El cliente solo los presenta y reenvía `previous_date` y `next_date` como `date`.

### Panel

`GET /api/v1/admin/dashboard` (`admin.dashboard.show`, permiso `dashboard.view`):

```json
{
  "data": {
    "today": { "tickets": 0, "adults": 0, "children": 0, "revenue": "0.00" },
    "last_7_days": { "tickets": 0, "adults": 0, "children": 0, "revenue": "0.00" },
    "series": [{ "date": "AAAA-MM-DD", "revenue": "0.00" }],
    "timezone": "America/Mexico_City"
  }
}
```

Revisión boletos individuales (aprobada por Jonathan el 2026-11-06): `tickets` cuenta boletos, es decir, la suma de `adult_quantity` + `child_quantity` de los boletos `completed` (`api-007` CA-29, RN-15), no el número de filas. Las filas anteriores con varias cantidades suben su conteo al desplegar.

`series` tiene 7 días, con el actual incluido. Sin ventas, todos los valores son 0 o `"0.00"`.

Parámetro opcional `timezone`: identificador IANA de la zona del dispositivo. Si falta o no es válido, se usa `America/Mexico_City`. `data.timezone` indica la zona usada. Ver «Zona horaria».

### Reporte

`GET /api/v1/admin/reports/tickets` (`admin.reports.tickets.show`, permiso `reports.view`).

Parámetros:

- `period`: `week`, `month` o `custom`. Obligatorio.
- `date`: fecha de referencia `Y-m-d`. Por defecto, hoy.
- `from` y `to`: solo con `custom`.
- `page`: página del listado de boletos.
- `timezone` (opcional): identificador IANA de la zona del dispositivo. Ver «Zona horaria».

Periodos:

- `week`: de lunes a domingo, la semana que contiene `date`.
- `month`: el mes calendario que contiene `date`.
- `custom`: `from` y `to` inclusivos. Máximo 366 días. `to` no puede ser anterior a `from`. Falta un extremo: 422.

Respuesta:

```json
{
  "data": {
    "period": { "type": "week", "from": "Y-m-d", "to": "Y-m-d", "label": "…", "previous_date": "Y-m-d", "next_date": "Y-m-d o null", "timezone": "America/Mexico_City" },
    "totals": { "tickets": 0, "adults": 0, "children": 0, "revenue": "0.00" },
    "daily": [{ "date": "Y-m-d", "tickets": 0, "adults": 0, "children": 0, "revenue": "0.00" }],
    "tickets": [{ "folio": "…", "purchased_at": "Y-m-d H:i:s", "adults": 0, "children": 0, "total": "0.00" }]
  },
  "meta": { "current_page": 1, "last_page": 1, "per_page": 50, "total": 0 }
}
```

- `meta` pagina solo `data.tickets` (50 por página). `totals` y `daily` cubren todo el periodo, no la página.
- `previous_date` es la fecha de referencia del periodo anterior. `next_date` es `null` si el inicio del periodo siguiente es posterior a hoy, y siempre `null` en `custom`.
- `daily` incluye todos los días del periodo, con ceros.
- `folio` es el identificador del boleto. `purchased_at` se muestra en la zona de `period.timezone`, sin desfase.
- Nunca se incluyen `qr_code` ni la identidad del cajero.
- Los importes son cadenas con dos decimales. No se suman en el cliente.

### Exportación

`GET /api/v1/admin/reports/tickets/export` (`admin.reports.tickets.export`, permiso `reports.view`).

Acepta los mismos parámetros, incluido `timezone`, y además `format`, obligatorio, con valores `csv`, `xlsx` o `pdf`.

| Formato | Resultado hoy |
|---|---|
| `csv` | 200, descarga. |
| `xlsx` | 200, descarga (OpenSpout, ADR 0017). |
| `pdf` | 200, descarga (Dompdf, ADR 0017); 422 si el periodo supera `config('arca.report_pdf_max_tickets')` (2000 boletos): «El reporte tiene demasiados boletos para PDF (máximo N). Acorta el periodo o exporta en CSV o Excel.». |
| otro formato | 422 de validación; uno válido pero ausente de `config('arca.report_export_formats')` responde 422 «Formato de exportación no disponible.». |

Formatos disponibles: `csv`, `xlsx` y `pdf`, según `config('arca.report_export_formats')`. Cada uno tiene su clase (`TicketReportCsvWriter`, `TicketReportXlsxWriter`, `TicketReportPdfWriter`) con las mismas secciones, totales y zona horaria del periodo.

Descarga CSV:

- `Content-Type: text/csv; charset=UTF-8`.
- `Content-Disposition: attachment; filename="reporte-boletos-<desde>_<hasta>.csv"`.
- `Cache-Control: no-store`.
- UTF-8 con BOM y separador coma.
- Contenido: encabezado del periodo, zona horaria resuelta (la misma que `period.timezone`), totales, desglose diario y todos los boletos del periodo, sin paginar. Los totales coinciden con el JSON, porque ambos salen de la misma Action.
- Se escribe en streaming y se registra en la bitácora (`report-exported`).

Descargas `xlsx` y `pdf`:

- `Content-Type`: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` o `application/pdf`; `Content-Disposition: attachment; filename="reporte-boletos-<desde>_<hasta>.xlsx|.pdf"`; `Cache-Control: no-store`. Todas se registran en la bitácora `report-exported` con `format` y `timezone`.
- Excel se escribe con OpenSpout en un archivo temporal que se copia a la salida; los importes van como cadena de dos decimales (igual que el JSON) y las celdas de texto que empiezan con `=`, `+`, `-`, `@`, tabulador o retorno se prefijan con apóstrofo.
- PDF se genera con Dompdf con `isRemoteEnabled=false`, sin PHP ni JavaScript embebidos, fuente DejaVu Sans incluida y todo texto escapado. Se arma en memoria, por eso el límite de 2000 boletos (422 al superarlo).

Generación y límites de la exportación:

- Excel y PDF se generan completos **antes** de responder, en un archivo temporal que se envía y se borra (`deleteFileAfterSend`). Si el generador falla, la respuesta es un error 5xx y nunca un archivo truncado con 200. El CSV sigue en streaming.
- Los temporales (xlsx, PDF, `tempDir` y `fontCache` de Dompdf) viven en `storage/app/tmp-reports`, que se crea desde código con permisos 0700. No se versiona (`storage/app/.gitignore`) y los archivos se borran en `finally`.
- La ruta `admin.reports.tickets.export` tiene `throttle:20,1` (20 descargas por minuto): la 21.ª responde 429.
- **Limitación conocida de memoria:** el CSV y el Excel recorren los boletos con `cursor()` de Eloquent, que con el driver MySQL de PDO lee el resultado completo en memoria del cliente (consulta con buffer). El streaming evita acumular el archivo, no el resultado de la consulta; con periodos de cientos de miles de boletos puede agotar memoria. Se mantiene así para conservar el orden por `purchased_at`; el PDF queda acotado por `report_pdf_max_tickets`. Revisar con `lazyById` o consulta sin buffer si el volumen crece.

## Requisitos de PHP (ADR 0017 y 0016)

La API exige PHP ^8.4 y las extensiones zip, xmlreader, xmlwriter, libxml, dom, mbstring, fileinfo, ctype e iconv (OpenSpout y Dompdf). Versiones instaladas: OpenSpout v5.12.2 (MIT) y Dompdf v3.1.6 (LGPL-2.1).

## Zona horaria (RN-14)

- El panel, los periodos, el desglose, `previous_date` y `next_date`, la hora de `purchased_at` en el listado y el CSV usan la zona horaria del **dispositivo que consulta**. Se envía en el parámetro opcional `timezone` (identificador IANA, p. ej. `America/Mexico_City` o `America/Monterrey`) de `GET /api/v1/admin/dashboard`, `GET /api/v1/admin/reports/tickets` y `GET /api/v1/admin/reports/tickets/export`.
- Si `timezone` falta, está vacío o no es un identificador IANA válido (p. ej. `Mars/Olympus`, `EST` o `+05:00`), se usa `America/Mexico_City` (`config('arca.report_timezone')`). La zona inválida se ignora: no hay 422 por zona.
- La respuesta indica la zona usada: `data.timezone` en el panel y `data.period.timezone` en el reporte. El CSV la muestra en su encabezado.
- `@arca/api-client` del dashboard envía la zona del navegador (`Intl.DateTimeFormat().resolvedOptions().timeZone`). La API no guarda la zona enviada.
- Semana de lunes a domingo, mes calendario y rango personalizado, todos en la zona resuelta.
- **Alias del navegador (confirmado por Jonathan, 2026-10-30):** se acepta cualquier nombre de `DateTimeZone::listIdentifiers(DateTimeZone::ALL_WITH_BC)` que contenga `/` (p. ej. `Asia/Calcutta`, `Europe/Kiev`) o sea `UTC`. Las abreviaturas (`EST`) y los desfases (`+05:00`) siguen cayendo a `America/Mexico_City` sin 422.
- **Cambios de hora a medianoche** (p. ej. `America/Santiago`, donde la medianoche local puede no existir): los días del desglose y de la serie se recorren por fecha de calendario, el «hoy» del panel se busca por fecha y el límite de `report_max_days` se mide en días de calendario, para no perder el último día ni dar un 422 falso.
- La bitácora `report-exported` registra la zona usada en la propiedad `timezone`.
- La aplicación corre en UTC (`config/app.php`). Los límites se convierten a UTC solo para consultar `tickets.purchased_at`.
- **Supuesto:** `tickets.purchased_at` se asume guardado en UTC. Si estuviera en hora local, los límites de día se desplazarían seis horas y cambiarían totales, desglose y ventana del panel.
- La conversión está en `ResolveRequestedTimezoneAction` (zona), en `ResolveReportPeriodAction` y `SummarizeTicketSalesAction` (entrada) y en `PresentTicketRow` (salida del listado).

## Auditoría

Activitylog, log `admin`. Cada acción registra el actor (`causedBy`), el evento y el recurso afectado.

Eventos: `created`, `updated`, `status-changed`, `deleted`, `password-reset`, `two-factor-reset`, `report-exported`.

Las propiedades nunca incluyen `password`, `remember_token`, secretos ni recovery codes de 2FA, ni el contenido de noticias o eventos.

## Pendientes

1. **Excel y PDF:** ADR 0017 en estado Propuesto. T-39 diferido.
2. **Orden de validación frente a 404 (Resuelta en decisión, 2026-10-30):** la cuenta se resuelve antes de validar el cuerpo y el 404 prevalece. Implementada. Ver plan, divergencia 5.
3. **Restablecer la propia contraseña o 2FA (Resuelta en decisión, 2026-10-30):** prohibido desde la administración con 422. Implementada. El cambio de contraseña propio queda para otra feature. Ver plan, divergencia 6.
4. **Cambio del propio rol (Resuelta en decisión, 2026-10-30):** prohibido con 422 «No puedes cambiar tu propio rol.», aunque haya otro `admin` activo. Implementada. Ver plan, divergencia 6.
5. **Zona horaria de `tickets.purchased_at`:** Confirmado por Jonathan, 2026-10-30; se resuelve con la zona del dispositivo o la local. El almacenamiento se asume en UTC (ver «Zona horaria»).
6. **Tokens Sanctum del personal:** confirmar que no existen, para que la revocación cubra todas las sesiones.
7. **Driver de sesión:** confirmar que existe la prueba que exige `SESSION_DRIVER=database`.
8. **Clave de `errors` de los 422 de autorrestricción (Resuelta):** `errors.user`, igual que el resto de reglas de continuidad.
9. **Zona horaria del dispositivo (RN-14):** implementada (T-40 y T-41). Alias aceptados y listado sin desfase: Confirmado por Jonathan, 2026-10-30 (ver «Zona horaria»). Pendiente real: no hay prueba que cubra el alias `US/Pacific`; ver T-41 en `apps/api/tasks/007-administration-management.md`.
10. **Revisión de 2026-11-05 (aprobada):** `zoo-admin` sin gestión de cuentas y retirada de `operational-staff.manage` (implementada: `api-007` T-42 a T-44). Preguntas 8 y 9 de la spec resueltas: se conservan el 403 de asignación de rol y `UserPolicy`. No hay procedimiento documentado para resembrar permisos en producción (`api-009` pregunta R6; T-84).

## Imágenes (api-008)

Spec: `apps/api/specs/008-event-news-images.md`. Plan: `apps/api/plan/008-event-news-images.md`.

- Noticias y eventos aceptan el campo opcional `image` (JPG, PNG o WebP, máximo 5 MB = 5 120 KB). El servidor valida tipo y tamaño; los errores llegan como 422 en `errors.image`, con mensaje en español.
- Los archivos se guardan en el disco `public` de Laravel, en `news/` o `events/`, con nombre `<uuid>.<ext>` generado por la API. `image_path` guarda la ruta relativa e `image_url` la URL pública (`null` si no hay imagen gestionada o si `image_path` es un valor externo).
- Al guardar, la API quita metadatos (GPS, fecha, modelo, XMP, comentarios) y HDR, sin recomprimir; conserva el perfil de color y la orientación (`api-008` CA-14, RN-13). Las imágenes subidas antes del 2026-11-06 los conservan hasta volver a subirlas. Un archivo que no se puede procesar responde 422 (CA-15).
- Alta: `POST /api/v1/admin/news` o `/events`, JSON o `multipart/form-data`.
- Edición con archivo: `POST /api/v1/admin/{news|events}/{id}` multipart con `_method=PATCH` (PHP no entrega multipart en PATCH). La edición sin archivo sigue funcionando por `PATCH` JSON.
- `remove_image` verdadero (sin archivo nuevo) borra el archivo y deja `image_path`/`image_url` en `null`. Con archivo nuevo, gana el archivo y `remove_image` se ignora. Sin ambos, la imagen se conserva.
- Al reemplazar, quitar o eliminar, el archivo anterior se borra del disco tras guardar el registro. Solo se borran rutas gestionadas (`news/` o `events/` con nombre `<uuid>.(jpg|png|webp)`); cualquier otro valor se ignora.
- Eliminar sigue siendo borrado lógico: `deleted_at`, `image_path` en `null` y archivo borrado. Una restauración de la fila por base de datos no recupera la imagen.
- `GET /api/v1/events` (catálogo público) incluye `image_url` como campo aditivo.
- Auditoría (log `admin`): además de `created`/`updated`/`deleted`, el evento `image-changed` con `action` (`set`, `replaced`, `removed`) e `image_changed`; sin binario ni ruta absoluta.
- Operación: ejecutar `php artisan storage:link` en cada ambiente; sin él las URLs no resuelven. Los límites `upload_max_filesize` y `post_max_size` de PHP/servidor web pueden rechazar archivos antes de llegar a Laravel. Pasos completos para desplegar: «Checklist obligatorio de despliegue de la API» en `infra/README.md`.
- Sin migraciones ni DBR: `image_path` y `deleted_at` ya existen.

### Códigos QR de recintos (api-020)

Códigos nuevos: `ARCA-` más 8 caracteres de `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (sin `0`, `O`, `1`, `I`, `L`), con `random_int`; hasta 5 intentos ante colisión y, si fallan, 500 «No pudimos generar el código QR. Inténtalo de nuevo.». El SVG se genera en memoria en cada respuesta (ADR 0019) y nunca se guarda. Generar, regenerar y eliminar un recinto bloquean la fila del recinto (`lockForUpdate`). Activitylog guarda `qr_code_id` y `deactivated_ids`, nunca el código. El listado admin incluye `has_active_qr`.

Comando: `php artisan arca:generate-qr-codes {enclosure}` imprime el código activo (lo crea si no hay); con `--regenerate` desactiva los activos y crea uno nuevo. Recinto inexistente o eliminado: «El recinto no existe.» y código de fallo. Desde consola el registro de actividad no tiene usuario y guarda `source: console`.
