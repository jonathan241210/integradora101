# DBR-024 · Código de motivo de cancelación de boletos

- Estado: Aplicada en arca_pruebas (migración verificada con `migrate:status`). Staging y producción: pendiente de despliegue (ver `infra/README.md`).
- Solicitada: 2026-11-20
- Aprobada: 2026-11-20
- Feature/spec origen: `apps/api/specs/022-ticket-cancellation-report.md` (Aprobada). Revisión de `apps/api/specs/009-ticket-sales.md` (contrato de cancelación, nota de revisión). Consumidores: `apps/dashboard/specs/016-ticket-cancellation-report.md` (Aprobada) y `apps/dashboard/specs/005-ticket-sales.md` (selector de motivo en el diálogo de cancelar).
- Responsable de BD: Responsable de BD (rol)
- Responsable backend: Backend

## Problema y justificación

Cancelar un boleto guarda hoy un motivo libre en `tickets.cancellation_reason` (`varchar(255)`). Ese texto no se puede agrupar ni contar. La feature necesita un código de la lista cerrada de motivos (`capture_error`, `duplicate_charge`, `wrong_ticket_type`, `visitor_withdrew`, `other`; RN-02 de `api-022`) para:

1. Contar y desglosar las cancelaciones por motivo en el reporte de cancelaciones (`api-022` CA-14).
2. Distinguir las cancelaciones anteriores a la feature de las nuevas, sin inventar un código para ellas (`api-022` CA-08, RN-03).

`cancellation_reason` se conserva y guarda solo el comentario: obligatorio en `other`, opcional (NULL si no hay) en los demás códigos; la etiqueta la deriva la API del código (`api-022` RN-03, corregido). La columna ya admite NULL (verificado en solo lectura). Las filas históricas conservan su texto libre.

## Estado actual

Consultado sobre la base viva `arca_pruebas` (solo lectura, por la sesión principal; sin `ALTER`, `INSERT`, `UPDATE` ni migraciones):

- `tickets` tiene: `id`, `adult_quantity`, `child_quantity`, `status` `varchar(20)` con valor por defecto `completed`, `payment_method`, `adult_unit_price`, `child_unit_price`, `total_amount` `decimal(8,2)`, `purchased_at`, `cancelled_at` `datetime`, `cancelled_by` `int` (FK a `users`), `cancellation_reason` `varchar(255)`, `updated_by`, `deleted_at`, `qr_code` (único), `cashier_id` (FK a `users`).
- Índices de `tickets`: `idx_tickets_cashier_purchased (cashier_id, purchased_at)` e `idx_tickets_purchased_at (purchased_at)`.
- **No existe** ninguna columna de código de motivo de cancelación (`cancellation_reason_code` o equivalente).
- Número de filas en `arca_pruebas` (consulta en solo lectura): 34 boletos, 3 con `cancelled_at`. Esas 3 filas quedarían con el código en NULL («Sin clasificar (anterior)»).
- Comparación con migraciones y documentación: el esquema vivo coincide con lo que describe `docs/database/` para `tickets`. Pendiente de confirmar por BD el orden de la migración que añadirá la columna.

## Contrato solicitado

Una columna nueva en `tickets`:

| Columna | Tipo MySQL 8.0 | Nulo | Default | Uso |
|---|---|---|---|---|
| `cancellation_reason_code` | `VARCHAR(30)` | NULL | NULL | Código del catálogo de motivos de `api-022` RN-02. Lo escribe la Action de cancelación. `NULL` = cancelación anterior a la feature («Sin clasificar (anterior)»). |

Decisiones de diseño de la columna:

- **Tipo `VARCHAR(30)` y no `ENUM`.** El catálogo vive en la API y puede cambiar con una revisión de la spec; un `ENUM` obligaría a una migración por cada cambio de motivo. El valor más largo previsto (`wrong_ticket_type`, 18 caracteres) cabe con margen.
- **Sin clave foránea.** El catálogo no es una tabla; la validación es de la API (`api-022` CA-11).
- **Nulable sin valor por defecto.** Las filas existentes quedan con `NULL` sin backfill (Constitución V: no se reescriben datos financieros).
- **No cambia `status`, `cancelled_at`, `cancelled_by`, `cancellation_reason` ni `deleted_at`.**

## Índice

Evaluado y propuesto **sin índice nuevo** en esta DBR:

- El reporte filtra por periodo de `purchased_at` (cubierto por `idx_tickets_purchased_at`) y por estado `cancelled`. El conjunto cancelado de un periodo es pequeño (una fracción de las ventas).
- Agrupar por `cancellation_reason_code` sobre ese subconjunto no justifica un índice nuevo con el volumen actual.
- Alternativa si el volumen crece: índice compuesto `(status, purchased_at)`, o `(cancellation_reason_code)`. Se decide con datos reales de `arca_pruebas` y producción, no ahora.

Decisión de BD: no se añade índice en esta DBR.

## Elementos afectados

| Tipo | Nombre | Cambio |
|---|---|---|
| tabla (existente) | `tickets` | añadir `cancellation_reason_code` `VARCHAR(30)` NULL |
| índice | — | sin cambio (ver «Índice») |
| FK | — | sin cambio |
| Objeto almacenado | — | ninguno |

## Datos existentes y migración de datos

- Todas las filas existentes (incluidas las canceladas) quedan con `cancellation_reason_code = NULL`. Se presentan como «Sin clasificar (anterior)».
- **No hay backfill.** No se infiere un código desde el texto de `cancellation_reason`: sería una reclasificación de datos financieros no pedida.
- Las filas ya canceladas conservan su `cancellation_reason` textual.

## Impacto, rendimiento y reversión

- **Despliegue:** cambio expansivo (columna nula por defecto). Las versiones actuales de la API no leen la columna y siguen funcionando. Pero la API nueva de cancelación (`api-022`) escribe la columna: el orden de despliegue es DBR-024 → API → dashboard.
- **Cancelación (`api-009`, `CancelTicketAction`):** pasa a escribir el código. Hoy el cliente envía solo `reason`; hasta que `dashboard-005` envíe `reason_code`, la API nueva responde 422 (`api-022` CA-11). Riesgo de compatibilidad que se registra en la spec.
- **Reporte de boletos de `api-007`:** no lee la columna; sin impacto.
- **Reversión (`down()`):** retira la columna. Si ya hay cancelaciones con código, se pierde la clasificación (el texto de `cancellation_reason` se conserva). Requiere respaldo previo en cada ambiente.
- **Volumen:** bajo. Impacto de rendimiento despreciable.

## Compatibilidad MySQL 8.0

- `VARCHAR` nulable sin valor por defecto es estándar en MySQL 8.0 y portable entre Aiven y MySQL local (ADR 0013).
- Sin funciones, procedimientos, vistas ni triggers.
- La migración debe ser idempotente (comprobar si la columna existe antes de crearla), como DBR-021.

## Objeto almacenado (si aplica)

No aplica.

## Privacidad, auditoría y retención

- **Clasificación:** dato financiero de solo lectura (código de motivo de una cancelación). No es dato personal; el comentario de `other` (en `cancellation_reason`, ya existente) puede contener datos del visitante, y está en la pregunta 8 de `api-022`.
- **Auditoría:** la cancelación ya queda en Activitylog (`ticket-cancelled`); esta DBR añade el código al registro (`api-022` CA-23). Sin `created_by` ni `updated_by` nuevos.
- **Retención:** `tickets` nunca se borra físicamente. Sin purga.

## Plan de ejecución

### Fase 0: cierre documental
- [x] Revisión de BD y backend.
- [x] Consulta de solo lectura de las filas canceladas: 3 de 34.
- [x] Estado pasa a «Aprobada».

### Fase 1: migración de esquema (responsable de BD)
- [x] Migración creada: `apps/api/src/database/migrations/2026_11_20_000024_ticket_cancellation_reason_code.php` (idempotente, con `down()`).
- [x] Probada y aplicada en `arca_pruebas`. No hay MySQL 8.0 aislado en esta máquina (sin `mysqld`); la prueba aislada y la de `down()` quedan pendientes (ver evidencia).
- [x] Evidencia registrada.
- [x] Estado pasa a «Lista para backend».

### Fase 2: backend (tras «Lista para backend»)
- [ ] Integrar `cancellation_reason_code` en `CancelTicketAction` y en la validación de `CancelTicketRequest` (`api-022` CA-11 a CA-13).

## Pruebas y evidencia

Evidencia de `arca_pruebas` (migración creada fuera del flujo habitual; el responsable de BD la revisó y aprobó como excepción registrada):
- Base confirmada antes de migrar: `DB::connection()->getDatabaseName()` = `arca_pruebas`. Sin migraciones pendientes previas.
- `php artisan migrate --pretend --path=…000024…`: solo comprueba existencia de tabla/columna y añade la columna.
- `php artisan migrate --path=…000024… --force`: DONE (batch 14).
- `php artisan db:table tickets`: `cancellation_reason_code varchar(30)` nullable, junto a `cancellation_reason varchar(255)` nullable.
- Idempotencia: una segunda ejecución responde «Nothing to migrate»; el `up()` además comprueba la columna antes de crearla.
- Datos: 34 boletos, 0 con código, 3 cancelados (quedan en NULL, «Sin clasificar (anterior)»). Sin backfill.
- `migrate:rollback` está prohibido en este ambiente (protección de comandos destructivos del proyecto); no se forzó. **Pendiente:** probar `down()` en un MySQL 8.0 aislado.

## Aprobaciones

| Rol | Resultado | Evidencia |
|---|---|---|
| Responsable de BD | Aprobada (revisada por el responsable de BD) | Registro de esta DBR |
| Backend | Aprobada | Registro de esta DBR |
| Solicitante / responsable funcional | Aprobada | Registro de esta DBR |

## Aplicación por ambiente

| Ambiente | Estado | Evidencia |
|---|---|---|
| `arca_pruebas` | Aplicada en arca_pruebas | Migración `2026_11_20_000024_ticket_cancellation_reason_code` (batch 14), ver «Pruebas y evidencia» |
| staging | Pendiente de despliegue (ver checklist de `infra/README.md`) | |
| producción | Pendiente de despliegue (ver checklist de `infra/README.md`) | |

## Verificaciones para BD

1. **Columna inexistente en `arca_pruebas`:** repetido justo antes de migrar (`Schema::hasColumn` = false).
2. **Número de filas canceladas:** resuelto (3 de 34 en `arca_pruebas`).
3. **Índice:** confirmado, sin índice nuevo.
4. **Orden de despliegue:** la API nueva no se despliega antes de la migración; el dashboard no envía el código hasta que la API lo acepte.
5. **Ejecución de `down()`:** pendiente en un MySQL 8.0 aislado (rollback prohibido en `arca_pruebas`).
