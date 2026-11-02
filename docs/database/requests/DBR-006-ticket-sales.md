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

Pendiente. El responsable de BD debe documentar: migración creada, prueba de subir y bajar en MySQL 8.0 aislado, verificación de columnas e índices, y resultado de la suite de no regresión sobre `arca_pruebas`. Ningún ambiente se marca como aplicado hasta tener esa evidencia.

## Aprobaciones

| Rol | Nombre | Fecha | Resultado |
|---|---|---|---|
| Responsable de BD | Víctor Adrián | 2026-11-02 | Aprobada |
| Responsable backend | Jonathan | 2026-11-02 | Aprobada |

## Aplicación por ambiente

| Ambiente | Estado | Fecha | Evidencia |
|---|---|---|---|
| desarrollo/pruebas (`arca_pruebas`) | pendiente | | |
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