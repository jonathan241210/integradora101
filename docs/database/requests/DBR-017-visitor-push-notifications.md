# DBR-017 · visitor-push-notifications

- Estado: Aprobada y Lista para backend (BD Victor Adrian y backend Aksel, 2026-11-14). Migración probada en MySQL 8.0 aislado.
- Feature/spec origen: `apps/api/specs/017-visitor-push-notifications.md` (Aprobada, Aksel, 2026-11-14). Consumidor: `apps/mobile/specs/013-visitor-push-notifications.md`. Plan: `apps/api/plan/017-visitor-push-notifications.md` (aprobado técnicamente, Victor Adrian, 2026-11-14).
- Solicitante: Aksel
- Responsable de BD: Victor Adrian
- Responsable backend: Aksel
- Fecha: 2026-11-14

Aprobación de BD (Victor Adrian) y de backend (Aksel), 2026-11-14. La migración ya estaba probada en MySQL 8.0 aislado. Con las dos firmas queda Aprobada y Lista para backend. La evidencia sigue siendo ese MySQL aislado: esta firma no aplica la migración en `arca_pruebas` ni en `arca_zoo`.

## Problema y justificación

El visitante con cuenta debe poder registrar el teléfono Android que recibe avisos push, guardar dos preferencias (noticias y eventos, estado de sus momentos) y evitar que la misma noticia, el mismo evento o la misma transición de un momento se encolen dos veces. Hoy no hay tablas para eso. `staff_notifications` es del personal y de cambios de precio, y no se reutiliza.

## Estado actual

No existen `visitor_notification_preferences`, `visitor_push_tokens` ni `push_dispatches`. La cuenta del visitante vive en `visitors` (`id` INT, DBR-003). El borrado de esa cuenta es físico (`api-004` RN-08).

## Contrato solicitado

- Una fila de preferencias por visitante. `news_and_events` nace en falso y `memory_status` nace en verdadero (`api-017` RN-03).
- Varios tokens por visitante, uno por teléfono. El token es único en toda la tabla. `platform` solo admite `android` en la API; la columna guarda ese valor.
- Una fila de dispatch por noticia, por evento o por transición de momento. La clave única es `(subject_type, subject_id, transition_key)`. No guarda `visitor_id`, nombre, correo, opinión ni motivo.
- Al borrar el visitante, sus preferencias y sus tokens desaparecen en cascada. Las filas de `push_dispatches` se conservan.
- Sin SoftDeletes, sin `created_by` y sin `updated_by`. No son datos clínicos ni financieros (`api-017` RN-12). La excepción queda aceptada en el plan de `api-017` y en el ADR 0029.

## Elementos afectados

| Tipo | Nombre | Cambio |
|---|---|---|
| tabla | `visitor_notification_preferences` | Nueva |
| columna | `visitor_id` | INT, NOT NULL, clave primaria y foránea a `visitors(id)` `ON DELETE CASCADE` |
| columna | `news_and_events` | TINYINT(1), NOT NULL, DEFAULT 0 |
| columna | `memory_status` | TINYINT(1), NOT NULL, DEFAULT 1 |
| columnas | `created_at`, `updated_at` | Timestamps, NULL |
| tabla | `visitor_push_tokens` | Nueva |
| columna | `id` | BIGINT UNSIGNED, clave primaria |
| columna | `visitor_id` | INT, NOT NULL, foránea a `visitors(id)` `ON DELETE CASCADE`, índice |
| columna | `token` | VARCHAR(255), NOT NULL, único |
| columna | `platform` | VARCHAR(16), NOT NULL |
| columnas | `created_at`, `updated_at` | Timestamps, NULL |
| tabla | `push_dispatches` | Nueva |
| columna | `id` | BIGINT UNSIGNED, clave primaria |
| columna | `subject_type` | VARCHAR(20), NOT NULL (`news`, `event` o `memory`) |
| columna | `subject_id` | BIGINT UNSIGNED, NOT NULL |
| columna | `transition_key` | VARCHAR(64), NOT NULL (`published` en noticia y evento; id de la revisión en un momento) |
| columna | `status` | VARCHAR(20), NOT NULL, DEFAULT `pending` (`pending`, `sent` o `failed`) |
| columnas | `created_at`, `updated_at` | Timestamps, NULL |
| índice | `uk_push_dispatches_subject` | Único sobre (`subject_type`, `subject_id`, `transition_key`) |

`push_dispatches` no tiene clave foránea: el sujeto puede ser una noticia, un evento o un momento.

## SQL de referencia (MySQL 8.0)

> **Referencia para revisión; no ejecutar directamente.** El cambio real se implementará como migración Laravel creada por el responsable de BD, después de que esta DBR esté aprobada.

```sql
CREATE TABLE visitor_notification_preferences (
  visitor_id INT NOT NULL,
  news_and_events TINYINT(1) NOT NULL DEFAULT 0,
  memory_status TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  PRIMARY KEY (visitor_id),
  CONSTRAINT fk_visitor_notification_preferences_visitor_id
    FOREIGN KEY (visitor_id) REFERENCES visitors (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE visitor_push_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  visitor_id INT NOT NULL,
  token VARCHAR(255) NOT NULL,
  platform VARCHAR(16) NOT NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_visitor_push_tokens_token (token),
  KEY idx_visitor_push_tokens_visitor_id (visitor_id),
  CONSTRAINT fk_visitor_push_tokens_visitor_id
    FOREIGN KEY (visitor_id) REFERENCES visitors (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE push_dispatches (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  subject_type VARCHAR(20) NOT NULL,
  subject_id BIGINT UNSIGNED NOT NULL,
  transition_key VARCHAR(64) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_push_dispatches_subject (subject_type, subject_id, transition_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Datos existentes y migración de datos

Las tres tablas son nuevas. No hay filas previas que migrar. No se insertan preferencias para las cuentas ya existentes: la API responde los valores iniciales cuando no hay fila (`api-017` CA-04).

## Privacidad, auditoría y retención

- `visitor_push_tokens.token` es un identificador del teléfono. No se escribe en Activitylog ni en logs de aplicación.
- Las preferencias son datos de la cuenta del visitante, no clínicos ni financieros.
- `push_dispatches` no guarda datos personales. Se conserva después del borrado de la cuenta para no repetir un aviso.
- SoftDeletes: no. El borrado de preferencias y tokens es físico, en cascada con la cuenta.
- Activitylog: no en estas tablas.

## Impacto, rendimiento y reversión

- Alta de un token y lectura de preferencias son puntuales, por `visitor_id` o por `token`.
- El aviso de una noticia recorre los tokens de quien tiene `news_and_events` en 1. El volumen previsto es el de las cuentas de la app del zoológico, no un envío masivo ajeno a esa tabla. El índice de `visitor_id` y el filtro de la preferencia bastan para este corte.
- `down()` de la migración futura elimina las tres tablas en orden: `push_dispatches`, `visitor_push_tokens`, `visitor_notification_preferences`. Antes de aplicar en un ambiente con datos, respaldo previo. Hoy no se aplica en ningún ambiente.

## Compatibilidad MySQL 8.0

Tipos y sintaxis estándar (INT, BIGINT UNSIGNED, VARCHAR, TINYINT, TIMESTAMP, índice único, clave foránea `ON DELETE CASCADE`). Sin extensiones propietarias. Portable entre Aiven y MySQL local (ADR 0013).

## Objeto almacenado (si aplica)

No aplica. No se crean funciones, procedimientos, vistas ni triggers. La regla de a quién avisar vive en Actions de Laravel.

## Orden de despliegue

1. Aprobación técnica del plan de `api-017` y de esta DBR (BD y backend, por separado).
2. El responsable de BD escribe la migración, la prueba en una base MySQL 8.0 aislada y documenta la evidencia.
3. Con `Lista para backend`, el backend implementa modelos y endpoints. Antes de esa migración el código consumidor no se activa.
4. `arca_zoo` no se usa para probar este cambio.

## Pruebas y evidencia

- Pruebas de esquema/objeto ejecutadas por BD en base MySQL 8.0 aislada: completadas (2026-11-14, Victor Adrian), sin errores.
- Resultado y evidencia (sin secretos ni datos sensibles): migraciones Laravel de DBR-017 creadas y ejecutadas en entorno MySQL 8.0 aislado sin errores (2026-11-14). Detalle de comandos/salida no adjuntado en este documento.
- Pruebas integradas del backend: pendiente. Empiezan cuando esta DBR esté en `Lista para backend`.

## Aprobaciones

| Rol | Nombre | Fecha | Resultado |
|---|---|---|---|
| Responsable de BD | Victor Adrian | 2026-11-14 | Aprobado |
| Responsable backend | Aksel | 2026-11-14 | Aprobado |

## Aplicación por ambiente

| Ambiente | Estado | Fecha | Evidencia |
|---|---|---|---|
| desarrollo/pruebas | aplicada/probada | 2026-11-14 | Migraci�n ejecutada en base MySQL 8.0 aislada sin errores (Victor Adrian) |
| staging | pendiente | | |
| producción | pendiente | | |
