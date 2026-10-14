# DBR-003 · visitor-accounts

- Estado: Borrador
- Feature/spec origen: `apps/api/specs/004-visitor-authentication.md`
- Solicitante: Aksel
- Responsable de BD: Victor Adrian
- Responsable backend: Por definir
- Fecha: 2026-10-13
- Depende de: DBR-001 (`english-schema-normalization`), que debe aplicarse primero

## Problema y justificación

La feature `api-004` (cuenta e inicio de sesión del visitante en la app móvil, ADR 0011) necesita que la tabla `visitors` (hoy `usuarios`, renombrada por DBR-001) soporte una cuenta real: correo verificado, avatar de catálogo, confirmación de mayoría de edad y aceptación del aviso de privacidad. Además, la sesión móvil usa tokens de acceso Sanctum (`personal_access_tokens`) y refresh tokens rotatorios propios (`visitor_refresh_tokens`), y la verificación de correo y la recuperación de contraseña usan códigos de un solo uso (`visitor_verification_codes`).

## Estado actual

Tras DBR-001 (pendiente de aplicación): `visitors` existe con columnas mínimas (`id`, `nickname`, `email`, `first_name`, `last_name`, `second_last_name`, `password`, `is_active`), sin verificación de correo, avatar, consentimientos ni timestamps. No existen `personal_access_tokens`, `visitor_refresh_tokens` ni `visitor_verification_codes`. La tabla está vacía.

## Contrato solicitado

### `visitors` — cambios de columnas

| Columna | Cambio | Tipo / restricciones |
|---|---|---|
| `nickname` | modificar | pasa a NOT NULL (la tabla está vacía; sin datos que migrar) |
| `email_verified_at` | agregar | timestamp NULL |
| `avatar_code` | agregar | varchar(50) NOT NULL (código del catálogo de avatares de la app) |
| `adult_confirmed_at` | agregar | timestamp NOT NULL (confirmación de mayoría de edad, 18+) |
| `privacy_notice_version` | agregar | varchar(20) NOT NULL (versión del aviso aceptado) |
| `privacy_accepted_at` | agregar | timestamp NOT NULL |
| `last_login_at` | agregar | timestamp NULL |
| `created_at`, `updated_at` | agregar | timestamp NULL |

**Nota explícita: `visitors` no lleva SoftDeletes.** El borrado de cuenta es físico e inmediato (confirmado con contraseña), porque no son datos clínicos ni financieros y el titular tiene derecho a la supresión de sus datos personales (LFPDPPP). Las tablas ligadas al visitante se borran en cascada.

### `personal_access_tokens` — tabla nueva

Tabla estándar de Laravel Sanctum (morph `tokenable`), usada **solo para los tokens de acceso de visitantes** (ability `visitor`, `expires_at` a 15 minutos). El personal usa sesión por cookie (DBR-002), no esta tabla.

### `visitor_refresh_tokens` — tabla nueva

| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | int / bigint PK | auto |
| `visitor_id` | FK `visitors.id` | ON DELETE CASCADE |
| `family_id` | char(36) | identifica la cadena de rotación |
| `token_hash` | char(64) | UNIQUE; hash SHA-256 del refresh opaco |
| `device_name` | varchar(100) | NULL permitido |
| `expires_at` | timestamp | 30 días por emisión |
| `revoked_at` | timestamp | NULL |
| `replaced_by_id` | FK self `visitor_refresh_tokens.id` | NULL |
| `created_at` | timestamp | |

Índices: `(visitor_id)` y `(family_id)`.

### `visitor_verification_codes` — tabla nueva

| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | int / bigint PK | auto |
| `visitor_id` | FK `visitors.id` | ON DELETE CASCADE |
| `purpose` | varchar(30) | `email_verification` \| `password_reset` |
| `code_hash` | varchar(255) | hash del código de 6 dígitos |
| `expires_at` | timestamp | validez de 15 minutos |
| `attempts` | tinyint | DEFAULT 0 (máximo 5) |
| `consumed_at` | timestamp | NULL (un solo uso) |
| `created_at` | timestamp | |

Índice: `(visitor_id, purpose)`.

### Claves existentes

La FK `visitor_collections.visitor_id` se mantiene en **ON DELETE CASCADE**: borrar la cuenta borra su progreso.

## Elementos afectados

| Tipo | Nombre | Cambio |
|---|---|---|
| columna | `visitors.nickname` | NOT NULL |
| columna | `visitors.email_verified_at`, `avatar_code`, `adult_confirmed_at`, `privacy_notice_version`, `privacy_accepted_at`, `last_login_at`, `created_at`, `updated_at` | agregar |
| tabla | `personal_access_tokens` | crear (estándar Sanctum) |
| tabla | `visitor_refresh_tokens` | crear |
| tabla | `visitor_verification_codes` | crear |

## SQL de referencia (MySQL 8.0)

> **Referencia para revisión; no ejecutar directamente.** El cambio real se implementará como migración Laravel creada por el responsable de BD.

```sql
-- propuesta ilustrativa
ALTER TABLE visitors
  MODIFY COLUMN nickname VARCHAR(255) NOT NULL,
  ADD COLUMN email_verified_at TIMESTAMP NULL,
  ADD COLUMN avatar_code VARCHAR(50) NOT NULL,
  ADD COLUMN adult_confirmed_at TIMESTAMP NOT NULL,
  ADD COLUMN privacy_notice_version VARCHAR(20) NOT NULL,
  ADD COLUMN privacy_accepted_at TIMESTAMP NOT NULL,
  ADD COLUMN last_login_at TIMESTAMP NULL,
  ADD COLUMN created_at TIMESTAMP NULL,
  ADD COLUMN updated_at TIMESTAMP NULL;

CREATE TABLE visitor_refresh_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  visitor_id INT NOT NULL,
  family_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  device_name VARCHAR(100) NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP NULL,
  replaced_by_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL,
  UNIQUE KEY uk_visitor_refresh_tokens_token_hash (token_hash),
  KEY idx_visitor_refresh_tokens_visitor_id (visitor_id),
  KEY idx_visitor_refresh_tokens_family_id (family_id),
  CONSTRAINT fk_visitor_refresh_tokens_visitor_id FOREIGN KEY (visitor_id) REFERENCES visitors (id) ON DELETE CASCADE,
  CONSTRAINT fk_visitor_refresh_tokens_replaced_by_id FOREIGN KEY (replaced_by_id) REFERENCES visitor_refresh_tokens (id)
);
```

## Datos existentes y migración de datos

La tabla `visitors` está vacía: no se requiere backfill. Las columnas NOT NULL nuevas no tendrán filas previas que incumplan la restricción.

## Privacidad, auditoría y retención

- `visitors` contiene **datos personales**: correo, nombre, apodo. El titular es un adulto (18+) que confirma su mayoría (`adult_confirmed_at`) y acepta el aviso de privacidad (`privacy_notice_version`, `privacy_accepted_at`).
- La contraseña se almacena con bcrypt; los refresh tokens solo como hash SHA-256; los códigos de verificación solo como hash.
- **Sin SoftDeletes ni `created_by`/`updated_by`:** el derecho de supresión (LFPDPPP) exige borrado físico inmediato y estos datos no son clínicos ni financieros. El borrado en cascada elimina tokens, códigos y progreso.
- La bitácora de accesos (Activitylog) nunca registra contraseñas, tokens ni códigos.

## Impacto, rendimiento y reversión

- ALTERs sobre tabla vacía y creación de tablas nuevas estándar: sin riesgo de bloqueo.
- **Reversión:** el `down()` elimina las columnas agregadas y las tablas nuevas, y regresa `nickname` a su nulabilidad anterior.
- Respaldo previo según la política de gobierno.

## Compatibilidad MySQL 8.0

Sin sintaxis fuera de MySQL 8.0.x ni extensiones propietarias.

## Objeto almacenado (si aplica)

No aplica.

## Orden de despliegue

- Se aplica **después** de DBR-001 (los nombres `visitors` y `visitor_collections` dependen del renombre).
- Se aplica en `arca_zoo` (desarrollo compartido) y se verifica en `arca_pruebas` (solo PHPUnit).
- El código consumidor (modelo `Visitor`, endpoints de `/api/v1/visitor`) se implementa solo cuando esta DBR y DBR-001 estén en `Lista para backend`.

## Pruebas y evidencia

- Pruebas de esquema/objeto ejecutadas por BD en base MySQL 8.0 aislada: pendiente
- Resultado y evidencia (sin secretos ni datos sensibles): pendiente
- Pruebas integradas del backend: pendiente

## Aprobaciones

| Rol | Nombre | Fecha | Resultado |
|---|---|---|---|
| Responsable de BD | Victor Adrian | | pendiente |
| Responsable backend | Por definir | | pendiente |

## Aplicación por ambiente

| Ambiente | Estado | Fecha | Evidencia |
|---|---|---|---|
| desarrollo/pruebas | pendiente | | |
| staging | pendiente | | |
| producción | pendiente | | |
