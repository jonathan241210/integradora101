# DBR-026 · Revisiones de cancelaciones por cajero y día

- Estado: Lista para backend (2026-11-21). Aprobada por Jonathan como responsable de BD por delegación; migración aplicada en `arca_pruebas` (lote 16). `down()` sin probar en MySQL aislado (rollback prohibido en `arca_pruebas`), igual que DBR-024/025.
- Feature/spec origen: `apps/api/specs/027-cancellation-review-signals.md` (Aprobada 2026-11-21). Consumidores: `apps/dashboard/specs/021-cancellation-review-signals.md` (registro de revisión) y `apps/api/specs/024-pending-review-counts.md` (clave `cancellation_days`, vía la Action de semáforo).
- Solicitante: Jonathan (decisión funcional de 2026-11-21, punto 5).
- Responsable de BD: Jonathan, por delegación de Víctor Adrián (la delegación se comunica en la sesión de 2026-11-21).
- Responsable backend: Jonathan.
- Fecha de redacción: 2026-11-21

## Problema y justificación

Quien revisa las cancelaciones necesita dejar constancia de que un cajero y un día ya se revisaron, qué se decidió y con qué nota, y poder cambiar la decisión sin perder la anterior. Esa información no tiene dónde guardarse hoy: el semáforo de `api-027` se calcula en cada consulta y no guarda estado.

Se propone una tabla de **historial**: una fila por decisión. La revisión vigente de un cajero y día es la fila más reciente. No hay borrado ni actualización de filas.

## Estado actual

Consulta de solo lectura sobre la base viva `arca_pruebas`, aportada por la sesión principal el 2026-11-21 (`php artisan db:table`, `information_schema`; sin `ALTER`, `INSERT`, `UPDATE`, `DELETE` ni migraciones):

- **No existe** la tabla `cancellation_reviews`. **No existe** `ticket_cancellation_reviews`.
- `tickets`: 37 filas, 4 canceladas, 1 con `cancellation_reason_code` (DBR-024 aplicada). Todas con `payment_method = cash`.
- Zona de sesión de la base: `+00:00`.
- `users.id` y `tickets.cashier_id` son de tipo `int` (FK a `users`).
- Comparación: la diferencia con DBR-024 (34 boletos y 3 canceladas el 2026-11-20) es crecimiento de datos de prueba, no una divergencia de esquema.
- Pendiente de confirmar en la migración: el tipo exacto (con o sin signo) de `users.id`, con `SHOW CREATE TABLE users`, y la existencia de `activity_log` (DBR-002). Ver «Verificaciones para BD».

## Contrato solicitado

Una tabla nueva `cancellation_reviews`:

| Columna | Tipo MySQL 8.0 | Nulo | Default | Uso |
|---|---|---|---|---|
| `id` | `BIGINT UNSIGNED` (autoincremental) | No | — | Clave primaria. El orden por `id` define la revisión vigente. |
| `cashier_id` | `INT` (igual que `users.id`) | No | — | Cajero revisado. FK a `users.id`. |
| `business_date` | `DATE` | No | — | Día de negocio revisado (zona `arca.timezone`). |
| `status` | `VARCHAR(30)` | No | — | `reviewed_ok` («Revisado: todo en orden») o `clarification_required` («Requiere aclaración»). |
| `note` | `VARCHAR(255)` | No | — | Nota del revisor. La API exige 15 a 255 caracteres tras recortar. |
| `reviewed_by` | `INT` (igual que `users.id`) | No | — | Quien registró la decisión. FK a `users.id`. |
| `created_at` | `TIMESTAMP` | Sí | NULL | Fecha de la decisión. |
| `updated_at` | `TIMESTAMP` | Sí | NULL | Presente por convención de Laravel; no cambia nunca porque no hay actualizaciones. |
| `deleted_at` | `TIMESTAMP` | Sí | NULL | SoftDeletes. Ninguna ruta lo usa. |

Decisiones de diseño de la tabla:

- **Historial, no fila vigente.** Cada decisión es una fila nueva. Recomendación de la solicitud confirmada: la vigente es la más reciente. Así no hay que actualizar ni reescribir una decisión anterior (Constitución V).
- **Sin `UNIQUE` sobre `(cashier_id, business_date)`.** Habría que actualizar la fila para cambiar la decisión, lo que contradice el historial.
- **`cashier_id` NOT NULL (decisión de 2026-11-21).** El grupo «Sin cajero registrado» de `api-022` no recibe semáforo ni revisión (`api-027` RN-10). Así se evita comparar `NULL` en las consultas de la revisión vigente.
- **`status` como `VARCHAR(30)` y no `ENUM`.** Los valores los valida la API y pueden crecer con una revisión de la spec; igual que `DBR-024`.
- **Sin clave foránea a `tickets`.** La revisión es por cajero y día, no por boleto.
- **`note` en `VARCHAR(255)`.** Igual que el comentario de `api-022` (`cancellation_reason`).
- **Sin `created_by`/`updated_by` adicionales.** `reviewed_by` cubre la autoría; `BaseModel` se decidirá en la revisión de la migración (si exige esas columnas, se añaden en esta misma DBR antes de migrar).

## Elementos afectados

| Tipo | Nombre | Cambio |
|---|---|---|
| tabla (nueva) | `cancellation_reviews` | Crear con las columnas de «Contrato solicitado» |
| índice | `idx_cancellation_reviews_cashier_date` (`cashier_id`, `business_date`, `id`) | Revisión vigente por cajero y día |
| índice | `idx_cancellation_reviews_business_date` (`business_date`) | Conteo de días pendientes de los últimos 7 días |
| FK | `fk_cancellation_reviews_cashier` (`cashier_id` → `users.id`) | ON DELETE RESTRICT |
| FK | `fk_cancellation_reviews_reviewer` (`reviewed_by` → `users.id`) | ON DELETE RESTRICT |
| tabla existente | `tickets`, `users`, `activity_log` | Sin cambio |

## SQL de referencia (MySQL 8.0)

> **Referencia para revisión; no ejecutar directamente.** El cambio real se implementará como migración Laravel creada por el responsable de BD. El tipo de `cashier_id` y `reviewed_by` se ajusta al tipo exacto de `users.id` (ver «Verificaciones para BD»).

```sql
-- propuesta ilustrativa
CREATE TABLE cancellation_reviews (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  cashier_id INT NOT NULL,
  business_date DATE NOT NULL,
  status VARCHAR(30) NOT NULL,
  note VARCHAR(255) NOT NULL,
  reviewed_by INT NOT NULL,
  created_at TIMESTAMP NULL DEFAULT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_cancellation_reviews_cashier_date (cashier_id, business_date, id),
  KEY idx_cancellation_reviews_business_date (business_date),
  CONSTRAINT fk_cancellation_reviews_cashier FOREIGN KEY (cashier_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_cancellation_reviews_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Datos existentes y migración de datos

No hay datos previos: la tabla es nueva. No hay backfill. Los días anteriores a esta feature no tienen revisión y, en el semáforo, aparecen con `review: null`.

## Privacidad, auditoría y retención

- **Clasificación:** dato de operación de personal. `note` puede contener texto del revisor; la API no debe usarlo para datos de visitantes. No es clínico.
- **Auditoría:** cada inserción queda en Activitylog como `cashier-day-reviewed` desde la Action, dentro de la misma transacción (`api-027` CA-21).
- **SoftDeletes:** la tabla usa `deleted_at` por norma del modelo (Constitución V). Ninguna ruta lo escribe.
- **Retención:** nada se borra físicamente. Las revisiones son historial.

## Impacto, rendimiento y reversión

- **Despliegue:** cambio expansivo (tabla nueva sin FK hacia tablas con datos). No bloquea `tickets`.
- **Volumen:** pocas filas: una por decisión, como mucho una por cajero y día revisado.
- **Consultas:** la revisión vigente y los pendientes usan los dos índices.
- **Reversión (`down()`):** elimina la tabla. **Solo es válida si la tabla está vacía**; con revisiones registradas, la reversión se prohíbe y se revierte el código, no los datos (Constitución V). Respaldo previo en cada ambiente.
- **Orden de despliegue:** DBR-026 → API (`api-027`) → dashboard (`dashboard-021`).

## Compatibilidad MySQL 8.0

- Tipos estándar; `DATE`, `VARCHAR`, `TIMESTAMP NULL`, índices y claves foráneas portables entre Aiven y MySQL local (ADR 0013).
- Sin funciones, vistas, triggers ni procedimientos.
- Migración idempotente: comprobar si la tabla y las claves existen antes de crearlas, como DBR-021 y DBR-024.

## Objeto almacenado (si aplica)

No aplica.

## Orden de despliegue

La migración debe existir antes de que la API nueva de `api-027` lea o escriba la tabla. Ningún cambio expansivo depende de otro despliegue. El dashboard no muestra el registro de revisión hasta que la API responda los endpoints.

## Pruebas y evidencia

- Pruebas de esquema en MySQL 8.0 aislado: **pendiente** (`down()`).
- Evidencia de `arca_pruebas`: ver «Evidencia de aplicación» (`db:table cancellation_reviews` con columnas, índices y FK).
- Pruebas integradas del backend: clases de api-027 en verde; suite completa en `api-027` T-26.

## Decisiones de 2026-11-21 (cierre de verificaciones)

- `users.id` es `int`; `cashier_id` y `reviewed_by` van con el mismo tipo `INT` (verificación 1 cerrada, consulta de solo lectura en `arca_pruebas` del 2026-11-21).
- `activity_log` existe en `arca_pruebas` (verificación 2 cerrada, misma consulta).
- `cashier_id` NOT NULL (verificación 5 cerrada; decisión de Jonathan: el grupo «Sin cajero registrado» no lleva semáforo ni revisión).
- Repetir el mismo estado crea una fila nueva; no hay restricción UNIQUE. Consistente con el historial.
- Estado final: **Lista para backend** (2026-11-21), con la migración aplicada en `arca_pruebas` (lote 16). Migración creada y aplicada por la sesión del asistente por instrucción expresa de Jonathan como responsable de BD delegado (excepción registrada a AGENTS.md, que reserva esta tarea al responsable de BD).
- `BaseModel` (verificación 4): no existe en el código; el modelo extiende `Model` con `SoftDeletes`, sin `created_by`/`updated_by` (`reviewed_by` cubre la autoría). Cerrada. Pendiente solo la prueba de `down()` (verificación 6).

## Verificaciones para BD

1. **Tipo de `users.id`:** confirmar con `SHOW CREATE TABLE users` (con o sin signo) antes de migrar, y ajustar `cashier_id` y `reviewed_by` al mismo tipo. **Cerrada**: `int`.
2. **`activity_log`:** confirmar que existe en `arca_pruebas` (DBR-002). **Cerrada**: existe.
3. **Tabla inexistente:** repetir `Schema::hasTable('cancellation_reviews')` = false justo antes de migrar. **Cerrada** (la migración lo comprueba).
4. **`BaseModel`:** decidir si la tabla exige `created_by`/`updated_by`. **Cerrada**: no existe `BaseModel`; sin esas columnas.
5. **Propuesta `cashier_id` NOT NULL:** **Cerrada**, confirmada por Jonathan.
6. **Ejecución de `down()`:** pendiente en un MySQL 8.0 aislado (rollback prohibido en `arca_pruebas` con datos).

## Aprobaciones

| Rol | Nombre | Fecha | Resultado |
|---|---|---|---|
| Responsable de BD | Jonathan (por delegación de Víctor Adrián) | 2026-11-21 | Aprobada |
| Responsable backend | Jonathan | 2026-11-21 | Aprobada |
| Solicitante / responsable funcional | Jonathan | 2026-11-21 | Aprobada |

## Aplicación por ambiente

| Ambiente | Estado | Fecha | Evidencia |
|---|---|---|---|
| desarrollo/pruebas (`arca_pruebas`) | Aplicada | 2026-11-21 | Lote 16; ver «Evidencia de aplicación» |
| staging | Pendiente | | |
| producción | Pendiente | | |

Nota de estado: la migración está implementada y aplicada en `arca_pruebas` con evidencia, por eso el estado es «Lista para backend». Falta solo la prueba de `down()` en MySQL aislado.

## Evidencia de aplicación (sesión principal, 2026-11-21, `arca_pruebas`)

- Migración: `apps/api/src/database/migrations/2026_11_21_000026_cancellation_reviews.php` (idempotente con `Schema::hasTable`; `down()` con `dropIfExists`).
- `php artisan migrate --force` → `2026_11_21_000026_cancellation_reviews` DONE, lote 16; segunda ejecución sin pendientes.
- `php artisan db:table cancellation_reviews`: 9 columnas (`id` bigint unsigned, `cashier_id` int, `business_date` date, `status` varchar(30), `note` varchar(255), `reviewed_by` int, `created_at`, `updated_at`, `deleted_at`), collation `utf8mb4_unicode_ci`; índices `idx_cancellation_reviews_cashier_date (cashier_id, business_date, id)`, `idx_cancellation_reviews_business_date`; FK `fk_cancellation_reviews_cashier` y `fk_cancellation_reviews_reviewer` → `users.id` ON DELETE RESTRICT.
- Tipo de `users.id`: `int` (information_schema); `activity_log` existe.
- No hay `BaseModel` en el código: los modelos de negocio extienden `Model` con `SoftDeletes` (como `Ticket`). `StaffNotification` no usa SoftDeletes (ADR 0021).
