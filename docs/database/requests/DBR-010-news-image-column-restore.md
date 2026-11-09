# DBR-010 · news-image-column-restore

- Estado: Aprobada (Lista para backend, 2026-11-07)
- Feature/spec origen: `apps/api/specs/008-event-news-images.md`, `apps/api/specs/011-public-news-read.md` y `apps/web/specs/009-dynamic-news-events.md` (consumidores); causa: restauración de `arca_pruebas` en la nueva instancia de Aiven (`docs/database/plan-migracion-instancia-aiven.md`)
- Solicitante: Jonathan (responsable funcional y backend)
- Responsable de BD: Víctor Adrián
- Responsable backend: Jonathan
- Fecha: 2026-11-07

## Problema y justificación

Tras la migración a la nueva instancia de Aiven, el equipo revisó (solo lectura) que la base `arca_pruebas` sirva todo lo desarrollado hasta ahora. El resultado: **la copia coincide con el esquema canónico (`docs/database/esquema-ingles.md` y DBR-001 a DBR-008) en todo salvo una columna de `news`**, además de datos de prueba que no se restauraron y una diferencia de collation. Sin la columna, las noticias no pueden guardar ni mostrar imagen, y la lectura pública de noticias (api-011) falla.

## Estado actual

Verificado el 2026-11-07 contra `arca_pruebas` en `mysql-1718e779-…aivencloud.com:17581` (MySQL 8.4.11):

- Las 9 migraciones Laravel figuran como ejecutadas (batch 1). Las 40 tablas esperadas existen, con 43 claves foráneas.
- Los 19 permisos del `RolesAndPermissionsSeeder` están presentes y los 5 roles tienen sus asignaciones.
- `news` tiene la columna **`imagen_noticia` VARCHAR(255) NULL** y **no tiene `image_path`**.
- `events` sí tiene `image_path`. El resto de tablas coincide con el esquema documentado (las columnas adicionales vienen de las DBR-002 a DBR-008).
- La migración `2026_10_14_000001_rename_tables_and_columns_to_english.php` (línea 475) renombra `ruta_imagen` a `image_path`. En la copia, `news` quedó con otro nombre de origen y ese renombre no se aplicó.

## Contrato solicitado

`news` debe ser idéntica a la sección 14 de `docs/database/esquema-ingles.md` más `deleted_at` (DBR-005):

- `image_path` VARCHAR(255) NULL (ruta gestionada `news/<uuid>.(jpg|png|webp)`, api-008).
- Sin la columna `imagen_noticia` una vez trasladado su contenido.
- Todo lo demás de `news` y `events` queda como está.

El código consumidor ya usa `image_path`: `PublicNewsResource`, `ResolveContentImageUrlAction`, las Actions de administración de noticias y el dashboard. No se requiere cambio de código.

## Elementos afectados

| Tipo | Nombre | Cambio |
|---|---|---|
| columna | `news.imagen_noticia` | Renombrar a `image_path` (conserva tipo VARCHAR(255) NULL y datos) |

## SQL de referencia (MySQL 8.0)

> **Referencia para revisión; no ejecutar directamente.** El cambio real se implementará como migración Laravel creada por el responsable de BD.

```sql
-- Verificación previa
SELECT COUNT(*) AS filas, SUM(imagen_noticia IS NOT NULL) AS con_imagen FROM news;

-- Propuesta ilustrativa
ALTER TABLE news RENAME COLUMN imagen_noticia TO image_path;
```

## Datos existentes y migración de datos

El renombre conserva los datos. En `arca_pruebas` `news` tiene hoy 0 filas, así que no hay backfill. Si en otro ambiente `imagen_noticia` trae rutas antiguas, no sigan el formato gestionado y api-011 las trata como `image_url = null` (api-008 CA-08). La migración debe ser idempotente: solo renombrar si existe `imagen_noticia` y no existe `image_path`.

## Privacidad, auditoría y retención

Contenido público institucional. La tabla mantiene SoftDeletes (DBR-005) y no es dato clínico ni financiero.

## Impacto, rendimiento y reversión

Tabla vacía o muy pequeña; bloqueo despreciable. Reversión en `down()`: renombrar `image_path` a `imagen_noticia`. Respaldo previo recomendado.

## Compatibilidad MySQL 8.0

`RENAME COLUMN` existe desde MySQL 8.0 y funciona en 8.4. En Laravel se usa `renameColumn`.

## Orden de despliegue

1. Aplicar este renombre en `arca_pruebas`.
2. Probar la funcionalidad de noticias y eventos del portal web (web-009, api-011).

## Otros hallazgos de la revisión (informativos, para que BD decida; no requieren cambio de código)

| # | Hallazgo | Detalle | Acción sugerida |
|---|---|---|---|
| H1 | Datos de prueba no restaurados | Tablas con 0 filas: `animals`, `animal_departures`, `clinical_*`, `lab_samples`, `animal_restraints`, `enclosure_qr_codes`, `news`, `tickets`, `staff_notifications`, `visitors` y tablas de progreso. Sí hay datos en `users` (6), `departments`, `roles`/`permissions`, `species` (5), `enclosures` (3), `events` (3), `ticket_prices` (2), `achievements` (6), `missions` (2). El plan de migración (sección 2.2) indicaba preservar todos. | Si existe respaldo de la instancia anterior, restaurar solo datos (sin DDL), o confirmar que se aceptan vacías. Con `news` vacía el portal muestra «sin noticias»; hay que capturar noticias de prueba |
| H2 | Collation mezclada | 16 tablas originales en `utf8mb4_0900_ai_ci` (la base por defecto) y 24 tablas creadas por migraciones en `utf8mb4_unicode_ci`. Puede causar «Illegal mix of collations» en joins directos entre ambos grupos. | Evaluar unificar; si se decide, requiere su propia DBR. No bloquea nada hoy |
| H3 | MySQL 8.4 vs 8.0.x | Aiven corre 8.4.11; Constitución y AGENTS.md indican 8.0.x. | Registrar la versión en el inventario inicial pendiente |
| H4 | Nombre en el plan de migración | `plan-migracion-instancia-aiven.md` menciona `visitor_point_ledger`; la tabla real es `visitor_point_entries`. | Corregir el documento |
| H5 | Seeder de permisos | Ya aplicado en la copia (sin permisos faltantes). | Repetir `db:seed --class=RolesAndPermissionsSeeder` en cada ambiente nuevo, nunca `db:seed` sin `--class` |
| H6 | DBR-009 `system_settings` | Sigue en borrador; no existe la tabla ni se necesita aún. | Ninguna hasta que la spec api-010 se apruebe |

## Pruebas y evidencia

- Pruebas de esquema/objeto ejecutadas por BD en base MySQL 8.0 aislada: pendiente.
- Resultado y evidencia (sin secretos ni datos sensibles): revisión de solo lectura del 2026-11-07 resumida arriba.
- Pruebas integradas del backend: `apps/api/src/tests/Feature/Catalog/PublicNewsTest.php` y las de api-008 se ejecutarán después del renombre. Los tests de feature escriben en `arca_pruebas` con `DatabaseTransactions`.

## Aprobaciones

| Rol | Nombre | Fecha | Resultado |
|---|---|---|---|
| Responsable de BD | Víctor Adrián | 2026-11-07 | Aprobada |
| Responsable backend | Jonathan | 2026-11-07 | Aprobada (solicitante) |

## Aplicación por ambiente

| Ambiente | Estado | Fecha | Evidencia |
|---|---|---|---|
| desarrollo/pruebas | pendiente | | |
| staging | pendiente | | |
| producción | pendiente | | |
