# Registro de solicitudes de cambio de base de datos (DBR)

Una DBR documenta cualquier necesidad de crear, modificar o eliminar esquema, funciones o procedimientos de la base MySQL 8.0.x de ARCA-NB. Sin DBR aprobada no existe cambio de base de datos.

## Nomenclatura

`DBR-NNN-slug.md` — NNN es un entero secuencial de tres dígitos único en esta carpeta (nunca reutilizar ni renumerar); el slug es breve, en inglés y kebab-case. Ejemplo: `DBR-001-users-name-column.md`.

## Reglas

1. Crea la DBR desde `../templates/change-request.md` en estado `Borrador`.
2. La DBR acompaña a la spec de la feature; no la sustituye (spec, plan y tasks siguen siendo obligatorios).
3. El SQL propuesto es solo referencia: se marca “no ejecutar directamente”.
4. La DBR pasa a `Aprobada` solo con aprobaciones separadas de BD y backend.
5. El responsable de BD convierte el cambio aprobado en migración Laravel, la prueba en una base MySQL 8.0 aislada y documenta la evidencia.
6. Con `Lista para backend`, backend implementa el código consumidor; sin ese estado no se programa contra el cambio.
7. La aplicación se registra por ambiente en la tabla de la propia DBR.
8. El contenido se redacta en español; identificadores SQL y técnicos en inglés. Nunca incluir secretos ni credenciales.
9. Toda retroalimentación de un ADR, spec o DBR se firma en el propio documento en el momento de darla; no se acepta aprobar de palabra ni dejar la firma para después, porque se olvida. Quien solicita la retroalimentación pide la firma en ese mismo acto.

## Solicitudes

La conexión inicial y sus pruebas no requieren DBR mientras no alteren el esquema.

| DBR | Slug | Estado | Spec origen | Notas |
|---|---|---|---|---|
| [DBR-001](DBR-001-english-schema-normalization.md) | `english-schema-normalization` | Lista para backend | `apps/api/specs/003-staff-authentication.md` | Renombre en sitio de las 16 tablas al inglés |
| [DBR-002](DBR-002-staff-authentication.md) | `staff-authentication` | Lista para backend | `apps/api/specs/003-staff-authentication.md` | Columnas de autenticación en `users`/`departments` y tablas nuevas (Spatie, sessions, cache, activity_log); depende de DBR-001 |
| [DBR-003](DBR-003-visitor-accounts.md) | `visitor-accounts` | Lista para backend | `apps/api/specs/004-visitor-authentication.md` | Cuenta del visitante: columnas en `visitors`, `personal_access_tokens`, `visitor_refresh_tokens`, `visitor_verification_codes`; depende de DBR-001 |
| [DBR-004](DBR-004-visitor-progress.md) | `visitor-progress` | Lista para backend | `apps/api/specs/005-visitor-progress.md` | Colección por especie, `visitor_scans`, logros/misiones y libro mayor de puntos; depende de DBR-001 y DBR-003 |
| [DBR-005](DBR-005-news-events-soft-deletes.md) | `news-events-soft-deletes` | Aplicada (`arca_pruebas`, 2026-10-30) | `apps/api/specs/007-administration-management.md` | `deleted_at` en `news` y `events`; evaluar índice por `tickets.purchased_at`; depende de DBR-001 |
| [DBR-006](DBR-006-ticket-sales.md) | `ticket-sales` | Lista para backend (Aplicada en `arca_pruebas`, 2026-11-02) | `apps/api/specs/009-ticket-sales.md` | Tabla `ticket_prices`, columnas de venta y cancelación en `tickets`, tabla `staff_notifications`; aplicada con evidencia en pruebas |
| [DBR-007](DBR-007-news-events-hard-delete.md) | `news-events-hard-delete` | Descartada (2026-11-01) | `apps/api/specs/008-event-news-images.md` | Borrado físico de noticias y eventos descartado: se mantiene el borrado lógico con `deleted_at` (DBR-005, Constitución V). Se conserva como historial; no se aprueba ni aplica |
| [DBR-008](DBR-008-enclosure-gps-coordinates.md) | `enclosure-gps-coordinates` | Aprobada | `apps/mobile/specs/007-map-location.md` | `gps_lat`, `gps_lon`, `map_x`, `map_y` en `enclosures` para posicionamiento real en el mapa SVG; depende de DBR-001 |
| [DBR-009](DBR-009-system-settings.md) | `system-settings` | Borrador (sin aprobar) | `apps/api/specs/010-configurable-system-settings.md` (Borrador) | Tabla `system_settings` para el tope de boletos por venta editable sin despliegue; solo documentada, sin migración |
| [DBR-010](DBR-010-news-image-column-restore.md) | `news-image-column-restore` | Borrador (sin aprobar) | `apps/api/specs/011-public-news-read.md`, `apps/api/specs/008-event-news-images.md` | Restaura `news.image_path` (en la copia de Aiven quedó como `imagen_noticia`); incluye hallazgos de la revisión de la nueva instancia (datos no restaurados, collation, versión MySQL) |
| [DBR-011](DBR-011-nullable-columns-restore.md) | `nullable-columns-restore` | Borrador (sin aprobar) | Restauración de `arca_pruebas` en Aiven; relacionada con DBR-010 | Relaja a NULL `news.author_id`, `events.author_id`, `visitors.last_name`, `animals.tag_number`, `species.scientific_name`; causa de los 69 fallos de la suite |
| [DBR-012](DBR-012-visitor-memories.md) | `visitor-memories` | Lista para backend (Aplicada en `arca_pruebas`, 2026-11-11) | `apps/api/specs/010-visitor-memory-requests.md` (lectura pública en `apps/api/specs/012-public-memories-read.md`) | Tablas `visitor_memories` (peticiones de visitantes: imagen, opinión opcional, consentimiento, revisión, vigencia de publicación y SoftDeletes) y `visitor_memory_reviews` (historial de revisiones); `opinion` NULL y `rejected_image`/`rejected_content` booleanos; almacenamiento local en `apps/api/src/media/` (S3/nube es opción futura); el permiso `memories.review` se crea por seeder, sin migración; depende de DBR-001 y DBR-003 |
| [DBR-013](DBR-013-species-requests.md) | `species-requests` | Borrador (sin aprobar; sin migración) | `apps/api/specs/014-species-requests.md` (consumidores: `apps/pwa/specs/005-species-request-submission.md`, `apps/dashboard/specs/010-public-content-management.md`) | Cambio de modelo (2026-11-11): solicitudes de **publicación** de una especie existente. Tabla `species_publication_requests` (`species_id` obligatorio, SoftDeletes y auditoría) y columna `request_type` (`publish` o `update`) y columnas nuevas en `species` (`is_published`, `published_at`, `unpublished_at`, `image_path`, `published_fields`); SoftDeletes para «Eliminar la publicación»; decisiones pendientes sobre `species.origin` (2a), la forma de la solicitud (2c) y la Constitución V de `species`; el permiso `species.review` se crea por seeder, sin migración |

Historial: 2026-11-11, DBR-013 cambia de modelo (de «especie nueva creada al aceptar» a «publicación de una especie existente»). Ver el historial al inicio de `DBR-013-species-requests.md`. Esta entrada sigue en Borrador; no hay migración ni aprobación.
