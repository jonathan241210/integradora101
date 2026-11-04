# DBR-006 · ticket-sales

- Estado: Lista para backend (Aplicada en arca_pruebas, 2026-11-02)
- Feature/spec origen: `apps/api/specs/009-ticket-sales.md` (y `apps/dashboard/specs/005-ticket-sales.md` como consumidor)
- Solicitante: Jonathan
- Responsable de BD: Víctor Adrián
- Responsable backend: Jonathan
- Fecha: 2026-11-01 (última edición de borrador: incorpora las decisiones de cancelación, impacto en `api-007` y avisos de precio)
- Depende de: DBR-001 (`english-schema-normalization`), aplicada; DBR-002 (`staff-authentication`), para `users`, roles y permisos; DBR-005 (`news-events-soft-deletes`), que ya creó `idx_tickets_purchased_at` en pruebas.
- Decisión a considerar junto con esta DBR (no la bloquea y no cambia el esquema): ADR 0019 (`docs/adr/0019-qr-svg-generation-api.md`, estado Propuesto), generación del QR del boleto en SVG desde la API (`api-009` CA-09).

> Esta DBR es solo una solicitud descriptiva. No contiene SQL ejecutable. El cambio real lo crea, prueba y aplica el responsable de BD como migración Laravel tras la aprobación de esta DBR (`docs/database/README.md`). Ningún agente ni cliente crea SQL o migraciones para este cambio.

## Problema y justificación

Hoy la tabla `tickets` solo se consulta para el reporte de boletos (`api-007`, de solo lectura). La taquilla del dashboard es demostrativa y no hay forma de registrar una venta real, cancelarla con motivo, consultar el historial del cajero ni cambiar precios con vigencia. Para cubrir `api-009` hacen falta tres cambios de esquema:

1. Una tabla de precios con vigencia (inmediata o programada), administrada solo por `admin` con 2FA.
2. Columnas nuevas en `tickets` para estado, cancelación, forma de pago (solo efectivo) y precios unitarios aplicados a cada venta.
3. Una tabla de avisos para el personal (`staff_notifications`), con registro de lectura y de acuse del cajero.

La Constitución (V) exige que los datos financieros no se borren físicamente y queden auditados, por lo que `tickets` y `ticket_prices` usan borrado lógico y trazabilidad de actor.

## Estado actual

- `tickets` existe con las columnas de `docs/database/esquema-ingles.md` (sección 16): `id`, `adult_quantity`, `child_quantity`, `total_amount`, `purchased_at` (DATETIME, UTC), `qr_code` (VARCHAR(255) NOT NULL) y `cashier_id` (FK a `users`). No tiene estado, cancelación, precios por línea ni borrado lógico.
- `idx_tickets_purchased_at` ya existe en `arca_pruebas` (DBR-005).
- No existen tablas de precios, de avisos ni de acuses.
- El modelo `Ticket` es de solo lectura en la API actual (`saving` y `deleting` lanzan excepción). Ese cambio de código es responsabilidad de backend y no forma parte de esta DBR.

## Contrato solicitado

### `ticket_prices` — tabla nueva

Precio por tipo de boleto con vigencia. Un precio vigente es la fila no eliminada, del tipo indicado, con `effective_at` menor o igual al momento de consulta, y de mayor `effective_at`.

| Columna | Tipo | Descripción | Restricciones |
|---|---|---|---|
| `id` | INT AUTO_INCREMENT | Identificador | PRIMARY KEY |
| `ticket_type` | VARCHAR(20) | Tipo de boleto: `adult` o `child` | NOT NULL |
| `amount` | DECIMAL(10,2) | Precio unitario en MXN | NOT NULL; la regla de monto positivo la valida la Action (ver pregunta 2 sobre restricción en BD) |
| `effective_at` | DATETIME | Momento en que el precio entra en vigor (UTC) | NOT NULL |
| `created_by` | INT | Usuario `admin` que registró el cambio | NOT NULL, FK a `users(id)` |
| `updated_by` | INT | Último usuario que modificó la fila | NULL, FK a `users(id)` |
| `deleted_at` | TIMESTAMP | Borrado lógico (SoftDeletes) | NULL |
| marcas de tiempo | — | `created_at`/`updated_at` según la convención de `BaseModel` (pendiente de confirmar, pregunta 8) | — |

Índice solicitado: sobre (`ticket_type`, `effective_at`), para resolver el precio vigente por tipo.

### `tickets` — columnas nuevas

| Columna | Tipo | Descripción | Restricciones |
|---|---|---|---|
| `status` | VARCHAR(20) | Estado del boleto: `completed` o `cancelled` | NOT NULL, DEFAULT `completed` |
| `payment_method` | VARCHAR(20) | Forma de pago; en esta fase solo `cash` | NOT NULL, DEFAULT `cash` |
| `adult_unit_price` | DECIMAL(10,2) | Precio unitario de adulto aplicado a esta venta (copia, no referencia) | NOT NULL para ventas nuevas; ver pregunta 1 para filas existentes |
| `child_unit_price` | DECIMAL(10,2) | Precio unitario de niño aplicado a esta venta (copia) | NOT NULL para ventas nuevas; ver pregunta 1 |
| `cancelled_at` | DATETIME | Momento de la cancelación (UTC) | NULL |
| `cancelled_by` | INT | Usuario que canceló el boleto. Solo puede ser el cajero vendedor (`cashier_id`), por la regla de `api-009` RN-08 | NULL, FK a `users(id)` |
| `cancellation_reason` | VARCHAR(255) | Motivo de la cancelación en texto libre | NULL |
| `updated_by` | INT | Último usuario que modificó el boleto | NULL, FK a `users(id)` |
| `deleted_at` | TIMESTAMP | Borrado lógico (SoftDeletes); no se usa para cancelar | NULL |

Cambio sobre columna existente:

| Elemento | Detalle |
|---|---|
| `tickets.qr_code` | Índice único, para que dos boletos no compartan token de validación. Ver pregunta 5. |

Índice solicitado para el historial del cajero: sobre (`cashier_id`, `purchased_at`). `idx_tickets_purchased_at` se conserva.

### `staff_notifications` — tabla nueva

Avisos dirigidos a un usuario del personal. Se propone una fila por destinatario y por fila de precio (ver preguntas 4 y 10).

| Columna | Tipo | Descripción | Restricciones |
|---|---|---|---|
| `id` | INT AUTO_INCREMENT | Identificador | PRIMARY KEY |
| `user_id` | INT | Destinatario del aviso | NOT NULL, FK a `users(id)` |
| `type` | VARCHAR(40) | Tipo de aviso; en esta fase `price-change` | NOT NULL |
| `payload` | JSON | Datos del aviso: tipo de boleto, monto nuevo, `effective_at` | NOT NULL |
| `ticket_price_id` | INT | Fila de `ticket_prices` que origina el aviso; base de la deduplicación (ver pregunta 10) | NULL en esta fase para tipos sin fila de precio; NOT NULL para `price-change`, FK a `ticket_prices(id)` (supuesto por defecto, pregunta 10) |
| `created_by` | INT | Usuario que originó el aviso (admin que cambió el precio) | NULL, FK a `users(id)` |
| `read_at` | DATETIME | Momento en que el destinatario lo marcó como leído | NULL |
| `acknowledged_at` | DATETIME | Momento del acuse del cajero (aviso emergente) | NULL |
| `created_at` | DATETIME | Momento de creación | NOT NULL |

Índices solicitados: sobre (`user_id`, `acknowledged_at`), (`user_id`, `read_at`) y único sobre (`user_id`, `ticket_price_id`) (supuesto por defecto, pregunta 10). Los dos primeros, a evaluar por el responsable de BD.

No se solicita borrado lógico para `staff_notifications`: no es dato clínico ni financiero. Ver pregunta 6.

## Impacto de las decisiones de 2026-11-01

- **Cancelación por cajero vendedor, solo el mismo día:** no cambia el esquema. La regla usa `cashier_id`, `purchased_at`, `status`, `cancelled_at`, `cancelled_by` y `cancellation_reason`. El día se compara en la zona que envía el cliente (`api-009` RN-16); el boleto no guarda zona de venta, por lo que no se pide columna nueva.
- **Boletos cancelados fuera de los reportes de `api-007`:** no cambia el esquema. Las consultas de totales y listados filtran por `status`. Si el responsable de BD lo considera necesario, el índice compuesto se evalúa (pregunta 9).
- **Aviso al cajero cuando el precio entra en vigor:** sin job (`api-009` RN-03), la creación del aviso ocurre en la primera consulta posterior a `effective_at`. Para no duplicar avisos por cajero y por cambio, se añade `staff_notifications.ticket_price_id` con índice único (`user_id`, `ticket_price_id`). Sin esa columna, la deduplicación dependería del JSON de `payload`, que no tiene un índice portable entre Aiven y MySQL local sin columna generada o índice funcional; por eso se prefiere la columna explícita (supuesto por defecto, pregunta 10).
- **Impresión del boleto:** la configuración vive en el navegador (`dashboard-005` RN-12). No cambia el esquema ni la API.
- **Generación del QR en SVG (`api-009` CA-09, ADR 0019 Propuesto):** no cambia el esquema. Si el equipo aprueba el ADR, la API genera el SVG con una librería PHP a partir de `tickets.qr_code` y no lo almacena. Por eso `tickets.qr_code` sigue siendo la única columna del QR y el índice único de la pregunta 5 no cambia. La elección de librería no altera el contrato de esta DBR.

## Elementos afectados

| Tipo | Nombre | Cambio |
|---|---|---|
| tabla | `ticket_prices` | crear |
| tabla | `staff_notifications` | crear |
| columna | `tickets.status` | agregar |
| columna | `tickets.payment_method` | agregar |
| columna | `tickets.adult_unit_price` | agregar |
| columna | `tickets.child_unit_price` | agregar |
| columna | `tickets.cancelled_at` | agregar |
| columna | `tickets.cancelled_by` | agregar (FK a `users`) |
| columna | `tickets.cancellation_reason` | agregar |
| columna | `tickets.updated_by` | agregar (FK a `users`) |
| columna | `tickets.deleted_at` | agregar (SoftDeletes) |
| columna | `staff_notifications.ticket_price_id` | agregar (FK a `ticket_prices`; supuesto, pregunta 10) |
| índice | `tickets.qr_code` | único (ver pregunta 5) |
| índice | `tickets` (`cashier_id`, `purchased_at`) | crear |
| índice | `ticket_prices` (`ticket_type`, `effective_at`) | crear |
| índice | `staff_notifications` (`user_id`, `acknowledged_at`) y (`user_id`, `read_at`) | crear |
| índice | `staff_notifications` (`user_id`, `ticket_price_id`) | crear, único (supuesto, pregunta 10) |

## Datos existentes y migración de datos

- Si `tickets` tiene filas en algún ambiente, sus columnas nuevas deben rellenarse antes de imponer `NOT NULL` a los precios unitarios y al token (ver pregunta 1). El responsable de BD debe confirmar cuántas filas existen en `arca_pruebas` y en cada ambiente antes de aprobar el orden de despliegue.
- `status` y `payment_method` toman su valor por defecto en filas existentes; esto debe confirmarse, porque las filas históricas podrían no ser ventas en efectivo.
- `ticket_prices` y `staff_notifications` nacen vacías. El precio inicial de adulto y de niño se registra por la operación de precios de la API (`api-009`), no por la migración, salvo que el responsable de BD y el negocio decidan una carga inicial (pregunta 3).

## Privacidad, auditoría y retención

- `tickets` y `ticket_prices` son datos financieros: nunca se borran físicamente (SoftDeletes) y su trazabilidad se registra en Activitylog desde la API (`api-009`).
- Cancelar un boleto cambia su estado y no ejecuta `deleted_at`.
- `staff_notifications` contiene solo datos de la propia operación de precios; no contiene datos personales de visitantes.
- No se almacenan contraseñas, secretos 2FA ni el SVG del QR. Solo se guarda el token `qr_code`.
- La configuración de impresión del dashboard no se almacena en la base de datos.

## Impacto, rendimiento y reversión

- `ADD COLUMN` de columnas NULL en `tickets` es prácticamente instantáneo en MySQL 8.0. Con volumen, la columna NOT NULL de precios por línea y el índice único de `qr_code` deben crearse en un momento en que no haya ventas simultáneas (pregunta 1).
- Los índices de `ticket_prices` y de `staff_notifications` se crean sobre tablas nuevas y vacías.
- Reversión: la migración debe poder revertirse quitando índices, columnas y tablas nuevas, en el orden inverso. Solo es válida mientras no existan ventas registradas con las columnas nuevas; una vez que hay ventas, la reversión requiere una DBR nueva.

## Compatibilidad MySQL 8.0

Tipos `VARCHAR`, `DECIMAL`, `DATETIME`, `TIMESTAMP`, `INT` y `JSON` son compatibles con MySQL 8.0.x. No se usan funciones, vistas, triggers ni procedimientos. Portable entre Aiven (ADR 0013) y MySQL local.

## Objeto almacenado (si aplica)

No aplica. La vigencia del precio se resuelve en la Action de la API, no en la base de datos.

## Orden de despliegue

1. Aprobar esta DBR (aprobaciones separadas de BD y backend).
2. El responsable de BD crea la migración, la prueba en una base MySQL 8.0 aislada y registra la evidencia en `arca_pruebas`.
3. Cambio expansivo primero: columnas nuevas NULL, tablas nuevas e índices sobre tablas nuevas. Sin esto, el código de `api-009` no puede desplegarse.
4. Relleno de filas existentes, si las hay (pregunta 1).
5. Columnas `NOT NULL` y índice único de `qr_code`, solo después del relleno.
6. Con la DBR en `Lista para backend`, backend habilita los modelos y endpoints de `api-009`.
7. El despliegue de `api-009` debe incluir el cambio de exclusión de cancelados en `api-007` (sección «Impacto en api-007» de la spec), para no mostrar cifras inconsistentes.

## Pruebas y evidencia

Estado de la evidencia a 2026-11-02. Lo verificado y lo pendiente se separan por punto.

**Migración creada**

- Migración: `2026_11_02_000006_ticket_sales_schema`.
- Registrada en la tabla `migrations` de `arca_pruebas` en el batch 7, con estado «Ran».

**Verificación de columnas, índices y claves en `arca_pruebas`**

Verificado por Jonathan el 2026-11-02 (consultas de solo lectura ejecutadas con asistencia de Claude Code). Sin datos de visitantes ni secretos.

- `tickets`: las columnas nuevas de la DBR existen (`status`, `payment_method`, `adult_unit_price`, `child_unit_price`, `cancelled_at`, `cancelled_by`, `cancellation_reason`, `updated_by`, `deleted_at`). `qr_code` tiene índice único (`tickets_qr_code_unique`). Existen los índices `idx_tickets_cashier_purchased` (`cashier_id`, `purchased_at`) e `idx_tickets_purchased_at`. Claves externas a `users` en `cashier_id`, `cancelled_by` y `updated_by`. Filas: 0.
- `ticket_prices`: tabla creada, con índice `idx_ticket_prices_type_effective` (`ticket_type`, `effective_at`) y claves externas `created_by` y `updated_by` a `users`. Filas: 2 (adulto 25.00 y niño 16.00, `effective_at` 2026-11-02 18:44:52), cargadas por la migración según la resolución 3.
- `staff_notifications`: tabla creada, sin uso en esta iteración. Índices `uk_staff_notif_user_price` (único: `user_id`, `ticket_price_id`), `idx_staff_notif_user_ack` (`user_id`, `acknowledged_at`) e `idx_staff_notif_user_read` (`user_id`, `read_at`). Claves externas a `users` y a `ticket_prices`. Filas: 0.

**Observaciones para el responsable de BD (Víctor Adrián)**

Estas observaciones no bloquean el registro. Se documentan para que BD confirme o decida.

1. Versión del servidor: `arca_pruebas` responde MySQL 8.4.11. El proyecto declara MySQL 8.0.x y la revisión mínima sigue pendiente del inventario inicial. Se deja constancia de la diferencia; no se afirma incompatibilidad.
2. Columnas NULL frente a la DBR: en la base real `tickets.qr_code`, `adult_unit_price` y `child_unit_price` son NULL. La DBR preveía NOT NULL tras el relleno (orden de despliegue, paso 5). Hay que decidir si se aplica NOT NULL en una migración nueva o si se acepta NULL.
3. Relleno de datos: la resolución 1 de la DBR indica que existían boletos en `arca_pruebas`. La consulta muestra 0 filas en `tickets`, así que el relleno no afectó datos. BD debe confirmarlo.
4. Columnas de `tickets` distintas de la DBR: `adult_quantity` y `child_quantity` son INT NULL, y `purchased_at` es TIMESTAMP NULL con `DEFAULT CURRENT_TIMESTAMP` (la DBR lo describía como DATETIME NOT NULL). `total_amount` es DECIMAL(8,2) NULL (no DECIMAL(10,2)).
5. Tipos de `ticket_prices` y `staff_notifications`: los `id` y `ticket_price_id` son BIGINT UNSIGNED (la DBR decía INT). `staff_notifications.ticket_price_id` es NULL (la DBR lo pedía NOT NULL para `price-change`). `staff_notifications.created_at` es TIMESTAMP NULL (la DBR lo pedía NOT NULL). La documentación de esquema refleja el estado real observado.
6. Quién verifica: la consulta la ejecutó Jonathan (responsable backend). El flujo de `docs/database/README.md` exige que la verificación la haga BD. Queda pendiente la revisión de Víctor Adrián.

**Pruebas**

- Subir y bajar (up y down) de la migración en MySQL 8.0 aislado: **no ejecutado. Pendiente explícito.** Hasta que se haga, la reversión descrita en «Impacto, rendimiento y reversión» no está verificada.
- No de regresión sobre `arca_pruebas`: la suite se registró en `apps/api/tasks/009-ticket-sales.md` (T-55 y T-74). Fallo ajeno a esta DBR: `CreateStaffCommandTest` (ca14), comando interactivo sin TTY. `./vendor/bin/pint --test` marca incumplimientos previos en `app/Models/User.php`, `EventImagesTest` y `NewsImagesTest`.
- Dependencias (`composer audit`, T-03): un aviso de severidad media, CVE-2026-45070, en `symfony/mime`. No afecta a `bacon/bacon-qr-code` v3.1.1. `ext-iconv` está habilitada en el PHP 8.5.12 local. Falta confirmarla en el PHP 8.4 de CI.
- No se ejecutó ninguna prueba ni consulta contra `arca_zoo` (producción).
- Staging y producción: sin evidencia. Quedan «pendiente».

## Aprobaciones

| Rol | Nombre | Fecha | Resultado |
|---|---|---|---|
| Responsable de BD | Víctor Adrián | 2026-11-02 | Aprobada |
| Responsable backend | Jonathan | 2026-11-02 | Aprobada |

## Aplicación por ambiente

| Ambiente | Estado | Fecha | Evidencia |
|---|---|---|---|
| desarrollo/pruebas (`arca_pruebas`) | aplicada | 2026-11-02 | Verificado por Jonathan el 2026-11-02 (consultas de solo lectura ejecutadas con asistencia de Claude Code). Migración `2026_11_02_000006_ticket_sales_schema` en batch 7 (Ran). Detalle y observaciones en «Pruebas y evidencia». Subir y bajar en MySQL 8.0 aislado no ejecutado (pendiente). |
| staging | pendiente | | |
| producción | pendiente | | |

Producción (`arca_zoo`) no se usa en ningún paso de esta DBR por parte de agentes.

## Resoluciones a preguntas abiertas (Aprobadas por BD y backend)

1. **Filas existentes de tickets:** Se confirma que sí existen boletos en arca_pruebas. Para mantener la consistencia histórica sin bloquear despliegues, la migración efectúa un backfill asignando precio unitario de adulto a 25.00 MXN, niño a 16.00 MXN, status = completed y payment_method = cash.
2. **Restricción de monto:** La validación de monto positivo se gestiona en la Action de la API para mantener máxima portabilidad y compatibilidad de esquema entre MySQL local y Aiven.
3. **Carga inicial de precios:** La migración inserta los precios iniciales vigentes en ticket_prices: Adulto = 25.00 MXN y Niño = 16.00 MXN, garantizando que el sistema cuente de inmediato con tarifas vigentes para la venta.
4. **Destinatarios de staff_notifications:** Confirmado: una fila por destinatario (user_id NOT NULL), como establece la spec.
5. **Unicidad y estructura de qr_code:** Se confirma VARCHAR(255) con índice UNIQUE. El token es opaco y aleatorio criptográficamente en servidor; el documento SVG del QR se genera dinámicamente en memoria desde la API (ADR 0019) y no se persiste.
6. **Borrado lógico de avisos:** staff_notifications **no** usa SoftDeletes (deleted_at), al tratarse de avisos operativos y no de datos clínicos ni financieros sensibles.
7. **Precios programados:** Se permiten múltiples registros futuros con distintas marcas de tiempo de vigencia según RN-06.
8. **Marcas de tiempo:** Se incluyen marcas estándar created_at y updated_at compatibles con BaseModel.
9. **Índice para reportes:** Se conserva el índice actual sobre purchased_at; no se añade índice compuesto adicional en esta fase.
10. **Deduplicación de avisos:** Confirmada la columna staff_notifications.ticket_price_id con índice único sobre (user_id, ticket_price_id) para garantizar deduplicación exacta.


## Propuesta técnica para backend: Notificaciones multicanal por correo electrónico

> **Propuesta para backend (responsable de BD, 2026-11-02):**
> Para mantener informados a los usuarios del personal que no tengan el dashboard abierto al momento de un cambio de tarifa, se propone habilitar el envío opcional de notificaciones por correo electrónico adicionalmente al registro en base de datos.
>
> 1. **Cero impacto en esquema:** La tabla users ya cuenta con columna email verificada, por lo que no se requiere ninguna columna ni migración adicional en la base de datos.
> 2. **Implementación recomendada en Laravel:**
>    - Aprovechar el sistema de notificaciones de Laravel (Illuminate\Notifications\Notification) retornando en ia() tanto ['database', 'mail'] (o condicionado según preferencias del usuario o tipo de evento).
>    - Para el canal mail, crear una clase Mailable/Notification con diseño institucional que detalle: tipo de boleto, nuevo precio vigente y fecha/hora de entrada en vigor (effective_at).
>    - Ejecutar el envío de correo de forma asíncrona mediante colas (ShouldQueue), asegurando que las operaciones HTTP de cambio de precio respondan de manera inmediata sin latencia externa de red SMTP.

## Nota (2026-11-02): canal de correo para avisos de precio

El canal de correo de los avisos de cambio de precio (`api-009` RN-10 y RN-20 a RN-28; ADR 0020, Propuesto) no cambia el esquema, según la propuesta del responsable de BD de esta misma sección. Esta nota no modifica aprobaciones, resoluciones ni estado de la DBR.

Puntos que el responsable de BD debe confirmar antes de implementar el canal:

- El correo usa `users.email` y las tablas `jobs` y `failed_jobs` de la migración base `0001_01_01_000002_create_jobs_table.php` (cola `database`); no crea tablas nuevas. No debe usarse el canal `database` de Laravel Notifications, porque crearía una tabla `notifications` que esta DBR no solicita.
- Las migraciones actuales de `apps/api` no contienen `users.email_verified_at` (solo existe `users.email`). La propuesta asume una columna de correo verificado; si se exige verificación del correo del personal, hará falta una DBR nueva.

## Nota (2026-11-02): avisos diferidos

Los avisos de cambio de precio (dashboard y correo; `api-009` CA-23 a CA-26, CA-32, CA-33 y CA-35 a CA-41) quedan diferidos por decisión de Jonathan del 2026-11-02. La tabla `staff_notifications`, incluida su columna `ticket_price_id`, queda creada pero sin uso en esta iteración. Esta nota no cambia el estado, las aprobaciones ni el contrato de la DBR.